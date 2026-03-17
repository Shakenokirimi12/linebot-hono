# `match` / `msg` 詳説

`linebot-hono` には “似ているけど目的が違う” 2つの道具があります。

- **`match.*`**: 受信イベントを **型で絞り込む**ための matcher（おすすめ）
- **`msg.*`**: 送信メッセージを **オブジェクトを書かずに**作るための builder

## `match`（受信の型絞り込み）

`app.message(match.sticker(...), handler)` のように使います。
handler 内で `c.event.message` の型が絞られるので、安全にプロパティへアクセスできます。

```ts
import { LineHono, match } from 'linebot-hono'

const app = new LineHono()

app.message(match.sticker('1', '2'), c => {
  // ここでは sticker だと型が分かる
  c.event.message.packageId
  c.event.message.stickerId
})
```

### `match.text` について

`match.text(...)` は **常に matcher を返します**。

```ts
app.message(match.text('ping'), c => c.text('pong'))
app.message(match.text(/hello/i), c => c.text('hi'))
```

### いつ `match` を使うべき？

- **「そのメッセージ型でしか存在しないプロパティ」を触りたいとき**（例: sticker の `packageId`）
- **将来の拡張で handler が壊れないようにしたいとき**

## `msg`（送信のビルダー）

`c.push(msg.sticker(...))` のように使います。
`c.push.sticker(...)` のようなショートハンドがある場合でも、`msg` は「配列でまとめたい」「条件分岐で組み立てたい」時に便利です。

```ts
import { msg } from 'linebot-hono'

await c.push([
  msg.text('hello'),
  msg.sticker('1', '2'),
])
```

## `msg` を matcher として流用できる（設計意図）

`app.message(msg.sticker('1','2'), handler)` のように、送信ビルダーを matcher にも使えます。
（内部的には「オブジェクト一致」として判定します）

```ts
app.message(msg.sticker('1', '2'), c => c.reply.text('nice'))
```

ただし **型の絞り込みが欲しいなら `match` を推奨**します。

## 使い分けの結論

- **型安全にルーティングしたい**: `match`
- **メッセージを組み立てて送りたい**: `msg`
- **短く書きたいだけ**: `c.reply.*` / `c.push.*` / `c.text(...)` などのショートハンド

