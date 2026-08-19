import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  // The domain layer imports with explicit `.ts` extensions so it runs
  // unbuilt under Node's type stripping (see CLAUDE.md). Nothing extra is
  // needed for the bundler to follow those — the paths are literal.
  typedRoutes: true,
};

export default config;
