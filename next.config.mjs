/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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