// vitest.config.ts
import { defineConfig } from "file:///opt/Lume/apps/web-lume/node_modules/vitest/dist/config.js";
import vue from "file:///opt/Lume/apps/web-lume/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import { fileURLToPath } from "node:url";
var __vite_injected_original_import_meta_url = "file:///opt/Lume/apps/web-lume/vitest.config.ts";
var vitest_config_default = defineConfig({
  plugins: [vue()],
  test: {
    globals: true,
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "tests/"
      ]
    },
    include: ["src/**/*.{test,spec}.{js,ts}"]
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url)),
      "@modules": fileURLToPath(new URL("../../backend/src/modules", __vite_injected_original_import_meta_url))
    }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9vcHQvTHVtZS9hcHBzL3dlYi1sdW1lXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvb3B0L0x1bWUvYXBwcy93ZWItbHVtZS92aXRlc3QuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9vcHQvTHVtZS9hcHBzL3dlYi1sdW1lL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlc3QvY29uZmlnJ1xuaW1wb3J0IHZ1ZSBmcm9tICdAdml0ZWpzL3BsdWdpbi12dWUnXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAnbm9kZTp1cmwnXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFt2dWUoKV0sXG4gIHRlc3Q6IHtcbiAgICBnbG9iYWxzOiB0cnVlLFxuICAgIGVudmlyb25tZW50OiAnanNkb20nLFxuICAgIGNvdmVyYWdlOiB7XG4gICAgICBwcm92aWRlcjogJ3Y4JyxcbiAgICAgIHJlcG9ydGVyOiBbJ3RleHQnLCAnanNvbicsICdodG1sJ10sXG4gICAgICBleGNsdWRlOiBbXG4gICAgICAgICdub2RlX21vZHVsZXMvJyxcbiAgICAgICAgJ3Rlc3RzLycsXG4gICAgICBdLFxuICAgIH0sXG4gICAgaW5jbHVkZTogWydzcmMvKiovKi57dGVzdCxzcGVjfS57anMsdHN9J10sXG4gIH0sXG4gIHJlc29sdmU6IHtcbiAgICBhbGlhczoge1xuICAgICAgJ0AnOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4vc3JjJywgaW1wb3J0Lm1ldGEudXJsKSksXG4gICAgICAnQG1vZHVsZXMnOiBmaWxlVVJMVG9QYXRoKG5ldyBVUkwoJy4uLy4uL2JhY2tlbmQvc3JjL21vZHVsZXMnLCBpbXBvcnQubWV0YS51cmwpKSxcbiAgICB9LFxuICB9LFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBMlAsU0FBUyxvQkFBb0I7QUFDeFIsT0FBTyxTQUFTO0FBQ2hCLFNBQVMscUJBQXFCO0FBRjBILElBQU0sMkNBQTJDO0FBSXpNLElBQU8sd0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxJQUFJLENBQUM7QUFBQSxFQUNmLE1BQU07QUFBQSxJQUNKLFNBQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLFVBQVU7QUFBQSxNQUNSLFVBQVU7QUFBQSxNQUNWLFVBQVUsQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLE1BQ2pDLFNBQVM7QUFBQSxRQUNQO0FBQUEsUUFDQTtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxTQUFTLENBQUMsOEJBQThCO0FBQUEsRUFDMUM7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssY0FBYyxJQUFJLElBQUksU0FBUyx3Q0FBZSxDQUFDO0FBQUEsTUFDcEQsWUFBWSxjQUFjLElBQUksSUFBSSw2QkFBNkIsd0NBQWUsQ0FBQztBQUFBLElBQ2pGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
