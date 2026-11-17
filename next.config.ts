import type { NextConfig } from "next";

const isDevelopment = process.env.NODE_ENV !== "production";

function scriptSources(): string {
  const sources = ["'self'", "'unsafe-inline'"];
  if (isDevelopment) {
    sources.push("'unsafe-eval'");
  }
  return sources.join(" ");
}

/** CSP básica: permite Firebase Auth (Identity Toolkit, Secure Token y el dominio de la app). */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src ${scriptSources()}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self' https://*.googleapis.com https://*.firebaseapp.com https://securetoken.googleapis.com https://identitytoolkit.googleapis.com",
  "frame-src https://*.firebaseapp.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
];

const nextConfig: NextConfig = {
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  partialPrefetching: true,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
