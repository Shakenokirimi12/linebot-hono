import type {
  AccountLinkEvent,
  BeaconEvent,
  DeliveryEvent,
  EventMessage,
  FollowEvent,
  JoinEvent,
  LeaveEvent,
  MemberJoinEvent,
  MemberLeaveEvent,
  MessageEvent,
  PostbackEvent,
  UnfollowEvent,
  UnsendEvent,
  VideoPlayCompleteEvent,
  WebhookEvent,
  WebhookRequestBody,
} from '@line/bot-sdk'
import { Hono } from 'hono'
import { Context } from './context'
import { isMatcher, isTextMatcher, type Matcher, type MessageEventOf, type TextMatcher } from './match'
import type { Env, ExecutionContext, InitOptions, LineEnv, Verify } from './types'
import { newError } from './utils'
import { verify } from './verify'

type LineHandler<E extends Env, T extends WebhookEvent = any> = (c: Context<E, T>) => Promise<unknown> | unknown
type Next = () => Promise<void>
type Middleware<E extends Env, T extends WebhookEvent = any> = (
  c: Context<E, T>,
  next: Next,
) => Promise<unknown> | unknown
type Plugin<E extends Env> = (app: LineHono<E>) => void
type MessageMatcher = string | RegExp | TextMatcher | Matcher | Record<string, unknown>
type MessageHandler<E extends Env, T extends EventMessage['type']> = LineHandler<E, MessageEventOf<T>>

type InternalHandler<E extends Env, T extends WebhookEvent = any> = (c: Context<E, T>) => Promise<boolean> | boolean

const runWithMiddleware = async <E extends Env, T extends WebhookEvent>(
  c: Context<E, T>,
  middlewares: Middleware<E, T>[],
  handler: InternalHandler<E, T>,
): Promise<boolean> => {
  let index = -1
  let handled = false

  const dispatch = async (i: number): Promise<void> => {
    if (i <= index) throw new Error('next() called multiple times')
    index = i

    const fn = middlewares[i]
    if (fn) {
      await fn(c, () => dispatch(i + 1))
      return
    }
    handled = await handler(c)
  }

  await dispatch(0)
  return handled
}

export class LineHono<E extends Env = Env> {
  #verify: Verify
  #line: (env: unknown) => LineEnv
  #http = new Hono()
  #handlers: Map<string, InternalHandler<E, any>[]> = new Map()
  #middlewares: Middleware<E, any>[] = []
  #middlewaresByType: Map<string, Middleware<E, any>[]> = new Map()

  constructor(options?: InitOptions<E>) {
    this.#verify = options?.verify ?? verify
    this.#line = (env: unknown): LineEnv => {
      const lineEnv = options?.lineEnv ? options.lineEnv(env as E['Bindings']) : {}
      const bindings = (env || {}) as Record<string, string | undefined>
      return {
        CHANNEL_SECRET: lineEnv.CHANNEL_SECRET || bindings['LINE_CHANNEL_SECRET'],
        CHANNEL_ACCESS_TOKEN: lineEnv.CHANNEL_ACCESS_TOKEN || bindings['LINE_CHANNEL_ACCESS_TOKEN'],
      }
    }
  }

  /**
   * Underlying Hono app for non-webhook routes.
   *
   * This is useful for health checks, extra endpoints, and HTTP middleware.
   */
  get http(): Hono {
    return this.#http
  }

  /**
   * Declare a webhook endpoint path (Hono-style).
   *
   * Example:
   * - `app.webhook('/webhook')`
   */
  webhook(path: string): this {
    this.#http.post(path, async (hc: any) => {
      const req = hc.req.raw as Request
      const env = hc.env as E['Bindings']
      let executionCtx: ExecutionContext | undefined
      try {
        executionCtx = hc.executionCtx as ExecutionContext | undefined
      } catch {
        executionCtx = undefined
      }
      return await this.#handleWebhook(req, env, executionCtx)
    })
    return this
  }

  /**
   * Register middleware or apply a plugin.
   *
   * Middleware:
   * - `app.use(async (c, next) => { ...; await next(); ... })`
   * - `app.use('message', async (c, next) => { ... })`
   *
   * Plugin (for splitting into files):
   * - `app.use(app => { app.message(...); app.follow(...); })`
   */
  use(middleware: Middleware<E, any>): this
  use<T extends WebhookEvent['type']>(type: T, middleware: Middleware<E, Extract<WebhookEvent, { type: T }>>): this
  use(plugin: Plugin<E>): this
  use(arg1: any, arg2?: any): this {
    // use(type, middleware)
    if (typeof arg1 === 'string' && typeof arg2 === 'function') {
      const type = arg1
      const middleware = arg2
      if (!this.#middlewaresByType.has(type)) this.#middlewaresByType.set(type, [])
      this.#middlewaresByType.get(type)?.push(middleware)
      return this
    }

    // use(fn)
    if (typeof arg1 === 'function' && arg2 === undefined) {
      const fn = arg1 as Function

      // middleware must be (c, next) => ...
      if (fn.length >= 2) {
        this.#middlewares.push(arg1 as Middleware<E, any>)
        return this
      }
      // plugin: (app) => void
      ;(arg1 as Plugin<E>)(this)
      return this
    }

    throw new Error('Invalid arguments for use()')
  }

  /**
   * Register a handler for a specific LINE event type.
   * @param type Event type (e.g., 'message', 'follow', 'postback')
   * @param handler Handler function
   */
  on<T extends WebhookEvent['type']>(type: T, handler: LineHandler<E, Extract<WebhookEvent, { type: T }>>): this {
    if (!this.#handlers.has(type)) {
      this.#handlers.set(type, [])
    }
    this.#handlers.get(type)?.push(async c => {
      await handler(c)
      return false
    })
    return this
  }

  /**
   * Register a handler for 'message' events.
   */
  message(handler: LineHandler<E, MessageEvent>): this
  message(matcher: string | RegExp, handler: MessageHandler<E, 'text'>): this
  message(matcher: Matcher<'text'>, handler: MessageHandler<E, 'text'>): this
  message(matcher: TextMatcher, handler: MessageHandler<E, 'text'>): this
  message(matcher: Matcher<'sticker'>, handler: MessageHandler<E, 'sticker'>): this
  message(matcher: Matcher<'image'>, handler: MessageHandler<E, 'image'>): this
  message(matcher: Matcher<'video'>, handler: MessageHandler<E, 'video'>): this
  message(matcher: Matcher<'audio'>, handler: MessageHandler<E, 'audio'>): this
  message(matcher: Matcher<'file'>, handler: MessageHandler<E, 'file'>): this
  message(matcher: Matcher<'location'>, handler: MessageHandler<E, 'location'>): this
  message(matcher: MessageMatcher, handler: LineHandler<E, MessageEvent>): this
  message(arg1: MessageMatcher | LineHandler<E, MessageEvent>, arg2?: LineHandler<E, any>): this {
    if (typeof arg1 === 'function') {
      return this.message({ type: 'text', value: undefined } as any, arg1 as any)
    }

    const matcher = arg1
    const handler = arg2
    if (!handler) throw new Error('handler is required')

    if (!this.#handlers.has('message')) this.#handlers.set('message', [])
    this.#handlers.get('message')?.push(async c => {
      if (!this.#matchMessage(c.event, matcher)) return false
      await handler(c)
      return true
    })
    return this
  }

  /**
   * Text message sugar.
   *
   * Usage:
   * - `app.text('ping', c => c.reply.text('pong'))`
   * - `app.text(/ping/i, c => c.reply.text('pong'))`
   */
  text(matcher: string | RegExp, handler: MessageHandler<E, 'text'>): this {
    return this.message(matcher, handler)
  }

  /**
   * Sticker message sugar.
   *
   * Usage:
   * - `app.sticker('1', '2', c => c.reply.text('nice'))`
   * - `app.sticker(undefined, '2', handler)` (match only stickerId)
   */
  sticker(packageId: string | undefined, stickerId: string | undefined, handler: MessageHandler<E, 'sticker'>): this {
    return this.message({ type: 'sticker', packageId, stickerId } as any, handler)
  }

  image(handler: MessageHandler<E, 'image'>): this {
    return this.message({ type: 'image' } as any, handler)
  }

  video(handler: MessageHandler<E, 'video'>): this {
    return this.message({ type: 'video' } as any, handler)
  }

  audio(handler: MessageHandler<E, 'audio'>): this {
    return this.message({ type: 'audio' } as any, handler)
  }

  file(handler: MessageHandler<E, 'file'>): this {
    return this.message({ type: 'file' } as any, handler)
  }

  location(handler: MessageHandler<E, 'location'>): this {
    return this.message({ type: 'location' } as any, handler)
  }

  #matchMessage(event: MessageEvent, matcher: MessageMatcher): boolean {
    const msg = event.message as any

    // match.text(...) (always returns a matcher)
    if (isTextMatcher(matcher)) {
      if (msg?.type !== 'text') return false
      const text = msg?.text
      if (typeof text !== 'string') return false
      if (!matcher.value) return true
      return typeof matcher.value === 'string' ? text === matcher.value : matcher.value.test(text)
    }

    // typed matcher (preferred)
    if (isMatcher(matcher)) {
      if (msg?.type !== matcher.type) return false
      if (matcher.where) {
        for (const [k, v] of Object.entries(matcher.where as any)) {
          if (v === undefined) continue
          if (msg?.[k] !== v) return false
        }
      }
      return true
    }

    // text message match
    if (typeof matcher === 'string' || matcher instanceof RegExp) {
      if (msg?.type !== 'text') return false
      const text = msg?.text
      if (typeof text !== 'string') return false
      return typeof matcher === 'string' ? text === matcher : matcher.test(text)
    }

    // message object match (same shape as `c.push({ ... })`)
    const m = matcher as Record<string, unknown>
    if (typeof m['type'] !== 'string') return false
    if (msg?.type !== m['type']) return false

    // match only provided keys (excluding "type")
    for (const [k, v] of Object.entries(m)) {
      if (k === 'type') continue
      if (v === undefined) continue
      if (msg?.[k] !== v) return false
    }
    return true
  }

  /**
   * Register a handler for 'unsend' events.
   */
  unsend(handler: LineHandler<E, UnsendEvent>): this {
    return this.on('unsend', handler)
  }

  /**
   * Register a handler for 'follow' events.
   */
  follow(handler: LineHandler<E, FollowEvent>): this {
    return this.on('follow', handler)
  }

  /**
   * Register a handler for 'unfollow' events.
   */
  unfollow(handler: LineHandler<E, UnfollowEvent>): this {
    return this.on('unfollow', handler)
  }

  /**
   * Register a handler for 'postback' events.
   */
  postback(handler: LineHandler<E, PostbackEvent>): this {
    return this.on('postback', handler)
  }

  /**
   * Register a handler for 'join' events.
   */
  join(handler: LineHandler<E, JoinEvent>): this {
    return this.on('join', handler)
  }

  /**
   * Register a handler for 'leave' events.
   */
  leave(handler: LineHandler<E, LeaveEvent>): this {
    return this.on('leave', handler)
  }

  /**
   * Register a handler for 'memberJoined' events.
   */
  memberJoined(handler: LineHandler<E, MemberJoinEvent>): this {
    return this.on('memberJoined', handler)
  }

  /**
   * Register a handler for 'memberLeft' events.
   */
  memberLeft(handler: LineHandler<E, MemberLeaveEvent>): this {
    return this.on('memberLeft', handler)
  }

  /**
   * Register a handler for 'beacon' events.
   */
  beacon(handler: LineHandler<E, BeaconEvent>): this {
    return this.on('beacon', handler)
  }

  /**
   * Register a handler for 'videoPlayComplete' events.
   */
  videoPlayComplete(handler: LineHandler<E, VideoPlayCompleteEvent>): this {
    return this.on('videoPlayComplete', handler)
  }

  /**
   * Register a handler for 'accountLink' events.
   */
  accountLink(handler: LineHandler<E, AccountLinkEvent>): this {
    return this.on('accountLink', handler)
  }

  /**
   * Register a handler for 'delivery' events.
   */
  delivery(handler: LineHandler<E, DeliveryEvent>): this {
    return this.on('delivery', handler)
  }

  #middlewaresFor(type: WebhookEvent['type']): Middleware<E, any>[] {
    return [...this.#middlewares, ...(this.#middlewaresByType.get(type) || [])]
  }

  async #handleWebhook(request: Request, env?: E['Bindings'], executionCtx?: ExecutionContext): Promise<Response> {
    const line = this.#line(env)
    if (!line.CHANNEL_SECRET) throw newError('LineHono', 'LINE_CHANNEL_SECRET')

    const body = await request.text()
    const signature = request.headers.get('x-line-signature')

    if (!(await this.#verify(body, signature, line.CHANNEL_SECRET))) {
      return new Response('Unauthorized', { status: 401 })
    }

    const data: WebhookRequestBody = JSON.parse(body)

    const promises = data.events.map(async event => {
      const handlers = this.#handlers.get(event.type) || []
      const c = new Context<E, typeof event>(env, executionCtx, line, event)
      const middlewares = this.#middlewaresFor(event.type) as any

      if (event.type === 'message') {
        for (const h of handlers) {
          const handled = await runWithMiddleware(c as any, middlewares, h as any)
          if (handled) break
        }
        return
      }

      for (const h of handlers) {
        await runWithMiddleware(c as any, middlewares, h as any)
      }
    })

    if (executionCtx?.waitUntil) executionCtx.waitUntil(Promise.all(promises))
    else await Promise.all(promises)

    return new Response('OK')
  }

  fetch = async (request: Request, env?: E['Bindings'], executionCtx?: ExecutionContext): Promise<Response> => {
    const httpRes = await this.#http.fetch(request as any, env as any, executionCtx as any)

    // Preserve historical default for GET when no routes are defined.
    if (request.method === 'GET' && httpRes.status === 404) {
      return new Response('Operational🔥')
    }
    return httpRes
  }
}
