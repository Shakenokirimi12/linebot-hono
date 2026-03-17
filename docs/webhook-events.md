# Webhook events（日本語）

`LineHono` は、LINE webhook の各イベントに対して **短く書ける便利メソッド**を提供します。

## 先に結論（おすすめの書き方）

- **特定のテキストに反応**: `app.text('ping', ...)`
- **特定のスタンプに反応**: `app.sticker('1','2', ...)` または `app.message(match.sticker(...), ...)`
- **型安全に分岐したい**: `match.*`
- **全部の message をまとめて処理**: `app.message((c) => ...)`

## まず書くコード（おすすめ）

「受信したものに応じて返す」ボットで一番よく書くパターンです。

```ts
import { LineHono, match, msg } from 'linebot-hono'

const app = new LineHono()
app.webhook('/')

// 第1引数が関数なら、全ての message イベントを処理します。
app.message(c => c.reply.text('ok'))

// 短縮メソッド（ユーザーが書くコードを短くしたい場合は基本これ）
app.text('ping', c => c.reply.text('pong'))
app.sticker('1', '2', c => c.reply.text('nice sticker'))

// 第1引数が関数以外なら matcher として扱い、マッチしたときだけ handler を実行します。
app.message('ping', c => c.reply.text('pong'))
app.message(/hello/i, c => c.reply.text('hi'))
app.message({ type: 'sticker', packageId: '1', stickerId: '2' }, c => c.reply.text('nice sticker')) // object match
app.message(msg.sticker('1', '2'), c => c.reply.text('nice sticker')) // chain-like match
app.message(match.sticker('1', '2'), c => c.reply.text('nice sticker')) // typed match（おすすめ）

app.unsend(c => console.log(c.event.unsend.messageId))
app.follow(c => c.reply.text('thanks!'))
app.unfollow(c => console.log('blocked'))
app.join(c => c.reply.text('hello group'))
app.leave(c => console.log('left'))
app.memberJoined(c => c.reply.text('welcome'))
app.memberLeft(c => console.log('bye'))
app.postback(c => c.reply.text(c.event.postback.data))
app.videoPlayComplete(c => c.reply.text('watched'))
app.beacon(c => c.reply.text(c.event.beacon.hwid))
app.accountLink(c => c.reply.text(c.event.link.result))
app.delivery(c => console.log(c.event.delivery.data))

export default app
```

## `use`（ミドルウェア / ファイル分割）

Hono と同じように `use` で共通処理を差し込めます。

### 全イベント共通のミドルウェア

```ts
app.use(async (c, next) => {
  console.log('event type:', c.event.type)
  await next()
})
```

### 特定イベントだけに適用（例: message のみ）

```ts
app.use('message', async (_c, next) => {
  // message のときだけ実行
  await next()
})
```

### ファイル分割（plugin）

`use(app => { ... })` の形で、別ファイルに切り出した登録処理を適用できます。

```ts
// message.ts
import type { LineHono } from 'linebot-hono'
export const messageHandlers = (app: LineHono) => {
  app.text('ping', c => c.text('pong'))
}

// index.ts
import { LineHono } from 'linebot-hono'
import { messageHandlers } from './message'

const app = new LineHono()
app.use(messageHandlers)
export default app
```

## `LineHono` が提供するイベント便利メソッド（全一覧）

`app.on(type, handler)` のショートハンドとして、以下が使えます。

- **`app.message(...)`**: `message`
- **`app.unsend(handler)`**: `unsend`
- **`app.follow(handler)`**: `follow`
- **`app.unfollow(handler)`**: `unfollow`
- **`app.postback(handler)`**: `postback`
- **`app.join(handler)`**: `join`
- **`app.leave(handler)`**: `leave`
- **`app.memberJoined(handler)`**: `memberJoined`
- **`app.memberLeft(handler)`**: `memberLeft`
- **`app.beacon(handler)`**: `beacon`
- **`app.videoPlayComplete(handler)`**: `videoPlayComplete`
- **`app.accountLink(handler)`**: `accountLink`
- **`app.delivery(handler)`**: `delivery`

## `app.message` のオーバーロード（挙動）

- **`app.message((c) => ...)`**: 全ての `message` イベントが対象
- **`app.message(<matcher>, (c) => ...)`**: matcher に **一致したときだけ**実行

matcher の例:

- **テキスト完全一致**: `app.message('ping', handler)`
- **正規表現**: `app.message(/ping/i, handler)`
- **型付き（おすすめ）**: `app.message(match.sticker('1','2'), handler)`
- **送信ビルダーを流用**: `app.message(msg.sticker('1','2'), handler)`（内部的にはオブジェクトになります）

## 型で絞り込みたい場合は `match`（おすすめ）

```ts
app.message(match.sticker('1', '2'), c => {
  // ここは sticker に絞れる
  c.event.message.packageId
  c.event.message.stickerId
})
```

## Signature verification

Webhook リクエストはデフォルトで `LINE_CHANNEL_SECRET` と `x-line-signature` ヘッダを使って検証されます。

検証処理を差し替えたい場合は `new LineHono({ verify })` を使います（例: ログを出す、独自の許可/拒否など）。

## よくあるミス

- **`c.reply` を replyToken が無いイベントで呼ぶ**: `unfollow` 等では返信できません。必要なら `c.push` を使ってください（ただし送信先IDが取れない場合があります）。
- **matcher を `msg` で書いて型絞り込みしたつもりになる**: `msg.*` は便利ですが型絞り込みが欲しいなら `match.*` を使うのがおすすめです。

