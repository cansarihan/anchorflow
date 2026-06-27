/** @type {import('next').NextConfig} */
// AnchorFlow frontend yapılandırması — Author: Can Sarıhan
const backend = process.env.BACKEND_URL ?? "http://localhost:3001";

const nextConfig = {
  async rewrites() {
    // /api/* isteklerini backend'e yönlendir (CORS'suz geliştirme).
    return [{ source: "/api/:path*", destination: `${backend}/:path*` }];
  },
};

export default nextConfig;
