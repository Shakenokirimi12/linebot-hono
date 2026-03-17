import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'
import { LineHono } from './line-hono'
import * as Flex from './flex'

describe('LineHono', () => {
  const app = new LineHono()
  const env = { LINE_CHANNEL_SECRET: 'test_secret', LINE_CHANNEL_ACCESS_TOKEN: 'test_token' }
  const postRequest = (json: object): Request =>
    new Request('https://example.com', {
      method: 'POST',
      headers: { 'x-line-signature': 'test_signature' },
      body: JSON.stringify(json),
    })

  it('should return text for GET requests', async () => {
    const req = new Request('https://example.com', { method: 'GET' })
    const res = await app.fetch(req)
    expect(await res.text()).toBe('Operational🔥')
  })

  describe('fetch', () => {
    it('should return 401 for invalid signature', async () => {
      const verify = vi.fn().mockResolvedValue(false)
      const app = new LineHono({ verify })
      const req = postRequest({ events: [] })
      const res = await app.fetch(req, env)
      expect(res.status).toBe(401)
    })

    it('should route message event correctly', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      const handler = vi.fn()
      app.message(handler)

      const event = {
        type: 'message',
        message: { type: 'text', text: 'hello', id: '1' },
        replyToken: 'token',
        source: { type: 'user', userId: 'user1' },
        timestamp: 123,
        mode: 'active',
        webhookEventId: 'id1',
        deliveryContext: { isRedelivery: false },
      }

      const req = postRequest({ events: [event] })
      const res = await app.fetch(req, env)

      expect(res.status).toBe(200)
      expect(handler).toHaveBeenCalled()
      const c = handler.mock.calls[0]?.[0]
      expect(c.event.message.text).toBe('hello')
    })

    it('should handle follow event correctly', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      const handler = vi.fn()
      app.follow(handler)

      const event = {
        type: 'follow',
        replyToken: 'follow_token',
        source: { type: 'user', userId: 'user1' },
        timestamp: 123,
        mode: 'active',
        webhookEventId: 'id2',
        deliveryContext: { isRedelivery: false },
      }

      const req = postRequest({ events: [event] })
      await app.fetch(req, env)
      expect(handler).toHaveBeenCalled()
    })

    it('should provide fluent reply and push text methods', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      let handlerContext: any

      app.message(c => {
        handlerContext = c
        // We mock the underlying client to verify it gets called correctly
        // @ts-expect-error - overriding readonly for testing
        c._clientMock = vi.fn().mockResolvedValue({})
        Object.defineProperty(c, 'client', {
          get: () => ({
            // @ts-expect-error - injected mock
            replyMessage: c._clientMock,
            // @ts-expect-error - injected mock
            pushMessage: c._clientMock,
          }),
        })
      })

      const event = {
        type: 'message',
        message: { type: 'text', text: 'ping', id: '1' },
        replyToken: 'fluent_token',
        source: { type: 'user', userId: 'fluent_user' },
        timestamp: 123,
        mode: 'active',
        webhookEventId: 'id_fluent',
        deliveryContext: { isRedelivery: false },
      }

      const req = postRequest({ events: [event] })
      await app.fetch(req, env)

      // Test c.text() shorthand
      await handlerContext.text('hello shorthand')
      expect(handlerContext._clientMock).toHaveBeenCalledWith({
        replyToken: 'fluent_token',
        messages: [{ type: 'text', text: 'hello shorthand' }],
      })

      handlerContext._clientMock.mockClear()

      // Test c.push.text()
      await handlerContext.push.text('push shorthand')
      expect(handlerContext._clientMock).toHaveBeenCalledWith({
        to: 'fluent_user',
        messages: [{ type: 'text', text: 'push shorthand' }],
      })

      handlerContext._clientMock.mockClear()

      // Test c.flex() shorthand
      await handlerContext.flex('alt text', { type: 'bubble', body: { type: 'box', layout: 'vertical', contents: [] } })
      expect(handlerContext._clientMock).toHaveBeenCalledWith({
        replyToken: 'fluent_token',
        messages: [{ type: 'flex', altText: 'alt text', contents: { type: 'bubble', body: { type: 'box', layout: 'vertical', contents: [] } } }],
      })

      handlerContext._clientMock.mockClear()

      // Test c.reply.image()
      await handlerContext.reply.image('https://example.com/image.jpg')
      expect(handlerContext._clientMock).toHaveBeenCalledWith({
        replyToken: 'fluent_token',
        messages: [{ type: 'image', originalContentUrl: 'https://example.com/image.jpg', previewImageUrl: 'https://example.com/image.jpg' }],
      })

      handlerContext._clientMock.mockClear()

      // Test c.flex() with functional API (Hyperscript)
      await handlerContext.flex('functional flex', Flex.bubble({
        body: Flex.box('vertical', [
          Flex.text('hello from hyperscript')
        ])
      }))
      expect(handlerContext._clientMock).toHaveBeenCalledWith({
        replyToken: 'fluent_token',
        messages: [{
          type: 'flex',
          altText: 'functional flex',
          contents: {
            type: 'bubble',
            body: {
              type: 'box',
              layout: 'vertical',
              contents: [{ type: 'text', text: 'hello from hyperscript' }]
            }
          }
        }],
      })
    })
  })

  describe('hono integration', () => {
    it('should work with hono.mount', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const line = new LineHono({ verify })
      line.message(c => {
        return c.event.replyToken
      })

      const hono = new Hono()
      hono.mount('/webhook', line.fetch)

      const event = {
        type: 'message',
        message: { type: 'text', text: 'ping', id: '1' },
        replyToken: 'pong_token',
        source: { type: 'user', userId: 'user1' },
      }

      const req = new Request('http://localhost/webhook', {
        method: 'POST',
        headers: { 'x-line-signature': 'sig' },
        body: JSON.stringify({ events: [event] }),
      })

      const res = await hono.fetch(req, env)
      expect(res.status).toBe(200)
    })
  })
})
