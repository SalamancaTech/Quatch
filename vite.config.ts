import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { viteSingleFile } from 'vite-plugin-singlefile'

// Custom plugin to remove the import map script tag
const removeImportMapPlugin = () => ({
  name: 'remove-import-map',
  enforce: 'post',
  transformIndexHtml(html) {
    // This regex will find and remove the script tag with type="importmap"
    return html.replace(/<script type="importmap">.*?<\/script>/s, '');
  },
});

export default defineConfig({
  plugins: [
    react(),
    viteSingleFile(),
    removeImportMapPlugin(),
  ],
  build: {
    cssCodeSplit: false,
    assetsInlineLimit: 100000000, // Inline all assets
  },
  base: './', // Ensure all paths are relative
})
