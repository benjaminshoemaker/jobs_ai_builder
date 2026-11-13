import {withWorkflow} from 'workflow/next';
/** Keep the existing .js imports in the shared TypeScript modules working. */
export default withWorkflow({
  outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
  webpack(config) {
    config.resolve.extensionAlias = { ...config.resolve.extensionAlias, '.js': ['.ts', '.tsx', '.js'] };
    return config;
  },
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'" },
    ] }];
  },
});
