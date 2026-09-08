import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const raiz = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.0.1.55"],
  turbopack: {
    root: raiz,
  },
};

export default withSentryConfig(nextConfig, {
  org: "vivazcataratas",
  project: "vivazmanuflow",
  silent: !process.env.CI,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
  },
});
