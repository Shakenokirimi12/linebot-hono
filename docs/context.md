# Context リファレンス（`c` でできること）

`linebot-hono` の handler には `Context`（慣習的に `c`）が渡されます。
このページは「`c` で何ができるか」を一覧できるようにまとめたリファレンスです。

## よく使うプロパティ

- **`c.env`**: Workers 等の環境変数（Bindings）
- **`c.executionCtx`**: Workers の `ExecutionContext`（利用できない環境では例外）
- **`c.event`**: 生の LINE Webhook event
- **`c.userId` / `c.groupId` / `c.roomId`**: 送信元の ID（無いこともあります）
- **`c.client`**: 公式 `@line/bot-sdk` の `MessagingApiClient`（全APIの逃げ道）

## `use`（ミドルウェア）で何ができる？

ミドルウェアは `LineHono` 側に登録します（`Context` ではなく `app` 側の機能です）。
詳細は `docs/webhook-events.md` の `use` セクションを参照してください。

## 返信（reply）

`replyToken` があるイベントでのみ使えます（主に `message` / `follow` / `join` / `postback` 等）。

### `c.reply(...)`（関数として呼ぶ）

- **`await c.reply(message)`**
- **`await c.reply([message1, message2, ...])`**

### `c.reply.*`（ショートハンド一覧）

- **`await c.reply.text(text)`**
- **`await c.reply.image(url, previewUrl?)`**
- **`await c.reply.video(url, previewUrl)`**
- **`await c.reply.audio(url, duration)`**
- **`await c.reply.location(title, address, lat, lon)`**
- **`await c.reply.sticker(packageId, stickerId)`**
- **`await c.reply.flex(altText, contents)`**
- **`await c.reply.template(altText, template)`**
- **`await c.reply.coupon(couponId)`**

### さらに短いショートハンド（`reply` のエイリアス）

以下は全て **`c.reply.*` の別名**です（短く書きたいとき用）。

- **`await c.text(text)`**
- **`await c.image(url, previewUrl?)`**
- **`await c.video(url, previewUrl)`**
- **`await c.audio(url, duration)`**
- **`await c.location(title, address, lat, lon)`**
- **`await c.sticker(packageId, stickerId)`**
- **`await c.flex(altText, contents)`**
- **`await c.template(altText, template)`**
- **`await c.coupon(couponId)`**

### 例外を避けたい場合

- **`c.canReply`**: replyToken があるとき `true`
- **`c.replyIfPossible.*`**: 返信できない場合は `undefined` を返す（例外にしない）

## プッシュ（push）

`c.userId || c.groupId || c.roomId` のいずれかが取れるときに送れます。
「返信できないイベント（replyTokenがない）でも通知したい」場合に使います。

### `c.push(...)`（関数として呼ぶ）

- **`await c.push(message)`**
- **`await c.push([message1, message2, ...])`**

### `c.push.*`（ショートハンド一覧）

- **`await c.push.text(text)`**
- **`await c.push.image(url, previewUrl?)`**
- **`await c.push.video(url, previewUrl)`**
- **`await c.push.audio(url, duration)`**
- **`await c.push.location(title, address, lat, lon)`**
- **`await c.push.sticker(packageId, stickerId)`**
- **`await c.push.flex(altText, contents)`**
- **`await c.push.template(altText, template)`**
- **`await c.push.coupon(couponId)`**

### 例外を避けたい場合

- **`c.canPush`**: 送信先 ID（`userId/groupId/roomId`）が取れるとき `true`
- **`c.pushIfPossible.*`**: 送信できない場合は `undefined` を返す（例外にしない）

## 配信（broadcast / multicast / narrowcast）

### Broadcast（全体配信）

- **`await c.broadcast(message, options?)`**
- **`await c.broadcast([message1, ...], options?)`**
- **`await c.broadcast.text(text, options?)`**
- **`await c.broadcast.image(url, previewUrl?, options?)`**
- **`await c.broadcast.video(url, previewUrl, options?)`**
- **`await c.broadcast.audio(url, duration, options?)`**
- **`await c.broadcast.location(title, address, lat, lon, options?)`**
- **`await c.broadcast.sticker(packageId, stickerId, options?)`**
- **`await c.broadcast.flex(altText, contents, options?)`**
- **`await c.broadcast.template(altText, template, options?)`**
- **`await c.broadcast.coupon(couponId, options?)`**

`options` は `notificationDisabled` 等に加えて **`retryKey`** を受け取れます。

### Multicast（複数宛て配信）

- **`await c.multicast(message, { to, retryKey? })`**
- **`await c.multicast([message1, ...], { to, retryKey? })`**
- **`await c.multicast.to(to).text(text, options?)`**（`to` を固定してチェーン）
- **`await c.multicast.to(to).image(url, previewUrl?, options?)`**
- **`await c.multicast.to(to).video(url, previewUrl, options?)`**
- **`await c.multicast.to(to).audio(url, duration, options?)`**
- **`await c.multicast.to(to).location(title, address, lat, lon, options?)`**
- **`await c.multicast.to(to).sticker(packageId, stickerId, options?)`**
- **`await c.multicast.to(to).flex(altText, contents, options?)`**
- **`await c.multicast.to(to).template(altText, template, options?)`**
- **`await c.multicast.to(to).coupon(couponId, options?)`**

### Narrowcast（条件付き配信）

- **`await c.narrowcast(message, options)`**
- **`await c.narrowcast([message1, ...], options)`**
- **`await c.narrowcast.text(text, options)`**
- **`await c.narrowcast.image(url, previewUrl?, options)`**
- **`await c.narrowcast.video(url, previewUrl, options)`**
- **`await c.narrowcast.audio(url, duration, options)`**
- **`await c.narrowcast.location(title, address, lat, lon, options)`**
- **`await c.narrowcast.sticker(packageId, stickerId, options)`**
- **`await c.narrowcast.flex(altText, contents, options)`**
- **`await c.narrowcast.template(altText, template, options)`**
- **`await c.narrowcast.coupon(couponId, options)`**

`options` は少なくとも **`recipient`**（必須）を含み、加えて **`retryKey`** などを受け取れます。

## クーポン（coupon）

### `c.coupon.*`（API一覧）

- **`await c.coupon.create(request?)`**
- **`await c.coupon.list(status?, start?, limit?)`**
- **`await c.coupon.get(couponId)`**
- **`await c.coupon.close(couponId)`**
- **`c.coupon.builder()`**（作成用ビルダー）

### `c.coupon.builder()`（メソッドチェーン一覧）

ビルダーは `createCoupon` の典型項目を「オブジェクトを書かずに」組み立てたい時に使います。
細かい項目は `set({...})` で逃げられます。

- **`.set(partialRequest)`**: 任意フィールドをマージ（escape hatch）
- **`.title(value)`**
- **`.description(value)`**
- **`.imageUrl(url)`**
- **`.timezone(value)`**
- **`.visibility(value)`**
- **`.startTimestamp(value)`**
- **`.endTimestamp(value)`**
- **`.maxUseCountPerTicket(value)`**
- **`.acquisitionNormal()`**
- **`.discountFixed(amount)`**
- **`.create()`**

## 管理系API（代表）

頻出どころだけ `linebot-hono` 側で “入口” を整えています。

### Bot / Profile / Link token

- **`await c.botInfo()`**
- **`await c.profile(userId?)`**: `userId` 省略時は `c.userId` を使います（無い場合は例外）
- **`await c.issueLinkToken(userId?)`**: 同上

### Webhook endpoint（サーバ側設定）

- **`await c.webhookEndpoint.get()`**
- **`await c.webhookEndpoint.set({ endpoint })`**
- **`await c.webhookEndpoint.test()`**

### Quota

- **`await c.quota.message()`**
- **`await c.quota.consumption()`**

### Statistics

#### Aggregation unit

- **`await c.statistics.aggregationUnit.names(limit?, start?)`**
- **`await c.statistics.aggregationUnit.usage()`**

#### PNP

- **`await c.statistics.pnp.messages(date)`**

#### Sent (message delivery stats)

- **`await c.statistics.sent.broadcast(date)`**
- **`await c.statistics.sent.multicast(date)`**
- **`await c.statistics.sent.push(date)`**
- **`await c.statistics.sent.reply(date)`**

#### Narrowcast

- **`await c.statistics.narrowcast.progress(requestId)`**

### Followers

- **`await c.followers.get(start?, limit?)`**

### Groups

- **`await c.groups.summary(groupId)`**
- **`await c.groups.memberCount(groupId)`**
- **`await c.groups.members.ids(groupId, start?)`**
- **`await c.groups.members.profile(groupId, userId)`**
- **`await c.groups.leave(groupId)`**

### Rooms

- **`await c.rooms.memberCount(roomId)`**
- **`await c.rooms.members.ids(roomId, start?)`**
- **`await c.rooms.members.profile(roomId, userId)`**
- **`await c.rooms.leave(roomId)`**

### Rich menu

- **`await c.richMenu.create(request)`**
- **`await c.richMenu.get(richMenuId)`**
- **`await c.richMenu.list()`**
- **`await c.richMenu.del(richMenuId)`**

#### default

- **`await c.richMenu.default.get()`**
- **`await c.richMenu.default.set(richMenuId)`**
- **`await c.richMenu.default.cancel()`**

#### user

- **`await c.richMenu.user.get(userId?)`**
- **`await c.richMenu.user.link(richMenuId, userId?)`**
- **`await c.richMenu.user.unlink(userId?)`**

#### bulk

- **`await c.richMenu.bulk.link(request)`**
- **`await c.richMenu.bulk.unlink(request)`**

#### alias

- **`await c.richMenu.alias.create(request)`**
- **`await c.richMenu.alias.get(richMenuAliasId)`**
- **`await c.richMenu.alias.list()`**
- **`await c.richMenu.alias.update(richMenuAliasId, request)`**
- **`await c.richMenu.alias.del(richMenuAliasId)`**

#### batch

- **`await c.richMenu.batch.request(request)`**
- **`await c.richMenu.batch.progress(requestId)`**

### Membership

- **`await c.membership.list()`**
- **`await c.membership.subscription(userId?)`**
- **`await c.membership.joinedUsers(membershipId, start?, limit?)`**

### Show loading

- **`await c.showLoading(request)`**

### Mark as read

- **`await c.markAsRead(request)`**
- **`await c.markAsReadByToken(request)`**

## 公式クライアントへの逃げ道（最重要）

`linebot-hono` は「短く書けるショートハンド」を提供しますが、全APIを独自に再定義はしません。
不足分はいつでも **`c.client`（`@line/bot-sdk` の `MessagingApiClient`）** を直接呼び出せます。

```ts
await c.client.getBotInfo()
```

