import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

import { COMPANY, DESCRIPTION, MAKER, PRODUCT_NAME, TAGLINE } from '../web/brand.ts';
import { FOOTER_NAV, REGISTER_LINK, SITE_NAV, WORKSPACE_LINK } from '../web/nav.ts';
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
  description: DESCRIPTION,
};

/**
 * The theme colour is the top bar's pitch slate, so a phone's browser
 * chrome continues the bar rather than framing it in grey. One value: the
 * bar is the same colour in both schemes (scope 104).
 */
export const viewport: Viewport = {
  themeColor: '#112636',
};

/**
 * The shell: the top bar, the page, the footer (scope 104).
 *
 * The bar and footer sit outside `.shell` so they run the full width, as the
 * Superdesign front door draws them. **No auth call, and so no Sign in** —
 * this layout is prerendered, and a Sign in link would also be offered to
 * people already signed in; Your workspace serves both.
 */
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
        <header className="topbar">
          <div className="topbar-inner">
            <h1 className="topbar-brand">
              <a href="/">
                {/* Plays the move once on the front door (scope 108). */}
                <BrandMark intro />
                <span className="brand-name">{PRODUCT_NAME}</span>
              </a>
            </h1>
            <nav aria-label="Primary" className="topbar-links">
              {SITE_NAV.map((l) => (
                <a key={l.href} href={l.href}>
                  {l.label}
                </a>
              ))}
            </nav>
            <div className="topbar-actions">
              <a className="topbar-workspace" href={WORKSPACE_LINK.href}>
                {WORKSPACE_LINK.label}
              </a>
              <a className="topbar-register" href={REGISTER_LINK.href}>
                {REGISTER_LINK.label}
              </a>
              {/* Below 1,200px the destinations fold in here. A native
                  disclosure, so the menu needs no script; every link is a
                  full page load, which closes it. */}
              <details className="topbar-menu">
                <summary aria-label="Menu">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </summary>
                <nav aria-label="Menu">
                  {SITE_NAV.map((l) => (
                    <a key={l.href} href={l.href}>
                      {l.label}
                    </a>
                  ))}
                  <a className="topbar-menu-workspace" href={WORKSPACE_LINK.href}>
                    {WORKSPACE_LINK.label}
                  </a>
                </nav>
              </details>
            </div>
          </div>
        </header>
        <div className="shell">
          <main id="main">{children}</main>
        </div>
        <footer className="site-footer">
          <div className="site-footer-inner">
            <div className="site-footer-brand">
              <p className="site-footer-name">
                <BrandMark />
                <span className="brand-name">{PRODUCT_NAME}</span>
              </p>
              <p>{TAGLINE}</p>
              <p className="site-footer-maker">{MAKER}</p>
            </div>
            {FOOTER_NAV.map((column) => (
              <nav key={column.heading} aria-label={column.heading}>
                <p className="site-footer-heading">{column.heading}</p>
                <ul>
                  {column.links.map((l) => (
                    <li key={l.href}>
                      <a href={l.href}>{l.label}</a>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
          <div className="site-footer-base">
            <span>
              &copy; {new Date().getFullYear()} {COMPANY}
            </span>
            <span>Hosted in Sydney; tenant isolation is enforced by the database.</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
