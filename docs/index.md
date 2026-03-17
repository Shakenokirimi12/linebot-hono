# linebot-hono Docs（日本語）

`linebot-hono` は、LINE Messaging API を **Honoっぽい書き心地**で扱うためのライブラリです（Cloudflare Workers などのエッジ環境を想定）。

## どこを読めばいい？

- **まず動かす**: このページの「クイックスタート」
- **送信（reply/push/broadcast…）や管理系API**: [Messaging API](./messaging-api.md)
- **受信イベントの書き方（`app.message` / `match` の使い方）**: [Webhook events](./webhook-events.md)
- **コピペで使える実装例**: [レシピ集](./recipes.md)

## クイックスタート

```ts
import { LineHono } from 'linebot-hono'

const app = new LineHono()

app.webhook('/')
app.message(c => c.text('pong'))

export default app
```

## ガイド

- [Messaging API](./messaging-api.md)
- [Webhook events](./webhook-events.md)
- [レシピ集](./recipes.md)
- [Context リファレンス](./context.md)
- [`match` / `msg` 詳説](./match-and-msg.md)
- [Cloudflare Workers で動かす](./cloudflare-workers.md)

## 必要な環境変数

- Webhook署名検証: `LINE_CHANNEL_SECRET`
- Messaging API 呼び出し（push/broadcastなど）: `LINE_CHANNEL_ACCESS_TOKEN`

