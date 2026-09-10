import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src')
    return config
  },
  images: {
    // Scoped to the hosts we actually serve images from. A '**' hostname turns
    // /_next/image into an open proxy: anyone can pass an arbitrary URL and have
    // this server fetch and re-serve it, at our bandwidth and from our IP.
    // Uploads go to Cloudinary (src/lib/cloudinary.ts); everything else is local.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },
}

export default nextConfig
