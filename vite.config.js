import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    rolldownOptions: {
      input: {
        main: "index.html",
        spritePreview: "map-sprites.html",
        uiKit: "ui-kit.html",
        routeEditor: "route-editor.html",
      },
      output: {
        codeSplitting: {
          groups: [{ name: "phaser", test: /node_modules\/phaser/ }],
        },
      },
    },
  },
});
