/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * No client-side router cache for dynamic routes.
   *
   * Next keeps an RSC payload for a page it has already visited and serves it
   * again for the next 30 seconds. That is exactly wrong for this app: the
   * leaderboard, the wallet and every classroom list change while a student is
   * walking between pages, so going back to the dashboard showed the numbers
   * from a minute ago — "the leaderboard doesn't update". With the cache at 0
   * every navigation re-asks the server, and the pages are already dynamic
   * (they read the session cookie), so nothing is lost by never caching them.
   */
  experimental: {
    staleTimes: { dynamic: 0, static: 0 },
  },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**.supabase.co' }],
  },
  /**
   * Render's container resolves supabase.co to 76.76.21.21 (a Vercel address)
   * and cannot resolve pooler.supabase.com at all, so the app there can never
   * reach its database or the login service — /api/health?dns=1 shows it.
   * Until quizkeen.om.to points at Vercel, send visitors to the deployment
   * that works instead of showing a login form that cannot sign anyone in.
   * The check is build-time and Render-only, so Vercel never sees this rule.
   */
  async redirects() {
    if (!process.env.RENDER) return [];
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'quizkeen.om.to' }],
        destination: 'https://quizkeen.vercel.app/:path*',
        permanent: false,
      },
    ];
  },
};
export default nextConfig;