const { defineConfig } = require('vite');
const react = require('@vitejs/plugin-react');

module.exports = defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173
  },
  build: {
    target: 'ES2020',
    outDir: 'renderer/dist'
  }
});
