import type {
  BeaconEvent,
  FollowEvent,
  JoinEvent,
  LeaveEvent,
  MessageEvent,
  PostbackEvent,
  UnfollowEvent,
  WebhookEvent,
  WebhookRequestBody,
} from '@line/bot-sdk'
import { Context } from './context'
import type { Env, ExecutionContext, InitOptions, LineEnv, Verify } from './types'
import { newError } from './utils'
import { verify } from './verify'

type LineHandler<E extends Env, T extends WebhookEvent = any> = (c: Context<E, T>) => Promise<unknown> | unknown

export class LineHono<E extends Env = Env> {
  #verify: Verify
  #line: (env: unknown) => LineEnv
  #handlers: Map<string, LineHandler<E, any>[]> = new Map()
  #commands: Map<string, Function> = new Map()
  #components: Map<string, Function> = new Map()
  #modals: Map<string, Function> = new Map()
  #crons: Map<string, Function> = new Map()

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
   * Register a handler for a specific LINE event type.
   * @param type Event type (e.g., 'message', 'follow', 'postback')
   * @param handler Handler function
   */
  on<T extends WebhookEvent['type']>(type: T, handler: LineHandler<E, Extract<WebhookEvent, { type: T }>>): this {
    if (!this.#handlers.has(type)) {
      this.#handlers.set(type, [])
    }
    this.#handlers.get(type)?.push(handler)
    return this
  }

  /**
   * Register a handler for 'message' events.
   */
  message(handler: LineHandler<E, MessageEvent>): this {
    return this.on('message', handler)
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
   * Register a handler for 'beacon' events.
   */
  beacon(handler: LineHandler<E, BeaconEvent>): this {
    return this.on('beacon', handler)
  }

  /**
   * Register high-level handlers from a factory.
   */
  loader(handlers: any[]): void {
    for (const h of handlers) {
      if (h.type === 'command') this.command(h.command.name, h.handler)
      else if (h.type === 'component') this.component(h.component.id, h.handler)
      else if (h.type === 'modal') this.modal(h.modal.id, h.handler)
      else if (h.type === 'cron') this.cron(h.cron, h.handler)
      else throw new Error(`Unknown handler type: ${JSON.stringify(h)}`)
    }
  }

  command(name: string, handler: Function): this {
    this.#commands.set(name, handler)
    return this
  }

  component(id: string, handler: Function): this {
    this.#components.set(id, handler)
    return this
  }

  modal(id: string, handler: Function): this {
    this.#modals.set(id, handler)
    return this
  }

  cron(expression: string, handler: Function): this {
    this.#crons.set(expression, handler)
    return this
  }

  fetch = async (request: Request, env?: E['Bindings'], executionCtx?: ExecutionContext): Promise<Response> => {
    if (request.method === 'GET') {
      return new Response('Operational🔥')
    }

    if (request.method !== 'POST') {
      return new Response('Not Found', { status: 404 })
    }

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
        return handler(c)
      })
    })

    if (executionCtx?.waitUntil) {
      executionCtx.waitUntil(Promise.all(promises))
    } else {
      await Promise.all(promises)
    }

    return new Response('OK')
  }
}
