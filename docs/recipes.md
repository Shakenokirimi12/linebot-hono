# レシピ集（よくある実装パターン）

## 1) ping/pong（最短）

```ts
import { LineHono } from 'line-hono'

const app = new LineHono()
app.text('ping', c => c.text('pong'))

export default app
```

## 2) スタンプにだけ反応したい（型付き）

```ts
import { LineHono, match } from 'line-hono'

const app = new LineHono()

app.message(match.sticker('1', '2'), c => {
  // sticker に型が絞れる
  return c.reply.text('nice')
})

export default app
```

## 3) 返信できないイベントでも push したい

`replyToken` が無いイベント（例: unfollow 等）では `c.reply` は使えません。
必要なら `c.push` で送ります（送信先は `c.userId || c.groupId || c.roomId` から自動選択）。

```ts
app.unfollow(async c => {
  // userId が無い場合は push の送信先が取れないので注意
  if (!c.userId) return
  await c.push.text('またね')
})
```

## 4) クーポンを作って送る

```ts
app.follow(async c => {
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

  return c.reply.coupon(res.couponId)
})
```

