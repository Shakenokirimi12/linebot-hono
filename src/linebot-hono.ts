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

const compose = <E extends Env, T extends WebhookEvent>(
  middlewares: Middleware<E, T>[],
  handler: LineHandler<E, T>,
): ((c: Context<E, T>, next?: Next) => Promise<void>) => {
  const fns: Middleware<E, T>[] = [
    ...middlewares,
    async (c, _next) => {
      await handler(c)
    },
  ]

  return async (c: Context<E, T>, next?: Next) => {
    let index = -1
    await dispatch(0)

    async function dispatch(i: number): Promise<void> {
      if (i <= index) {
        throw new Error('next() called multiple times')
      }
      index = i

      const fn = fns[i] || (i === fns.length && next) || undefined
      if (!fn) return
      await (fn as any)(c, () => dispatch(i + 1))
    }
  }
}

export class LineHono<E extends Env = Env> {
  #verify: Verify
  #line: (env: unknown) => LineEnv
  #http = new Hono()
  #handlers: Map<string, LineHandler<E, any>[]> = new Map()
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

  get http(): Hono {
    return this.#http
  }

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

  use(middleware: Middleware<E, any>): this
  use<T extends WebhookEvent['type']>(type: T, middleware: Middleware<E, Extract<WebhookEvent, { type: T }>>): this
  use(plugin: Plugin<E>): this
  use(arg1: any, arg2?: any): this {
    if (typeof arg1 === 'string' && typeof arg2 === 'function') {
      const type = arg1
      const middleware = arg2
      if (!this.#middlewaresByType.has(type)) this.#middlewaresByType.set(type, [])
      this.#middlewaresByType.get(type)?.push(middleware)
      return this
    }

    if (typeof arg1 === 'function' && arg2 === undefined) {
      const fn = arg1 as Function
      if (fn.length >= 2) {
        this.#middlewares.push(arg1 as Middleware<E, any>)
        return this
      }
      ;(arg1 as Plugin<E>)(this)
      return this
    }

    throw new Error('Invalid arguments for use()')
  }

  on<T extends WebhookEvent['type']>(type: T, handler: LineHandler<E, Extract<WebhookEvent, { type: T }>>): this {
    if (!this.#handlers.has(type)) {
      this.#handlers.set(type, [])
    }
    this.#handlers.get(type)?.push(handler)
    return this
  }

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
      return this.on('message', arg1)
    }

    const matcher = arg1
    const handler = arg2
    if (!handler) throw new Error('handler is required')

    return this.on('message', c => {
      if (this.#matchMessage(c.event, matcher)) return handler(c)
      return
    })
  }

  text(matcher: string | RegExp, handler: MessageHandler<E, 'text'>): this {
    return this.message(matcher, handler)
  }

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

    if (isTextMatcher(matcher)) {
      if (msg?.type !== 'text') return false
      const text = msg?.text
      if (typeof text !== 'string') return false
      return typeof matcher.value === 'string' ? text === matcher.value : matcher.value.test(text)
    }

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

    if (typeof matcher === 'string' || matcher instanceof RegExp) {
      if (msg?.type !== 'text') return false
      const text = msg?.text
      if (typeof text !== 'string') return false
      return typeof matcher === 'string' ? text === matcher : matcher.test(text)
    }

    const m = matcher as Record<string, unknown>
    if (typeof m['type'] !== 'string') return false
    if (msg?.type !== m['type']) return false

    for (const [k, v] of Object.entries(m)) {
      if (k === 'type') continue
      if (v === undefined) continue
      if (msg?.[k] !== v) return false
    }
    return true
  }

  unsend(handler: LineHandler<E, UnsendEvent>): this {
    return this.on('unsend', handler)
  }
  follow(handler: LineHandler<E, FollowEvent>): this {
    return this.on('follow', handler)
  }
  unfollow(handler: LineHandler<E, UnfollowEvent>): this {
    return this.on('unfollow', handler)
  }
  postback(handler: LineHandler<E, PostbackEvent>): this {
    return this.on('postback', handler)
  }
  join(handler: LineHandler<E, JoinEvent>): this {
    return this.on('join', handler)
  }
  leave(handler: LineHandler<E, LeaveEvent>): this {
    return this.on('leave', handler)
  }
  memberJoined(handler: LineHandler<E, MemberJoinEvent>): this {
    return this.on('memberJoined', handler)
  }
  memberLeft(handler: LineHandler<E, MemberLeaveEvent>): this {
    return this.on('memberLeft', handler)
  }
  beacon(handler: LineHandler<E, BeaconEvent>): this {
    return this.on('beacon', handler)
  }
  videoPlayComplete(handler: LineHandler<E, VideoPlayCompleteEvent>): this {
    return this.on('videoPlayComplete', handler)
  }
  accountLink(handler: LineHandler<E, AccountLinkEvent>): this {
    return this.on('accountLink', handler)
  }
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

    const promises = data.events.flatMap(event => {
      const handlers = this.#handlers.get(event.type) || []
      return handlers.map(async handler => {
        const c = new Context<E, typeof event>(env, executionCtx, line, event)
        const run = compose(this.#middlewaresFor(event.type) as any, handler as any)
        return run(c)
      })
    })

    if (executionCtx?.waitUntil) {
      executionCtx.waitUntil(Promise.all(promises))
    } else {
      await Promise.all(promises)
    }

    return new Response('OK')
  }

  fetch = async (request: Request, env?: E['Bindings'], executionCtx?: ExecutionContext): Promise<Response> => {
    const httpRes = await this.#http.fetch(request as any, env as any, executionCtx as any)
    if (request.method === 'GET' && httpRes.status === 404) {
      return new Response('Operational🔥')
    }
    return httpRes
  }
}
