/**
 * Serialising a pack to CSV.
 *
 * The column order is the one thing here that decides whether the pack is
 * actually used: whoever keys it into Squadi reads down a column rather than
 * hunting, so the order should match the destination screen. It is not known
 * yet (question #44), so this is the club's own order until the federation
 * says otherwise — and it is one constant to change when they do.
 */
import type { PackRow, SubmissionPack } from './types.ts';

export const PACK_COLUMNS = [
  'legal_family_name',
  'legal_given_names',
  'date_of_birth',
  'email',
  'guardian_name',
  'guardian_email',
  'photo_path',
] as const;

/**
 * RFC 4180 quoting.
 *
 * Names containing commas, apostrophes and quotes are ordinary in a
 * multicultural club, and a naive join corrupts exactly those rows — the
 * families whose registrations already go wrong most often.
 */
function csvField(value: string | null): string {
  if (value === null) return '';
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

function csvRow(row: PackRow): string {
  return [
    row.legalFamilyName,
    row.legalGivenNames,
    row.dateOfBirth,
    row.email,
    row.guardianLegalName,
    row.guardianEmail,
    row.photoPath,
  ]
    .map(csvField)
    .join(',');
}

/**
 * The pack as CSV text.
 *
 * CRLF line endings and a UTF-8 BOM, because the most likely destination for
 * this file is a spreadsheet on a Windows machine, and without the BOM a
 * name like "Nguyễn" arrives mangled — which reintroduces by hand the exact
 * mismatch BR55 exists to remove.
 */
export function packToCsv(pack: SubmissionPack): string {
  const lines = [PACK_COLUMNS.join(','), ...pack.rows.map(csvRow)];
  return `﻿${lines.join('\r\n')}\r\n`;
}

/**
 * The exclusion list as CSV — the registrar's work list.
 *
 * Shipped alongside the pack rather than displayed and forgotten, because
 * the people *not* in the pack are the ones who will otherwise turn up on
 * match day ineligible.
 */
export function exclusionsToCsv(pack: SubmissionPack): string {
  const lines = [
    'person_id,reason,rules,detail',
    ...pack.excluded.map((e) =>
      [e.personId, e.reason, e.ruleIds.join(' '), e.detail].map(csvField).join(','),
    ),
  ];
  return `﻿${lines.join('\r\n')}\r\n`;
}
