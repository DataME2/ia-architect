import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // The domain layer imports with explicit `.ts` extensions so it runs
  // unbuilt under Node's type stripping (see CLAUDE.md). Nothing extra is
  // needed for the bundler to follow those — the paths are literal.
  typedRoutes: true,
  // A family's document upload (scope 83) is up to 4 MB; the default 1 MB
  // refused a phone photo of a birth certificate. Kept under Vercel's 4.5 MB
  // request ceiling.
  experimental: {
    serverActions: { bodySizeLimit: '4.5mb' },
  },
};

export default config;
