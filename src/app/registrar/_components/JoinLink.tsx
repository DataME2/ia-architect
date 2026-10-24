'use client';

import { useId, useState, useSyncExternalStore } from 'react';

import { NO_CREDENTIAL_DESTINATION } from '../../../web/safe-destination.ts';

const noSubscription = () => () => {};

/**
 * What to send when a workspace link went astray (BR180, scope 107).
 *
 * Not the sign-in link: whoever opens that is signed in as the person. This
 * is the page where the person asks for their own link at the address the
 * club holds. It signs nobody in, so it is safe to pass on by any channel.
 * Shown on a registration's workspace panels; on Access an administrator
 * makes the sign-in link itself instead (scope 109).
 *
 * The origin is the browser's, read after hydration, so the address is this
 * site's on every deployment and the server render does not differ from it.
 */
export function JoinLink() {
  const origin = useSyncExternalStore(noSubscription, () => window.location.origin, () => '');
  const [copied, setCopied] = useState(false);
  const id = useId();
  const address = `${origin}${NO_CREDENTIAL_DESTINATION}`;

  return (
    <div className="stack" style={{ gap: '0.3rem', marginTop: '0.75rem' }}>
      <label htmlFor={id}>Not arrived, or expired? Send them the join page instead</label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        <input
          id={id}
          type="text"
          readOnly
          value={address}
          onFocus={(e) => e.currentTarget.select()}
          style={{ flex: '1 1 16rem', minWidth: 0 }}
        />
        <button
          type="button"
          className="secondary"
          onClick={() => {
            void navigator.clipboard.writeText(address).then(() => setCopied(true));
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="hint" style={{ margin: 0 }}>
        They enter the email the club holds for them and get a fresh link of their own. The page
        signs nobody in, so it is safe to send by message.
      </p>
    </div>
  );
}
