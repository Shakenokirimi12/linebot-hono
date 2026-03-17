# Cloudflare Workers で動かす（実運用メモ）

`line-hono` は Cloudflare Workers を強く意識しています。
このページは「デプロイで詰まりがちな点」をまとめたメモです。

## 必要な環境変数

- **`LINE_CHANNEL_SECRET`**: Webhook 署名検証に使います（必須）
- **`LINE_CHANNEL_ACCESS_TOKEN`**: Messaging API 呼び出しに使います（push/broadcast等を使う場合は必須）

## 署名検証について

デフォルトで `x-line-signature` を検証します。
検証を差し替えたい場合は `new LineHono({ verify })` を渡してください。

```ts
import { LineHono } from 'line-hono'

const app = new LineHono({
  verify: async (signature, body, secret) => {
    // 独自のログ等を入れたい場合に
    return await (await import('line-hono/verify')).verify(signature, body, secret)
  },
})

export default app
```

## reply / push の落とし穴

- **`c.reply` が使えるのは replyToken があるイベントだけ**です。
  返信できないイベントで `c.reply` を呼ぶと例外になります。
- **`c.push` は送信先 ID が取れないと送れません**。
  `unfollow` などのイベントでは `c.userId` が無いことがあり、push できないケースがあります。

例外にしたくない場合は以下を使えます。

- **`c.canReply` / `c.replyIfPossible.*`**
- **`c.canPush` / `c.pushIfPossible.*`**

## `c.client` を使うとき

`c.client` は `@line/bot-sdk` の公式クライアントです。
`line-hono` のショートハンドで足りないときは、まずここに逃げてください。

```ts
await c.client.getBotInfo()
```

## Hono のルーティングも併用したいとき

`LineHono` は内部に Hono を持っており、`app.http` 経由で通常の HTTP ルートを追加できます。
Webhook 以外のエンドポイント（ヘルスチェック等）を増やしたい場合に便利です。

```ts
import { LineHono } from 'line-hono'

const app = new LineHono()
app.webhook('/webhook')

app.http.get('/health', c => c.text('ok'))

export default app
```

