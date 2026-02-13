/** @type {import('next').NextConfig} */
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
};

export default nextConfig;
