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
        // **Raster icons, not only the SVG.** `sizes: "any"` on an SVG is
        // legal and is not what a phone wants: Android's homescreen and the
        // install prompt look for 192 and 512 rasters, and for a maskable one
        // so the platform can crop to its own shape without cutting the mark
        // in half. Without them an installed Ma'alot got a generic glyph.
        // Rendered from the same favicon by `npm run build:icons`.
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
          { src: "icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        // The app icons by name rather than `**/*.png`: `scribe-seal.png` is
        // two and a half megabytes and has no business in a precache.
        globPatterns: ["**/*.{js,css,html,svg,woff2}", "icon-*.png"],
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
