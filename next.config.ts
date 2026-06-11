import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },

  // Redirect root to /v2 -- the old version of the app is still available at /, but we want to make sure new users land on the new version
  redirects() {
    return [
      {
        source: "/",
        destination: "/v2",
        permanent: false
      }
    ]  
  },
};

export default nextConfig;
