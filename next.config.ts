import type { NextConfig } from "next";

const dev = process.env.NODE_ENV !== "production";

// Next.js injects inline bootstrap scripts, so 'unsafe-inline' is needed without nonces;
// everything else is restricted to this origin.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' blob:",
  "font-src 'self' data:",
  `connect-src 'self'${dev ? " ws:" : ""}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  // Shared hosting caps processes and threads; NEXT_BUILD_CPUS=1 builds with a single worker.
  ...(process.env.NEXT_BUILD_CPUS ? { experimental: { cpus: Number(process.env.NEXT_BUILD_CPUS) } } : {}),
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
