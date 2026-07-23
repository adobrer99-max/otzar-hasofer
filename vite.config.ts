import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "fonts/*.woff2"],
      manifest: {
        name: "Otzar Ha'Sofer — The Treasury",
        short_name: "Ha'Sofer",
        description:
          "A digital companion and reference guide for the Otzar Ha'Sofer reading, including the Herald generator.",
        theme_color: "#14171c",
        background_color: "#14171c",
        display: "standalone",
        start_url: ".",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,woff2}"],
        // Uploaded card art (public Supabase Storage objects) caches on first
        // view so an installed PWA keeps showing it offline. Object paths are
        // timestamped on replace, so CacheFirst never serves a stale image.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/[^/]+\.supabase\.co\/storage\/v1\/object\/public\/card-art\/.*/,
            handler: "CacheFirst",
            options: {
              cacheName: "card-art",
              expiration: { maxEntries: 220, maxAgeSeconds: 60 * 60 * 24 * 90 },
            },
          },
        ],
      },
    }),
  ],
});
