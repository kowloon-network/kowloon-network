# kowloon.network

The open-source Kowloon app's home on the web: info, docs, FAQ, devlog, and the
launch waitlist. Built with [Astro](https://astro.build) (static), docs via
Starlight (to come), waitlist/newsletter via Kit (ConvertKit).

Not the paid hosting platform -- that lives in `kowloon-hosting` (later).

## Develop

```
npm install
npm run dev        # local dev server
npm run build      # static build -> dist/
```

## Deploy

Push to `main` -> GitHub Actions builds a Docker image (Astro build + Caddy) and
publishes it to GHCR. On the `kowloon.network` box:

```
cd ~/kowloon-network
docker compose pull && docker compose up -d
```

Caddy serves the static site on 80/443 with automatic HTTPS.
