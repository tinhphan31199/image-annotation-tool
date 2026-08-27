/** @type {import('next').NextConfig} */

// Proxy /be/* → backend (tunnel Pinggy/Cloudflare/ngrok...).
// Mini App gọi cùng-origin /be/api/... → không bao giờ dính CORS/preflight,
// và trang warning của tunnel free không chặn được server-side fetch.
// Đổi backend: set env BACKEND_ORIGIN rồi redeploy.
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN || "http://localhost:8000";

const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/terms",
        destination: "/tiktok71SwacWuMh0otSZ44qjOEqwhAYkXpf6m.txt",
        permanent: false,
      },
      {
        source: "/terms/",
        destination: "/tiktok71SwacWuMh0otSZ44qjOEqwhAYkXpf6m.txt",
        permanent: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/be/:path*",
        destination: `${BACKEND_ORIGIN}/:path*`,
      },
    ];
  },
};

export default nextConfig;
