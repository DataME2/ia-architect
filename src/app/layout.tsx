import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import './globals.css';

export const metadata: Metadata = {
  title: "Let'sDataTalk — Registration",
  description: 'Club registration, collected once and submitted right first time.',
};

export default function RootLayout({ children }: { readonly children: ReactNode }) {
  return (
    <html lang="en-AU">
      <body>
        <div className="shell">
          <header className="masthead">
            <h1>
              <a href="/">Let&rsquo;sDataTalk</a>
            </h1>
            <nav>
              <a href="/registrar">Club administration</a>
              <a href="/register">New registration</a>
            </nav>
          </header>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
