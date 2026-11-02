import { defineConfig } from 'vite';

// Served from its own subdomain (find-my-car-demo.atlas-lac.com), so assets live at the root.
export default defineConfig({
  base: '/',
});
