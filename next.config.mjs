/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  /**
   * A short client-side router cache — 20 s for pages, 5 min for static assets.
   *
   * This was 0, which made every single click a fresh server render (0.7–1.2 s
   * in production) and threw away the payload Next had already prefetched for
   * the links in the header: the prefetch happened, then the router immediately
   * considered it stale. That is the "every button loads slow" feel.
   *
   * 20 s is the compromise that keeps the earlier fix intact. The pages that
   * must never look frozen already poll on their own (the leaderboard and the
   * dashboard card every 15 s, the wallet every 8 s), and any server action that
   * changes data calls `revalidatePath`, which purges these entries at once. So
   * the worst case is a page that looks 20 s old for at most one poll cycle —
   * not the permanently stale board that `0` was guarding against, and not a
   * full server round trip on every tab.
   */
  experimental: {
    staleTimes: { dynamic: 20, static: 300 },
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