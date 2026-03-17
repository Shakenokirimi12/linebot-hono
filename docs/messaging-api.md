# Messaging API（日本語）

`line-hono` は `Context` に **Hono風のfluent API** を生やし、短く・読みやすく書けるようにします。

このページでは「送る（Messaging API）」「足りないときの逃げ道」「クーポンの作成→送信」「管理系API」をまとめます。

```ts
app.message(c => c.reply.text('hello'))
```

ショートハンドが足りないときは、公式クライアント（`@line/bot-sdk`）に常に逃げられます。

```ts
await c.client.getBotInfo()
```

## まず覚えること（最小）

- **返信**: `c.reply.*` / さらに短く `c.text(...)` など
- **プッシュ**: `c.push.*`
- **配信**: `c.broadcast.*` / `c.multicast.*` / `c.narrowcast.*`
- **クーポン**: `c.coupon.create()` で作り、`c.push.coupon(couponId)` 等で送る
- **不足分**: `c.client.<method>()`（公式クライアント）

## 送信

### Reply

```ts
app.message(c => c.reply.text('pong'))
```

ショートハンドもあります。

```ts
app.message(c => c.text('pong'))
```

利用できるショートハンド（代表）:

- `c.text(text)`
- `c.image(url, previewUrl?)`
- `c.video(url, previewUrl)`
- `c.audio(url, duration)`
- `c.location(title, address, lat, lon)`
- `c.sticker(packageId, stickerId)`
- `c.flex(altText, contents)`
- `c.template(altText, template)`
- `c.coupon(couponId)`

### 送信メソッド（全一覧）

`reply` / `push` / `broadcast` / `multicast` / `narrowcast` は共通で、以下のメッセージ用ショートハンドを持ちます。

- **`.text(text)`**
- **`.image(url, previewUrl?)`**
- **`.video(url, previewUrl)`**
- **`.audio(url, duration)`**
- **`.location(title, address, lat, lon)`**
- **`.sticker(packageId, stickerId)`**
- **`.flex(altText, contents)`**
- **`.template(altText, template)`**
- **`.coupon(couponId)`**

また、関数として `sender(messageOrMessages, options?)` も呼べます（`broadcast` / `multicast` / `narrowcast` は options 対応）。

#### いつ `c.text(...)` を使う？いつ `c.reply.text(...)` を使う？

- **基本は `c.text(...)`**（短くて読みやすい）
- `reply` と明示したいとき（例: 複数の送信手段が混在する handler）だけ `c.reply.*` を使う

## 受信メッセージのルーティング（短縮）

よく使うものは `LineHono` 側に短縮メソッドがあります。

```ts
app.text('ping', c => c.reply.text('pong'))
app.sticker('1', '2', c => c.reply.text('nice'))
```

このショートハンドは `app.message(...)` の “よくある書き方” を短くしたものです。
迷ったらまず `app.text(...)` / `app.sticker(...)` を使うのがおすすめです。

### Push

```ts
app.message(c => c.push.text('hello'))
```

### Broadcast（全ユーザーへ配信）

```ts
app.message(c => c.broadcast.text('hello'))
```

オプション（retry key と request fields）:

```ts
app.message(c => c.broadcast.text('hello', { notificationDisabled: true, retryKey: 'uuid' }))
```

### Multicast（複数ユーザーへ配信）

```ts
app.message(c => c.multicast.to(['Uxxx', 'Uyyy']).text('hello', { retryKey: 'uuid' }))
```

### Narrowcast（条件付き配信）

```ts
app.message(c =>
  c.narrowcast.text('hello', {
    recipient: { type: 'audience', audienceGroupId: 1 },
    retryKey: 'uuid',
  }),
)
```

## クーポン（作成 → 送信）

LINEクーポンは「作る」と「送る」が分かれています。

### 1) 作成

```ts
const res = await c.coupon.create({
  title: 'Friends-only coupon',
  description: 'Show this screen to staff.',
  reward: {
    type: 'discount',
    priceInfo: { type: 'fixed', fixedAmount: 100 },
  },
  acquisitionCondition: { type: 'normal' },
  startTimestamp: 0,
  endTimestamp: 1924959599,
  imageUrl: 'https://example.com/coupon.jpg',
  timezone: 'ASIA_TOKYO',
  visibility: 'UNLISTED',
  maxUseCountPerTicket: 1,
})
```

メソッドチェーンで書きたい場合はビルダーを使えます。

```ts
const res = await c.coupon
  .builder()
  .title('Friends-only coupon')
  .description('Show this screen to staff.')
  .discountFixed(100)
  .acquisitionNormal()
  .startTimestamp(0)
  .endTimestamp(1924959599)
  .imageUrl('https://example.com/coupon.jpg')
  .timezone('ASIA_TOKYO')
  .visibility('UNLISTED')
  .maxUseCountPerTicket(1)
  .create()
```

### 2) 送信

```ts
app.message(c => c.push.coupon(res.couponId))
```

クーポンは `reply` / `push` / `broadcast` / `multicast` / `narrowcast` のどれでも送れます。

### 作成時の補足

- `builder()` は「典型的な項目」をチェーンで書くためのものです。
  仕様の追加・細かいフィールド指定が必要な場合は **`builder().set({...})`** で逃げられます。

## 送信以外のAPI（よく使うもの）

### Bot / Profile / Link token

```ts
const info = await c.botInfo()
const profile = await c.profile() // c.userId があれば省略可
const token = await c.issueLinkToken() // c.userId があれば省略可
```

### Rich menu

```ts
const list = await c.richMenu.list()
```

### Webhook endpoint（サーバ側設定）

```ts
const current = await c.webhookEndpoint.get()
await c.webhookEndpoint.set({ endpoint: 'https://example.com/webhook' })
await c.webhookEndpoint.test()
```

### Quota & statistics

```ts
const quota = await c.quota.message()
const usage = await c.statistics.aggregationUnit.usage()
```

## `match` / `msg` の使い分け（重要）

- **`match.*`**: 受信イベントを **型で絞り込む**ためのマッチャ（おすすめ）
- **`msg.*`**: 送信メッセージを「オブジェクトを書かずに」作るためのビルダー

例:

```ts
import { LineHono, match, msg } from 'line-hono'

const app = new LineHono()

app.message(match.sticker('1', '2'), c => {
  // sticker に型が絞れる
  return c.reply.text('nice')
})

app.message(c => c.push(msg.sticker('1', '2')))
```

## 注意点

- **スタンプ/クーポン等の一部メッセージは、`@line/bot-sdk` の `Message` 型更新が追いつかない場合があります**。その場合でも `line-hono` のショートハンド（例: `c.push.coupon(...)`）は実際のAPI仕様に合わせて送信できるようにしています。
- `c.client` は最終手段として常に使えます（APIの全網羅）。

