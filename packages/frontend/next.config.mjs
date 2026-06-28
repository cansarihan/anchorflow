/** @type {import('next').NextConfig} */
// AnchorFlow frontend configuration — Author: Can Sarıhan
const backend = process.env.BACKEND_URL ?? "http://localhost:3001";

const nextConfig = {
  async rewrites() {
    // Proxy /api/* requests to the backend (CORS-free local development).
    return [{ source: "/api/:path*", destination: `${backend}/:path*` }];
  },
};

export default nextConfig;
