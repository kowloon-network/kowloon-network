// @ts-check
import { defineConfig } from 'astro/config';

import starlight from '@astrojs/starlight';

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

  integrations: [
    starlight({
      title: 'Kowloon Docs',
      description:
        'Developer documentation for Kowloon — architecture, the Activity API, REST endpoints, and the @kowloon/client library.',
      social: [
        { icon: 'github', label: 'GitHub', href: 'https://github.com/kowloon-network' },
      ],
      editLink: {
        baseUrl: 'https://github.com/kowloon-network/kowloon-network/edit/main/',
      },
      sidebar: [
        {
          label: 'Introduction',
          items: [
            { label: 'Overview', slug: 'docs' },
            { label: 'Architecture', slug: 'docs/architecture' },
          ],
        },
        {
          label: 'Activities',
          items: [{ autogenerate: { directory: 'docs/activities' } }],
        },
        {
          label: 'REST API',
          items: [{ autogenerate: { directory: 'docs/api' } }],
        },
        {
          label: 'Client Library',
          items: [{ autogenerate: { directory: 'docs/client' } }],
        },
      ],
    }),
  ],
});