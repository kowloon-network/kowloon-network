// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  site: 'https://kowloon.network',
  vite: {
    server: {
      // Dev-only convenience — mirrors the Caddyfile's production route to
      // the waitlist sidecar (`node waitlist/server.js`, default :8090), so
      // `astro dev` can exercise the real form without the full Docker
      // stack. Doesn't affect the production build at all.
      proxy: {
        '/api/waitlist': 'http://localhost:8090',
      },
    },
  },
});
