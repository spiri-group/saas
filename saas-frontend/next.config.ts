import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async redirects() {
    return [
      {
        source: '/blogs',
        destination: '/blog',
        permanent: true,
      },
      {
        source: '/blogs/:path*',
        destination: '/blog/:path*',
        permanent: true,
      },
      {
        source: '/m/setup',
        destination: '/setup',
        permanent: true,
      },
      {
        source: '/p/setup',
        destination: '/setup',
        permanent: true,
      },
    ];
  },
  serverExternalPackages: ['react-pdf'],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "stspvappdev002.blob.core.windows.net",
        pathname: "/**"
      }
    ]
  }
  /* config options here */
};

export default nextConfig;
