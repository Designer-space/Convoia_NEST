/** @type {import('next').NextConfig} */
const BACKEND_URL = (process.env.BACKEND_URL || "").replace(/\/$/, "");

const nextConfig = {
  /* config options here */
    images: {
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'res.cloudinary.com',
          port: '',
          pathname: '**',
        },
      ],
    },
    // domains: ['res.cloudinary.com']

    // Serve the API from this site's own origin. The backend sets the HttpOnly
    // refresh cookie, so a cross-site call to *.onrender.com would have the
    // cookie dropped by the browser and stay invisible to `src/middleware.ts`.
    async rewrites() {
      if (!BACKEND_URL) return [];
      return [
        {
          source: '/api/:path*',
          destination: `${BACKEND_URL}/:path*`,
        },
      ];
    },
};

export default nextConfig;
