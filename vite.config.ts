import { dirname, resolve } from "node:path";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const __dirname = dirname(__filename);
const root = resolve(__dirname, ".");

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  resolve: {
    alias: [
      {
        find: "@atlaskit/pragmatic-drag-and-drop",
        replacement: resolve(
          root,
          "./node_modules/@atlaskit/pragmatic-drag-and-drop/dist/esm/entry-point",
        ),
      },
      {
        find: "@atlaskit/pragmatic-drag-and-drop-auto-scroll",
        replacement: resolve(
          root,
          "./node_modules/@atlaskit/pragmatic-drag-and-drop-auto-scroll/dist/esm/entry-point",
        ),
      },
      {
        find: "@atlaskit/pragmatic-drag-and-drop-hitbox",
        replacement: resolve(
          root,
          "./node_modules/@atlaskit/pragmatic-drag-and-drop-hitbox/dist/esm",
        ),
      },
    ],
  },
});
