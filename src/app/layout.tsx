import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { MAKER, PRODUCT_NAME, TAGLINE } from '../web/brand.ts';
import { BrandMark } from './_components/BrandMark.tsx';
import './globals.css';
// After globals.css: the design system's utilities (src/components/ui) must
// win over its element rules. See the header of design-system.css.
import './design-system.css';

export const metadata: Metadata = {
  title: {
    default: `${PRODUCT_NAME} — ${TAGLINE}`,
    template: `%s · ${PRODUCT_NAME}`,
  },
  description: `${TAGLINE} ${MAKER}.`,
};

/**
 * The theme colour is the deep eucalyptus of the masthead, so a phone's
 * browser chrome continues the page rather than framing it in grey. Two
 * values, because the dark theme's ground is nearly black and the light
 * theme's green would sit on it as a bright band.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1f5f2' },
    { media: '(prefers-color-scheme: dark)', color: '#0a1310' },
  ],
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en-AU">
      <body>
        {/*
          The club menu is ten links wide on every club screen, and a
          keyboard or screen-reader user should not have to walk it to reach
          the queue. Visually hidden until focused.
        */}
        <a className="skip-link" href="#main">
          Skip to content
        </a>
        <div className="shell">
          <header className="masthead">
            <h1>
              <a href="/">
                <BrandMark />
                <span>
                  <span className="brand-name">{PRODUCT_NAME}</span>
                  <span className="brand-region">{MAKER}</span>
                </span>
              </a>
            </h1>
            {/*
              Three links, and deliberately not a fourth for signing in. This
              layout is prerendered — it makes no auth call, by design — so a
              "Sign in" here would still be offering it to somebody already
              signed in. `/registrar` sends whoever needs it to the sign-in
              screen with their destination attached.
            */}
            <nav aria-label="Primary">
              <a href="/me">Your workspace</a>
              <a href="/registrar">Club administration</a>
              <a href="/register">New registration</a>
            </nav>
          </header>
          <main id="main">{children}</main>
        </div>
        <footer className="site-footer">
          <span>
            <strong>{PRODUCT_NAME}</strong> — {TAGLINE}
          </span>
          <span>{MAKER}. Hosted in Sydney; tenant isolation is enforced by the database.</span>
        </footer>
      </body>
    </html>
  );
}
