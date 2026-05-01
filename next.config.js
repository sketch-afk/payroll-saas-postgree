/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["pg"],
  },
  images: {
    domains: ["lh3.googleusercontent.com"],
  },
};
module.exports = nextConfig;
