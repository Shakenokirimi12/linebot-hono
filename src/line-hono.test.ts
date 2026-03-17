import { Hono } from 'hono'
import { describe, expect, it, vi } from 'vitest'
import * as Flex from './flex'
import { LineHono } from './line-hono'
import { match } from './match'
import { sticker } from './messages'

describe('LineHono', () => {
  const app = new LineHono()
  app.webhook('/')
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

  it('should allow non-webhook routes via app.http', async () => {
    const app = new LineHono()
    app.http.get('/health', c => c.text('ok'))
    const res = await app.fetch(new Request('https://example.com/health', { method: 'GET' }))
    expect(await res.text()).toBe('ok')
  })

  it('should handle webhook only on declared webhook path', async () => {
    const verify = vi.fn().mockResolvedValue(true)
    const app = new LineHono({ verify })
    app.webhook('/webhook')
    const handler = vi.fn()
    app.message(handler)

    const event = {
      type: 'message',
      message: { type: 'text', text: 'hello', id: '1' },
      replyToken: 'token',
      source: { type: 'user', userId: 'user1' },
      timestamp: 123,
      mode: 'active',
      webhookEventId: 'id_webhook_path',
      deliveryContext: { isRedelivery: false },
    }

    const reqWrong = new Request('https://example.com', {
      method: 'POST',
      headers: { 'x-line-signature': 'test_signature' },
      body: JSON.stringify({ events: [event] }),
    })
    const resWrong = await app.fetch(reqWrong, env)
    expect(resWrong.status).toBe(404)
    expect(handler).toHaveBeenCalledTimes(0)

    const reqOk = new Request('https://example.com/webhook', {
      method: 'POST',
      headers: { 'x-line-signature': 'test_signature' },
      body: JSON.stringify({ events: [event] }),
    })
    const resOk = await app.fetch(reqOk, env)
    expect(resOk.status).toBe(200)
    expect(handler).toHaveBeenCalledTimes(1)
  })

  describe('fetch', () => {
    it('should return 401 for invalid signature', async () => {
      const verify = vi.fn().mockResolvedValue(false)
      const app = new LineHono({ verify })
      app.webhook('/')
      const req = postRequest({ events: [] })
      const res = await app.fetch(req, env)
      expect(res.status).toBe(401)
    })

    it('should route message event correctly', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      app.webhook('/')
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

    it('should run global middleware in order', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      app.webhook('/')
      const calls: string[] = []

      app.use(async (_c, next) => {
        calls.push('mw1:before')
        await next()
        calls.push('mw1:after')
      })
      app.use(async (_c, next) => {
        calls.push('mw2:before')
        await next()
        calls.push('mw2:after')
      })

      app.message(() => {
        calls.push('handler')
      })

      const event = {
        type: 'message',
        message: { type: 'text', text: 'hello', id: 'm1' },
        replyToken: 'token',
        source: { type: 'user', userId: 'user1' },
        timestamp: 123,
        mode: 'active',
        webhookEventId: 'id_mw',
        deliveryContext: { isRedelivery: false },
      }

      await app.fetch(postRequest({ events: [event] }), env)
      expect(calls).toEqual(['mw1:before', 'mw2:before', 'handler', 'mw2:after', 'mw1:after'])
    })

    it('should run type-specific middleware only for that type', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      app.webhook('/')
      const calls: string[] = []

      app.use('message', async (_c, next) => {
        calls.push('message-mw')
        await next()
      })
      app.message(() => {
        calls.push('message-handler')
      })
      app.follow(() => {
        calls.push('follow-handler')
      })

      const messageEvent = {
        type: 'message',
        message: { type: 'text', text: 'hello', id: 'm2' },
        replyToken: 'token',
        source: { type: 'user', userId: 'user1' },
        timestamp: 123,
        mode: 'active',
        webhookEventId: 'id_message_mw',
        deliveryContext: { isRedelivery: false },
      }

      const followEvent = {
        type: 'follow',
        replyToken: 'follow_token',
        source: { type: 'user', userId: 'user1' },
        timestamp: 123,
        mode: 'active',
        webhookEventId: 'id_follow_mw',
        deliveryContext: { isRedelivery: false },
      }

      await app.fetch(postRequest({ events: [messageEvent, followEvent] }), env)
      expect(calls).toEqual(['message-mw', 'message-handler', 'follow-handler'])
    })

    it('should allow splitting handlers into files via app.use(plugin)', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      app.webhook('/')
      const handler = vi.fn()

      const plugin = (app: LineHono) => {
        app.message(handler)
      }

      app.use(plugin)

      const event = {
        type: 'message',
        message: { type: 'text', text: 'hello', id: 'm3' },
        replyToken: 'token',
        source: { type: 'user', userId: 'user1' },
        timestamp: 123,
        mode: 'active',
        webhookEventId: 'id_plugin',
        deliveryContext: { isRedelivery: false },
      }

      await app.fetch(postRequest({ events: [event] }), env)
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should support app.text sugar', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      app.webhook('/')
      const handler = vi.fn()
      app.text('ping', handler)

      const event = {
        type: 'message',
        message: { type: 'text', text: 'ping', id: '1' },
        replyToken: 'token',
        source: { type: 'user', userId: 'user1' },
        timestamp: 123,
        mode: 'active',
        webhookEventId: 'id_text_sugar',
        deliveryContext: { isRedelivery: false },
      }

      await app.fetch(postRequest({ events: [event] }), env)
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should support app.sticker sugar', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      app.webhook('/')
      const handler = vi.fn()
      app.sticker('1', '2', handler)

      const event = {
        type: 'message',
        message: { type: 'sticker', packageId: '1', stickerId: '2', stickerResourceType: 'STATIC', id: 's_sugar' },
        replyToken: 'token',
        source: { type: 'user', userId: 'user1' },
        timestamp: 123,
        mode: 'active',
        webhookEventId: 'id_sticker_sugar',
        deliveryContext: { isRedelivery: false },
      }

      await app.fetch(postRequest({ events: [event] }), env)
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should match message text when first arg is not a function', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      app.webhook('/')
      const handler = vi.fn()
      app.message('ping', handler)

      const pingEvent = {
        type: 'message',
        message: { type: 'text', text: 'ping', id: '1' },
        replyToken: 'token',
        source: { type: 'user', userId: 'user1' },
        timestamp: 123,
        mode: 'active',
        webhookEventId: 'id_match',
        deliveryContext: { isRedelivery: false },
      }
      const pongEvent = {
        ...pingEvent,
        webhookEventId: 'id_no_match',
        message: { type: 'text', text: 'pong', id: '2' },
      }

      await app.fetch(postRequest({ events: [pingEvent] }), env)
      await app.fetch(postRequest({ events: [pongEvent] }), env)

      expect(handler).toHaveBeenCalledTimes(1)
      expect(handler.mock.calls[0]?.[0].event.message.text).toBe('ping')
    })

    it('should match sticker message when first arg is a matcher object', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      app.webhook('/')
      const handler = vi.fn()
      app.message({ type: 'sticker', packageId: '1', stickerId: '2' }, handler)

      const event = {
        type: 'message',
        message: { type: 'sticker', packageId: '1', stickerId: '2', stickerResourceType: 'STATIC', id: 's1' },
        replyToken: 'token',
        source: { type: 'user', userId: 'user1' },
        timestamp: 123,
        mode: 'active',
        webhookEventId: 'id_sticker',
        deliveryContext: { isRedelivery: false },
      }

      await app.fetch(postRequest({ events: [event] }), env)
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should match sticker message using stickerMessage helper', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      app.webhook('/')
      const handler = vi.fn()
      app.message(sticker('1', '2') as any, handler)

      const event = {
        type: 'message',
        message: { type: 'sticker', packageId: '1', stickerId: '2', stickerResourceType: 'STATIC', id: 's2' },
        replyToken: 'token',
        source: { type: 'user', userId: 'user1' },
        timestamp: 123,
        mode: 'active',
        webhookEventId: 'id_sticker2',
        deliveryContext: { isRedelivery: false },
      }

      await app.fetch(postRequest({ events: [event] }), env)
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should narrow types when using typed matchers', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      app.webhook('/')

      app.message(match.sticker('1', '2'), c => {
        // type-level assertion: sticker events have packageId/stickerId
        c.event.message.packageId
        c.event.message.stickerId
        // @ts-expect-error text does not exist on sticker message
        const _shouldError: string = c.event.message.text
        void _shouldError
      })

      const event = {
        type: 'message',
        message: { type: 'sticker', packageId: '1', stickerId: '2', stickerResourceType: 'STATIC', id: 's3' },
        replyToken: 'token',
        source: { type: 'user', userId: 'user1' },
        timestamp: 123,
        mode: 'active',
        webhookEventId: 'id_sticker3',
        deliveryContext: { isRedelivery: false },
      }

      await app.fetch(postRequest({ events: [event] }), env)
    })

    it('should match text using match.text(RegExp)', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      app.webhook('/')
      const handler = vi.fn()
      app.message(match.text(/hello/i) as any, handler)

      const event = {
        type: 'message',
        message: { type: 'text', text: 'HeLLo', id: 't1' },
        replyToken: 'token',
        source: { type: 'user', userId: 'user1' },
        timestamp: 123,
        mode: 'active',
        webhookEventId: 'id_text_regex_matcher',
        deliveryContext: { isRedelivery: false },
      }

      await app.fetch(postRequest({ events: [event] }), env)
      expect(handler).toHaveBeenCalledTimes(1)
    })

    it('should handle follow event correctly', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      app.webhook('/')
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
      app.webhook('/')
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
            // @ts-expect-error - injected mock
            broadcast: c._clientMock,
            // @ts-expect-error - injected mock
            multicast: c._clientMock,
            // @ts-expect-error - injected mock
            narrowcast: c._clientMock,
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

      // Test c.push.coupon()
      await handlerContext.push.coupon('coupon_1')
      expect(handlerContext._clientMock).toHaveBeenCalledWith({
        to: 'fluent_user',
        messages: [{ type: 'coupon', couponId: 'coupon_1' }],
      })

      handlerContext._clientMock.mockClear()

      // Test c.broadcast.text()
      await handlerContext.broadcast.text('broadcast hello')
      expect(handlerContext._clientMock).toHaveBeenCalledWith(
        { messages: [{ type: 'text', text: 'broadcast hello' }] },
        undefined,
      )

      handlerContext._clientMock.mockClear()

      await handlerContext.broadcast.text('broadcast hello', { notificationDisabled: true, retryKey: 'rk' })
      expect(handlerContext._clientMock).toHaveBeenCalledWith(
        { messages: [{ type: 'text', text: 'broadcast hello' }], notificationDisabled: true },
        'rk',
      )

      handlerContext._clientMock.mockClear()

      // Test c.multicast.to(...).text()
      await handlerContext.multicast.to(['u1', 'u2']).text('multicast hello', { retryKey: 'rk2' })
      expect(handlerContext._clientMock).toHaveBeenCalledWith(
        { to: ['u1', 'u2'], messages: [{ type: 'text', text: 'multicast hello' }] },
        'rk2',
      )

      handlerContext._clientMock.mockClear()

      // Test c.narrowcast.text()
      await handlerContext.narrowcast.text('narrowcast hello', {
        recipient: { type: 'audience', audienceGroupId: 1 },
        retryKey: 'rk3',
      })
      expect(handlerContext._clientMock).toHaveBeenCalledWith(
        { messages: [{ type: 'text', text: 'narrowcast hello' }], recipient: { type: 'audience', audienceGroupId: 1 } },
        'rk3',
      )

      handlerContext._clientMock.mockClear()

      // Test c.flex() shorthand
      await handlerContext.flex('alt text', { type: 'bubble', body: { type: 'box', layout: 'vertical', contents: [] } })
      expect(handlerContext._clientMock).toHaveBeenCalledWith({
        replyToken: 'fluent_token',
        messages: [
          {
            type: 'flex',
            altText: 'alt text',
            contents: { type: 'bubble', body: { type: 'box', layout: 'vertical', contents: [] } },
          },
        ],
      })

      handlerContext._clientMock.mockClear()

      // Test c.reply.image()
      await handlerContext.reply.image('https://example.com/image.jpg')
      expect(handlerContext._clientMock).toHaveBeenCalledWith({
        replyToken: 'fluent_token',
        messages: [
          {
            type: 'image',
            originalContentUrl: 'https://example.com/image.jpg',
            previewImageUrl: 'https://example.com/image.jpg',
          },
        ],
      })

      handlerContext._clientMock.mockClear()

      // Test c.flex() with functional API (Hyperscript)
      await handlerContext.flex(
        'functional flex',
        Flex.bubble({
          body: Flex.box('vertical', [Flex.text('hello from hyperscript')]),
        }),
      )
      expect(handlerContext._clientMock).toHaveBeenCalledWith({
        replyToken: 'fluent_token',
        messages: [
          {
            type: 'flex',
            altText: 'functional flex',
            contents: {
              type: 'bubble',
              body: {
                type: 'box',
                layout: 'vertical',
                contents: [{ type: 'text', text: 'hello from hyperscript' }],
              },
            },
          },
        ],
      })
    })

    it('should support coupon create builder method chain', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      app.webhook('/')
      let handlerContext: any

      app.message(c => {
        handlerContext = c
        ;(c as any)._clientMock = {
          createCoupon: vi.fn().mockResolvedValue({ couponId: 'C1' }),
        }
        Object.defineProperty(c, 'client', {
          get: () => (c as any)._clientMock,
        })
      })

      const event = {
        type: 'message',
        message: { type: 'text', text: 'ping', id: '1' },
        replyToken: 'coupon_builder_token',
        source: { type: 'user', userId: 'user1' },
        timestamp: 123,
        mode: 'active',
        webhookEventId: 'id_coupon_builder',
        deliveryContext: { isRedelivery: false },
      }

      await app.fetch(postRequest({ events: [event] }), env)

      const res = await handlerContext.coupon
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

      expect(res.couponId).toBe('C1')
      expect(handlerContext._clientMock.createCoupon).toHaveBeenCalledTimes(1)
      const [request] = handlerContext._clientMock.createCoupon.mock.calls[0] || []
      expect(request.title).toBe('Friends-only coupon')
      expect(request.reward.type).toBe('discount')
      expect(request.reward.priceInfo.type).toBe('fixed')
      expect(request.reward.priceInfo.fixedAmount).toBe(100)
      expect(request.acquisitionCondition.type).toBe('normal')
    })

    it('should provide canReply/canPush and replyIfPossible/pushIfPossible', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      app.webhook('/')
      let handlerContext: any

      app.message(c => {
        handlerContext = c
        Object.defineProperty(c, 'client', {
          get: () => ({
            replyMessage: vi.fn().mockResolvedValue({ ok: true }),
            pushMessage: vi.fn().mockResolvedValue({ ok: true }),
          }),
        })
      })

      const event = {
        type: 'message',
        message: { type: 'text', text: 'ping', id: '1' },
        replyToken: 'token',
        source: { type: 'user', userId: 'user1' },
        timestamp: 123,
        mode: 'active',
        webhookEventId: 'id_can_reply_push',
        deliveryContext: { isRedelivery: false },
      }

      await app.fetch(postRequest({ events: [event] }), env)

      expect(handlerContext.canReply).toBe(true)
      expect(handlerContext.canPush).toBe(true)
      await handlerContext.replyIfPossible.text('ok')
      await handlerContext.pushIfPossible.text('ok')
    })

    it('should route unsend event correctly', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const app = new LineHono({ verify })
      app.webhook('/')
      const handler = vi.fn()
      app.unsend(handler)

      const event = {
        type: 'unsend',
        unsend: { messageId: 'mid' },
        source: { type: 'group', groupId: 'g1', userId: 'u1' },
        timestamp: 123,
        mode: 'active',
        webhookEventId: 'id_unsend',
        deliveryContext: { isRedelivery: false },
      }

      const req = postRequest({ events: [event] })
      const res = await app.fetch(req, env)

      expect(res.status).toBe(200)
      expect(handler).toHaveBeenCalled()
      const c = handler.mock.calls[0]?.[0]
      expect(c.event.unsend.messageId).toBe('mid')
    })
  })

  describe('hono integration', () => {
    it('should work with hono.mount', async () => {
      const verify = vi.fn().mockResolvedValue(true)
      const line = new LineHono({ verify })
      line.webhook('/')
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
