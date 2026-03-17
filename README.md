# 🔥 LINE Hono [![npm v](https://img.shields.io/npm/v/line-hono)](https://www.npmjs.com/package/line-hono)

**This library enables you to easily build LINE bots on Cloudflare Workers**

This project is influenced by [Hono](https://github.com/honojs/hono).  
Thank you for [Yusuke Wada](https://github.com/yusukebe) and Hono contributors!

## Features

- **Intuitive API** - Influenced by Hono, offering a familiar and easy-to-use interface.
- **Flattened Context** - Call `c.text()`, `c.flex()`, etc., directly on the context.
- **Functional Flex API** - Zero-overhead, pure functions for building Flex messages.
- **JSX Support** - Use JSX markup to design complex Flex messages.
- **Lightweight** - Minimal dependencies, optimized for edge environments.
- **Type-Safe** - Native support for LINE Messaging API types.

## Install

```shell
npm i line-hono
```

## Docs

- [`docs/index.md`](./docs/index.md)

## Example Code

```ts
import { LineHono } from 'line-hono'

const app = new LineHono()

app.message('ping', (c) => c.text('pong'))

app.follow((c) => c.text('Thanks for following!'))

export default app
```

### Functional Flex Message

```ts
import { bubble, box, text } from 'line-hono'

app.message('flex', (c) => {
  return c.flex('Alt text', bubble({
    body: box('vertical', [
      text('Hello from line-hono!')
    ])
  }))
})
```

### JSX Flex Message (Optional)

```tsx
/** @jsx jsx */
/** @jsxFrag Fragment */
import { jsx } from 'line-hono/jsx'
import { Bubble, Box, Text } from 'line-hono/jsx'

app.message('jsx', (c) => {
  return c.flex('Alt text', (
    <Bubble>
      <Box layout="vertical">
        <Text>Hello from JSX!</Text>
      </Box>
    </Bubble>
  ))
})
```

## Environment Variables

- `LINE_CHANNEL_ACCESS_TOKEN`: Channel Access Token from LINE Developers Console
- `LINE_CHANNEL_SECRET`: Channel Secret from LINE Developers Console

## References

- [Hono](https://github.com/honojs/hono) - [MIT License](https://github.com/honojs/hono/blob/main/LICENSE)
- [LINE Messaging API Documentation](https://developers.line.biz/en/docs/messaging-api/)
