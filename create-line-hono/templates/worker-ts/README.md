# __PACKAGE_NAME__

LINE bot on Cloudflare Workers, powered by `linebot-hono`.

## Setup

Install:

```sh
pnpm i
```

Enable `nodejs_compat` in `wrangler.jsonc` (required for `@line/bot-sdk`).

Set secrets:

```sh
wrangler secret put LINE_CHANNEL_SECRET
wrangler secret put LINE_CHANNEL_ACCESS_TOKEN
```

## Develop

```sh
pnpm dev
```

## Deploy

```sh
pnpm deploy
```

