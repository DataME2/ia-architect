#!/usr/bin/env python3
"""Stage a club's Majestri exports for import (scope 132, C9, BR90, BR197).

  python3 scripts/import_history.py --in EXPORTS --out STAGED [--mask] [--current 2026]
  python3 scripts/import_history.py --load STAGED --club <club uuid>
  python3 scripts/import_history.py --self-test

Reads, for each season it finds in EXPORTS, the exports the club's admin
sends (named as Majestri names them; the newest of each wins):

  Registrations_<year>Season…csv        one row per family, players 1 to 5
  RegistrationInvoices_<year>Season…csv  one row per invoice line
  PlayersDebts_<year>Season…csv          one row per player per invoice
  TeamLists_<year>Season…csv             optional: who played in which team
  TeamDetails_<year>Season…csv           optional: each team's category

and writes to STAGED, for each season, `season-<year>.json` (the batch that
`import_history_season` takes, migration 0101), plus `report.md`: what was
read, linked and left unlinked. Staging sends nothing anywhere. Only the
columns the annex lists are read; notes, change history, addresses and
schools never leave the export.

`--load` sends each staged season, oldest first, to `import_history_season`
on the project named by SUPABASE_URL, with SUPABASE_SERVICE_ROLE_KEY: the
platform owner's key, because no club user may run an import. It stops at
the first season the database refuses.

`--mask` (BR198) makes a copy for a test project. Every name, email, FFA
number, invoice reference and typed note is replaced, a birth date keeps
only its year, and every mobile becomes 0491 570 006, a number ACMA
reserves for fiction. The key is random and never written down, so nobody
can reverse it, this script included. Equal stays equal: siblings share a
masked surname, and one child keeps one masked identity across seasons, so
linking and duplicates behave as they would on the real data. The output is
searched for every real value before it is written, and nothing is written
if one survives.

`--current` names the season whose mobiles and emergency contacts are
imported (default: the latest); older seasons' contacts are stale.
"""

from __future__ import annotations

import argparse
import collections
import csv
import hashlib
import hmac
import io
import json
import os
import re
import secrets
import sys
import tempfile
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation
from pathlib import Path

EXPORT = re.compile(r'^(Registrations|RegistrationInvoices|PlayersDebts|TeamLists|TeamDetails)_(\d{4})Season.*\.csv$', re.I)
KIND = {'registrations': 'registrations', 'registrationinvoices': 'invoices', 'playersdebts': 'debts',
        'teamlists': 'team_lists', 'teamdetails': 'team_details'}
REQUIRED = ('registrations', 'invoices', 'debts')
FICTIONAL_MOBILE = '0491570006'
# A fee line is kept word for word in a masked copy. Anything else on an
# invoice is a note someone typed, and notes name children.
FEE_LINE = re.compile(r'^(player fee|fq governing body|volunteer levy|sibling discount)\b', re.I)
WORD = re.compile(r"[\w'@.+-]+")


# ------------------------------------------------------------------ reading
def read_csv(path: Path) -> list[dict[str, str]]:
    raw = path.read_bytes()
    try:
        text = raw.decode('utf-8-sig')
    except UnicodeDecodeError:
        text = raw.decode('cp1252')
    return [{(k or '').strip(): (v or '') for k, v in r.items()} for r in csv.DictReader(io.StringIO(text, newline=''))]


def find_exports(folder: Path) -> dict[int, dict[str, Path]]:
    found: dict[int, dict[str, Path]] = {}
    for f in folder.iterdir():
        m = EXPORT.match(f.name)
        if m:
            kinds = found.setdefault(int(m.group(2)), {})
            kind = KIND[m.group(1).lower()]
            if kind not in kinds or f.stat().st_mtime > kinds[kind].stat().st_mtime:
                kinds[kind] = f
    return found


def clean(s: str | None) -> str:
    return ' '.join(''.join(ch for ch in (s or '') if ch.isprintable() or ch.isspace()).split())


def norm(*parts: str | None) -> str:
    return clean(' '.join(p or '' for p in parts)).casefold()


def parse_date(s: str | None) -> date | None:
    s = clean(s)
    for fmt in ('%d %B %Y', '%d %b %Y', '%d/%b/%Y', '%d/%m/%Y', '%Y-%m-%d'):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            pass
    return None


def cents(s: str | None) -> int:
    try:
        return int((Decimal(clean(s).replace('$', '').replace(',', '') or '0') * 100).to_integral_value())
    except InvalidOperation:
        return 0


def digits(s: str | None) -> str | None:
    return re.sub(r'\D', '', s or '') or None


def ffa(s: str | None) -> str | None:
    d = digits(s)
    return d if d and 4 <= len(d) <= 12 else None


def mobile(s: str | None) -> str | None:
    d = digits(s)
    if d and len(d) == 9 and d[0] == '4':  # a spreadsheet dropped the leading 0
        d = '0' + d
    return d if d and 8 <= len(d) <= 15 else None


def email(s: str | None) -> str | None:
    e = clean(s).lower()
    return e if re.fullmatch(r'[^@\s]+@[^@\s]+\.[^@\s]+', e) else None


def gender(s: str | None) -> str | None:
    return {'male': 'male', 'm': 'male', 'female': 'female', 'f': 'female'}.get(clean(s).lower())


def team_name(s: str | None) -> str:
    return clean(re.sub(r'\s*\(\d{4} Season.*\)\s*$', '', s or ''))


def fee_category(desc: str) -> str:
    """The pilot club's own reading of its invoice lines (its Power BI model)."""
    d = desc.lower()
    if 'volunteer levy' in d or 'reimbursement' in d:
        return 'levy'
    if 'governing body' in d:
        return 'governing'
    if 'discount' in d:
        return 'discount'
    if re.search(r'player fee|fq academy league|junior metro|senior|miniroos|nsfc|development|upgrade|'
                 r'promotion|additional fee|waitlist|metro|masters', d):
        return 'club'
    return 'adjustment'


# ------------------------------------------------------------------ staging
def stage_season(year: int, files: dict[str, Path], current: bool) -> tuple[dict, dict]:
    people: dict[str, dict] = {}
    regs: dict[str, dict] = {}
    by_name: dict[str, set[str]] = {}   # a player's name -> their keys
    payer_by_name: dict[str, str] = {}  # the primary member's name -> who pays
    contacts: list[dict] = []
    n = collections.Counter()

    def put(key: str, **attrs) -> str:
        p = people.setdefault(key, {'key': key})
        for k, v in attrs.items():
            if v not in (None, '') and p.get(k) in (None, ''):
                p[k] = v
        return key

    rows = read_csv(files['registrations'])
    for r in rows:
        pg, pf = clean(r.get('PrimaryMemberFirstName')), clean(r.get('PrimaryMemberSurname'))
        pe = email(r.get('PrimaryMemberEmailAddress'))
        pm = mobile(r.get('PrimaryMemberMobileNumber')) if current else None
        day = parse_date(r.get('RegistrationDate'))
        t = (digits(r.get('RegistrationTime')) or '0').zfill(6)[-6:]
        # ponytail: Brisbane time, as the pilot club keeps it; a club in a
        # state with daylight saving needs its own offset here.
        at = f'{day.isoformat()}T{t[:2]}:{t[2:4]}:{t[4:]}+10:00' if day else None
        guardian = None
        for i in range(1, 6):
            first, family = clean(r.get(f'Player{i}FirstName')), clean(r.get(f'Player{i}Surname'))
            dob = parse_date(r.get(f'Player{i}DateofBirth'))
            if not first or not family:
                continue
            if dob is None:
                n['playersWithoutBirthDate'] += 1
                continue
            is_member = norm(first, family) == norm(pg, pf)
            key = put(f'p|{norm(first, family)}|{dob}', kind='player',
                      given=clean(f"{first} {r.get(f'Player{i}MiddleName', '')}"), family=family,
                      dob=dob.isoformat(), gender=gender(r.get(f'Player{i}Gender')),
                      ffa=ffa(r.get(f'Player{i}FFANumber')),
                      email=pe if is_member else None, mobile=pm if is_member else None)
            if year - dob.year < 18 and not is_member and pg and pf:
                guardian = guardian or put(f'g|{pe}|{norm(pg, pf)}', kind='guardian', given=pg, family=pf,
                                           email=pe, mobile=pm)
                people[key]['guardian'] = guardian
            for name in {norm(first, family), norm(first, r.get(f'Player{i}MiddleName'), family)}:
                by_name.setdefault(name, set()).add(key)
            if is_member:
                payer_by_name.setdefault(norm(pg, pf), key)
            if key in regs:
                n['repeatedInSeason'] += 1
                continue
            regs[key] = {'person': key, 'registeredAt': at,
                         'playingGroup': clean(r.get(f'Player{i}PreferredPlayingGroup')) or None}
            en = clean(f"{r.get('EmergencyContactFirstName', '')} {r.get('EmergencyContactSurname', '')}")
            em = mobile(r.get('EmergencyContactMobileNumber'))
            if current and en and em:
                contacts.append({'person': key, 'name': en, 'mobile': em,
                                 'email': email(r.get('EmergencyContactEmailAddress'))})
        if guardian:
            payer_by_name.setdefault(norm(pg, pf), guardian)

    def player(name: str, what: str) -> str | None:
        words = norm(name).split()
        keys = by_name.get(' '.join(words)) or (by_name.get(f'{words[0]} {words[-1]}') if words else None) or set()
        if len(keys) == 1:
            return next(iter(keys))
        n[f'{what}{"Ambiguous" if keys else "Unlinked"}'] += 1
        return None

    def payer(name: str) -> str | None:
        if norm(name) in payer_by_name:
            return payer_by_name[norm(name)]
        keys = by_name.get(norm(name), set())  # an invoice in the child's name
        return people[next(iter(keys))].get('guardian', next(iter(keys))) if len(keys) == 1 else None

    # Invoices: a header row, then its lines. Majestri leaves the header
    # columns empty on every line after the first.
    invoices: dict[str, dict] = {}
    head: dict | None = None
    for r in read_csv(files['invoices']):
        ref = clean(r.get('Reference'))
        if ref:
            day = parse_date(r.get('Date'))
            head = None if day is None else invoices.setdefault(ref, {
                'reference': ref, 'invoicedOn': day.isoformat(),
                'payer': payer(f"{r.get('First Name', '')} {r.get('Surname', '')}"),
                'invoiceCents': cents(r.get('Invoice Amount')), 'paidCents': cents(r.get('Paid Amount')),
                'outstandingCents': cents(r.get('Outstanding Amount')), 'creditCents': 0,
                'payments': 0, 'lastPaidOn': None, 'lines': []})
        elif any(clean(r.get(c)) for c in ('Invoice Amount', 'Paid Amount', 'Outstanding Amount')):
            head = None  # a ghost row: amounts with no invoice above them
        if head is None or not clean(r.get('Line Description')):
            continue
        parts = [p for p in re.split(r'[\r\n]+', r['Line Description']) if clean(p)]
        desc = clean(parts[0])
        head['lines'].append({'registration': player(parts[-1], 'invoiceLines') if len(parts) > 1 else None,
                              'category': fee_category(desc), 'description': desc,
                              'cents': cents(r.get('Line Amount'))})

    teams: dict[str, dict] = {}
    members: set[tuple[str, str]] = set()

    def team(name: str | None, category: str | None = None) -> str | None:
        tn = team_name(name)
        if not tn:
            return None
        m = re.match(r'^U(\d{1,2})\b', tn, re.I)
        t = teams.setdefault(tn, {'name': tn, 'ageGroup': f'U{m.group(1)}' if m else None, 'category': None})
        t['category'] = t['category'] or clean(category) or None
        return tn

    for r in read_csv(files['debts']):
        inv = invoices.get(clean(r.get('InvoiceRef')))
        if inv is not None and not inv['payments']:
            inv['creditCents'] = cents(r.get('TotalCreditAmount'))
            inv['payments'] = int(digits(r.get('NumberOfPayments')) or 0)
            last = parse_date(r.get('LastPaymentDate'))
            inv['lastPaidOn'] = last.isoformat() if last else None
        if 'team_lists' not in files:
            t = team(r.get('TeamName'))
            p = t and player(f"{r.get('PlayerFirstName', '')} {r.get('PlayerSurname', '')}", 'teamMembers')
            if p:
                members.add((t, p))
    for r in read_csv(files['team_lists']) if 'team_lists' in files else ():
        if clean(r.get('Role')).lower() != 'player':
            continue  # an official needs a clearance the export cannot show (BR10)
        t = team(r.get('TeamName'), r.get('Category'))
        key = f"p|{norm(r.get('FirstName'), r.get('Surname'))}|{parse_date(r.get('DateOfBirth'))}"
        p = t and (key if key in regs else player(f"{r.get('FirstName', '')} {r.get('Surname', '')}", 'teamMembers'))
        if p:
            members.add((t, p))
    for r in read_csv(files['team_details']) if 'team_details' in files else ():
        team(r.get('TeamName'), r.get('Category'))

    # The keys above are built from names. Replace them before anything is
    # written, so the batch carries no name in its structure.
    ids = {k: f'{p["kind"][0]}{i}' for i, (k, p) in enumerate(people.items(), 1)}
    for p in people.values():
        p['key'] = ids[p['key']]
        if 'guardian' in p:
            p['guardian'] = ids[p['guardian']]
    for x in [*regs.values(), *contacts]:
        x['person'] = ids[x['person']]
    for inv in invoices.values():
        inv['payer'] = ids.get(inv['payer'])
        for ln in inv['lines']:
            ln['registration'] = ids.get(ln['registration'])

    report = {
        'files': '; '.join(p.name for _, p in sorted(files.items())),
        'registrationRows': len(rows),
        'players': sum(p['kind'] == 'player' for p in people.values()),
        'guardians': sum(p['kind'] == 'guardian' for p in people.values()),
        'playersWithFfaNumber': sum(bool(p.get('ffa')) for p in people.values()),
        'registrations': len(regs),
        'emergencyContacts': len(contacts),
        'invoices': len(invoices),
        'invoicesWithoutPayer': sum(i['payer'] is None for i in invoices.values()),
        'invoiceLines': sum(len(i['lines']) for i in invoices.values()),
        'teams': len(teams),
        'teamMembers': len(members),
        **n,
    }
    batch = {
        'season': {'name': str(year), 'startsOn': f'{year}-01-01', 'endsOn': f'{year}-12-31'},
        'source': report['files'],
        'masked': False,
        'rowsRead': len(rows),
        'people': list(people.values()),
        'registrations': list(regs.values()),
        'emergencyContacts': contacts,
        'teams': list(teams.values()),
        'teamMembers': [{'team': t, 'person': ids[p]} for t, p in sorted(members)],
        'invoices': list(invoices.values()),
    }
    return batch, report


# ------------------------------------------------------------------ masking
SYLLABLES = ('ba be bi bo da de di do fa fe fi ka ke ki ko la le li lo ma me mi mo na ne ni no '
             'pa pe pi ra re ri ro sa se si so ta te ti to va ve vi wa we za zo').split()


class Masker:
    def __init__(self, real: set[str]):
        self.key = secrets.token_bytes(32)  # never written anywhere
        self.real = real
        self.maps: dict[str, dict[str, str]] = {}
        self.used: set[str] = set()

    def _h(self, *parts: str) -> int:
        return int.from_bytes(hmac.new(self.key, '|'.join(parts).encode(), hashlib.sha256).digest()[:8], 'big')

    def _one(self, space: str, real: str, make) -> str:
        """One fake per real value, never shared and never itself real."""
        m = self.maps.setdefault(space, {})
        if real not in m:
            h = self._h(space, real)
            while (fake := make(h)) in self.used or fake.casefold() in self.real:
                h += 1
            self.used.add(fake)
            m[real] = fake
        return m[real]

    def _word(self, h: int, syllables: int) -> str:
        return ''.join(SYLLABLES[(h >> (6 * i)) % len(SYLLABLES)] for i in range(syllables)).capitalize()

    def given(self, s: str) -> str:
        return ' '.join(self._one('given', w.casefold(), lambda h: self._word(h, 2)) for w in s.split())

    def family(self, s: str) -> str:
        return self._one('family', norm(s), lambda h: self._word(h, 3))

    def full(self, s: str) -> str:
        first, _, rest = clean(s).partition(' ')
        return f'{self.given(first)} {self.family(rest or first)}'

    def email(self, s: str | None) -> str | None:
        return s and self._one('email', s, lambda h: f'family.{h % 16**8:08x}@masked.test')

    def ffa(self, s: str | None) -> str | None:
        return s and self._one('ffa', s, lambda h: f'9{h % 10**8:08d}')

    def ref(self, s: str) -> str:
        return self._one('ref', s, lambda h: f'MASK{h % 10**7:07d}')

    def dob(self, s: str | None) -> str | None:
        """One shuffle of the year's days for everyone born that year, so
        equal birth dates stay equal and no age group changes."""
        if not s:
            return s
        d = date.fromisoformat(s)
        start = date(d.year, 1, 1)
        order = sorted(range((date(d.year + 1, 1, 1) - start).days), key=lambda i: self._h('dob', str(d.year), str(i)))
        return (start + timedelta(days=order[(d - start).days])).isoformat()

    def batch(self, b: dict) -> dict:
        for p in b['people']:
            p.update(given=self.given(p['given']), family=self.family(p['family']), dob=self.dob(p.get('dob')),
                     email=self.email(p.get('email')), ffa=self.ffa(p.get('ffa')),
                     mobile=FICTIONAL_MOBILE if p.get('mobile') else None)
        for c in b['emergencyContacts']:
            c.update(name=self.full(c['name']), mobile=FICTIONAL_MOBILE, email=self.email(c.get('email')))
        for inv in b['invoices']:
            inv['reference'] = self.ref(inv['reference'])
            for ln in inv['lines']:
                if not FEE_LINE.match(ln['description']):
                    ln['description'] = 'Adjustment (note removed)'
        b['masked'] = True
        return b


def personal_values(batches: list[dict]) -> set[str]:
    """Every real name word, email, number and reference, before masking."""
    out: set[str] = set()
    for b in batches:
        for p in b['people']:
            out.update(w.casefold() for w in f"{p['given']} {p['family']}".split() if len(w) > 2)
            out.update(v for v in (p.get('email'), p.get('ffa'), p.get('mobile')) if v)
        for c in b['emergencyContacts']:
            out.update(w.casefold() for w in c['name'].split() if len(w) > 2)
            out.update(v for v in (c.get('email'), c.get('mobile')) if v)
        out.update(inv['reference'].casefold() for inv in b['invoices'])
    return out


def leaks(batches: list[dict], real: set[str], vocabulary: set[str]) -> list[str]:
    """Real values still present in masked output. A word that is also the
    club's own vocabulary (in a team name or a fee line) is not a leak."""
    words = set(WORD.findall(json.dumps(batches, ensure_ascii=False).casefold()))
    return sorted(v for v in real if v in words and v not in vocabulary)


# --------------------------------------------------------------------- main
def run(src: Path, out: Path, mask: bool, current: int | None) -> int:
    seasons = find_exports(src)
    missing = {y: [k for k in REQUIRED if k not in f] for y, f in seasons.items()}
    if not seasons or any(missing.values()):
        print(f'Need {", ".join(REQUIRED)} for every season; found {sorted(seasons)}, missing {missing}', file=sys.stderr)
        return 1
    current = current or max(seasons)
    staged = [stage_season(y, seasons[y], y == current) for y in sorted(seasons)]
    batches = [b for b, _ in staged]
    if mask:
        real = personal_values(batches)
        vocabulary = set(WORD.findall(json.dumps(
            [[t['name'], t['category']] for b in batches for t in b['teams']]
            + [r['playingGroup'] for b in batches for r in b['registrations']]
            + [ln['description'] for b in batches for i in b['invoices'] for ln in i['lines']
               if FEE_LINE.match(ln['description'])], ensure_ascii=False).casefold()))
        masker = Masker(real)
        batches = [masker.batch(b) for b in batches]
        found = leaks(batches, real, vocabulary)
        if found:
            print(f'Refusing to write: {len(found)} real values survived masking.', file=sys.stderr)
            return 2
    out.mkdir(parents=True, exist_ok=True)
    lines = ['# Staged history', '', f'Masked: **{"yes" if mask else "no"}**, contacts from: {current}', '']
    for b, (_, rep) in zip(batches, staged):
        y = b['season']['name']
        (out / f'season-{y}.json').write_text(json.dumps(b, ensure_ascii=False), encoding='utf-8')
        lines += [f'## {y}', ''] + [f'- {k}: {v}' for k, v in rep.items()] + ['']
    (out / 'report.md').write_text('\n'.join(lines), encoding='utf-8')
    print('\n'.join(lines))
    return 0


def load(staged: Path, club: str) -> int:
    url, key = os.environ.get('SUPABASE_URL'), os.environ.get('SUPABASE_SERVICE_ROLE_KEY')
    if not url or not key:
        print('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the project to load into.', file=sys.stderr)
        return 1
    for f in sorted(staged.glob('season-*.json')):
        body = json.dumps({'p_club_id': club, 'p_batch': json.loads(f.read_text(encoding='utf-8'))}).encode()
        req = urllib.request.Request(f'{url.rstrip("/")}/rest/v1/rpc/import_history_season', data=body, method='POST',
                                     headers={'apikey': key, 'Authorization': f'Bearer {key}',
                                              'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=300) as res:
                print(f.name, res.read().decode())
        except urllib.error.HTTPError as e:
            print(f.name, 'refused:', e.read().decode()[:500], file=sys.stderr)
            return 2
    return 0


def self_test() -> int:
    """Two seasons of one invented family, staged and masked."""
    head = ('RegistrationDate,RegistrationTime,PrimaryMemberSurname,PrimaryMemberFirstName,PrimaryMemberMobileNumber,'
            'PrimaryMemberEmailAddress,EmergencyContactSurname,EmergencyContactFirstName,EmergencyContactMobileNumber,'
            'EmergencyContactEmailAddress,'
            + ','.join(f'Player{i}{c}' for i in (1, 2) for c in ('Surname', 'FirstName', 'MiddleName', 'Gender',
                                                                    'DateofBirth', 'FFANumber', 'PreferredPlayingGroup')))
    parent = 'Quokkason,Dingorella,0412 345 678,dingo@family.example,Emuford,Possumia,0498 765 432,'
    girl = 'Quokkason,Wombatina,,Female,3 March 2016,12345678,MiniRoos - Girls - Under 10'
    boy = 'Quokkason,Bilbyrino,Thorn,Male,9 Sep 2018,,MiniRoos - Mixed - Under 8'
    none = ',' * 6
    inv = 'Surname,First Name,Reference,Date,Invoice Amount,Paid Amount,Outstanding Amount,Line Description,Line Amount'
    debts = 'PlayerSurname,PlayerFirstName,TeamName,InvoiceRef,TotalCreditAmount,NumberOfPayments,LastPaymentDate'
    files = {
        2025: {'Registrations': [head, f'1 February 2025,93015,{parent},{girl},{none}',
                                 '2 February 2025,101500,Platypuski,Echidnara,0411 111 111,echidnara@solo.example,'
                                 f'Platypuski,Koalaine,0422 222 222,,Platypuski,Echidnara,,Female,1 Jan 1990,87654321,'
                                 f'Senior Women Metro,{none}'],
               'RegistrationInvoices': [inv, 'Quokkason,Dingorella,NSFC0000001,01/Feb/2025,630.00,600.00,30.00,'
                                             '"Player Fee - Community Junior / MiniRoos / U8+\rWombatina Quokkason",530.00',
                                        ',,,,,,,"Wombatina moved to the Academy, owes $30\rWombatina Quokkason",30.00'],
               'PlayersDebts': [debts, 'Quokkason,Wombatina,U10 Girls (2025 Season),NSFC0000001,0.00,2,3 Mar 2025']},
        2026: {'Registrations': [head, f'5 January 2026,80000,{parent},{girl},{boy}'],
               'RegistrationInvoices': [inv, 'Quokkason,Dingorella,NSFC0000002,05/Jan/2026,100.00,100.00,0.00,'
                                             '"Sibling Discount - 2nd Child\rBilbyrino Quokkason",-50.00'],
               'PlayersDebts': [debts, 'Quokkason,Bilbyrino,U8 Blue (2026 Season),NSFC0000002,0.00,1,6 Jan 2026']},
    }
    with tempfile.TemporaryDirectory() as tmp:
        src, out = Path(tmp, 'in'), Path(tmp, 'out')
        src.mkdir()
        for y, kinds in files.items():
            for k, rows in kinds.items():
                Path(src, f'{k}_{y}Season-Test.csv').write_text('\n'.join(rows) + '\n', encoding='cp1252')
        assert run(src, out, mask=True, current=None) == 0
        text = ''.join(Path(out, f'season-{y}.json').read_text(encoding='utf-8') for y in (2025, 2026))
        for real in ('quokkason', 'wombatina', 'dingorella', 'bilbyrino', 'thorn', 'platypuski', 'emuford',
                     'dingo@', '12345678', '0412', 'nsfc', 'owes'):
            assert real not in text.casefold(), f'{real} survived masking'
        b25, b26 = (json.loads(Path(out, f'season-{y}.json').read_text(encoding='utf-8')) for y in (2025, 2026))
        girl25 = next(p for p in b25['people'] if p.get('gender') == 'female' and p['dob'].startswith('2016'))
        adult25 = next(p for p in b25['people'] if p['kind'] == 'player' and p['dob'].startswith('1990'))
        kids26 = [p for p in b26['people'] if p['kind'] == 'player']
        girl26 = next(p for p in kids26 if p['gender'] == 'female')
        assert (girl26['given'], girl26['family'], girl26['dob'], girl26['ffa']) == \
               (girl25['given'], girl25['family'], girl25['dob'], girl25['ffa']), 'one child, one masked identity'
        assert len({p['family'] for p in kids26}) == 1, 'siblings share a masked surname'
        assert 'guardian' not in adult25 and adult25['email'].endswith('@masked.test'), 'an adult is their own contact'
        assert all('guardian' in p for p in kids26), 'a minor has a guardian'
        assert b25['emergencyContacts'] == [] and len(b26['emergencyContacts']) == 2, 'contacts come from the current season'
        assert {p.get('mobile') for b in (b25, b26) for p in b['people']} <= {None, FICTIONAL_MOBILE}
        lines25 = b25['invoices'][0]['lines']
        assert [ln['category'] for ln in lines25] == ['club', 'adjustment']
        assert lines25[0]['description'].startswith('Player Fee') and lines25[1]['description'] == 'Adjustment (note removed)'
        assert all(ln['registration'] == girl25['key'] for ln in lines25)
        assert b25['invoices'][0]['payer'] == girl25['guardian'] and b25['invoices'][0]['payments'] == 2
        assert b26['invoices'][0]['lines'][0]['category'] == 'discount'
        assert b25['teams'] == [{'name': 'U10 Girls', 'ageGroup': 'U10', 'category': None}]
        assert b25['teamMembers'] == [{'team': 'U10 Girls', 'person': girl25['key']}]
    print('import_history self-test OK')
    return 0


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    ap.add_argument('--in', dest='src', type=Path)
    ap.add_argument('--out', type=Path)
    ap.add_argument('--mask', action='store_true')
    ap.add_argument('--current', type=int)
    ap.add_argument('--load', type=Path)
    ap.add_argument('--club')
    ap.add_argument('--self-test', action='store_true')
    a = ap.parse_args()
    if a.self_test:
        sys.exit(self_test())
    if a.load:
        if not a.club:
            ap.error('--load needs --club')
        sys.exit(load(a.load, a.club))
    if not a.src or not a.out:
        ap.error('--in and --out are required')
    sys.exit(run(a.src, a.out, a.mask, a.current))
