import { messagingApi } from '@line/bot-sdk'
import type { Env, ExecutionContext, LineEnv, WebhookEvent } from './types'

export type MessageSender<R> = {
  (messages: messagingApi.Message | messagingApi.Message[]): Promise<R>
  text: (text: string) => Promise<R>
  image: (url: string, previewUrl?: string) => Promise<R>
  video: (url: string, previewUrl: string) => Promise<R>
  audio: (url: string, duration: number) => Promise<R>
  location: (title: string, address: string, lat: number, lon: number) => Promise<R>
  sticker: (packageId: string, stickerId: string) => Promise<R>
  flex: (altText: string, contents: messagingApi.FlexContainer) => Promise<R>
  template: (altText: string, template: messagingApi.Template) => Promise<R>
}
export class Context<E extends Env = any, T extends WebhookEvent = any> {
  #env: E['Bindings']
  #executionCtx: ExecutionContext | undefined
  #line: LineEnv
  #event: T
  #var = new Map()
  #client: messagingApi.MessagingApiClient | undefined

  constructor(env: E['Bindings'] | undefined, executionCtx: ExecutionContext | undefined, line: LineEnv, event: T) {
    this.#env = env as E['Bindings']
    this.#executionCtx = executionCtx
    this.#line = line
    this.#event = event
  }

  /**
   * Environment Variables
   */
  get env(): E['Bindings'] {
    return this.#env
  }

  /**
   * Execution Context (for cloudflare workers, etc.)
   */
  get executionCtx(): ExecutionContext {
    return this.#executionCtx!
  }

  /**
   * The raw LINE Webhook Event object.
   */
  get event(): T {
    return this.#event
  }

  /**
   * ID of the user who sent the event.
   */
  get userId(): string | undefined {
    return 'source' in this.#event && this.#event.source && 'userId' in this.#event.source
      ? this.#event.source.userId
      : undefined
  }

  /**
   * ID of the group where the event occurred.
   */
  get groupId(): string | undefined {
    return 'source' in this.#event && this.#event.source && 'groupId' in this.#event.source
      ? this.#event.source.groupId
      : undefined
  }

  /**
   * ID of the room where the event occurred.
   */
  get roomId(): string | undefined {
    return 'source' in this.#event && this.#event.source && 'roomId' in this.#event.source
      ? this.#event.source.roomId
      : undefined
  }

  /**
   * Set a variable in the context.
   */
  set<Key extends keyof E['Variables']>(key: Key, value: E['Variables'][Key]): void {
    this.#var.set(key, value)
  }

  /**
   * Get a variable from the context.
   */
  get<Key extends keyof E['Variables']>(key: Key): E['Variables'][Key] {
    return this.#var.get(key)
  }

  /**
   * All variables in the context.
   */
  get var(): E['Variables'] {
    return Object.fromEntries(this.#var) as E['Variables']
  }

  /**
   * Official @line/bot-sdk MessagingApiClient instance.
   */
  get client(): messagingApi.MessagingApiClient {
    if (!this.#client) {
      if (!this.#line.CHANNEL_ACCESS_TOKEN) {
        throw new Error('CHANNEL_ACCESS_TOKEN is required to initialize the LINE API client.')
      }
      this.#client = new messagingApi.MessagingApiClient({
        channelAccessToken: this.#line.CHANNEL_ACCESS_TOKEN,
      })
    }
    return this.#client
  }

  /**
   * Reply to the current event.
   * Usage: `c.reply(messages)` or `c.reply.text('Hello')`
   */
  /*
   * Aliases for reply methods
   */
  get text() {
    return this.reply.text
  }
  get image() {
    return this.reply.image
  }
  get video() {
    return this.reply.video
  }
  get audio() {
    return this.reply.audio
  }
  get location() {
    return this.reply.location
  }
  get sticker() {
    return this.reply.sticker
  }
  get flex() {
    return this.reply.flex
  }
  get template() {
    return this.reply.template
  }

  get reply(): MessageSender<messagingApi.ReplyMessageResponse> {
    const fn = async (
      messages: messagingApi.Message | messagingApi.Message[],
    ): Promise<messagingApi.ReplyMessageResponse> => {
      if ('replyToken' in this.#event) {
        const replyToken = (this.#event as any).replyToken
        if (typeof replyToken === 'string') {
          return this.client.replyMessage({
            replyToken,
            messages: Array.isArray(messages) ? messages : [messages],
          })
        }
      }
      throw new Error('This event does not support reply')
    }

    fn.text = (text: string) => fn({ type: 'text', text })
    fn.image = (url: string, previewUrl?: string) => fn({ type: 'image', originalContentUrl: url, previewImageUrl: previewUrl || url })
    fn.video = (url: string, previewUrl: string) => fn({ type: 'video', originalContentUrl: url, previewImageUrl: previewUrl })
    fn.audio = (url: string, duration: number) => fn({ type: 'audio', originalContentUrl: url, duration })
    fn.location = (title: string, address: string, lat: number, lon: number) => fn({ type: 'location', title, address, latitude: lat, longitude: lon })
    fn.sticker = (packageId: string, stickerId: string) => fn({ type: 'sticker', packageId, stickerId })
    fn.flex = (altText: string, contents: messagingApi.FlexContainer) => {
      return fn({ type: 'flex', altText, contents })
    }
    fn.template = (altText: string, template: messagingApi.Template) => fn({ type: 'template', altText, template })
    return fn
  }

  /**
   * Send a push message to the current source (user, group, or room).
   * Usage: `c.push(messages)` or `c.push.text('Hello')`
   */
  get push(): MessageSender<messagingApi.PushMessageResponse> {
    const fn = async (
      messages: messagingApi.Message | messagingApi.Message[],
    ): Promise<messagingApi.PushMessageResponse> => {
      const to = this.userId || this.groupId || this.roomId
      if (!to) throw new Error('No destination found for push')
      return this.client.pushMessage({
        to,
        messages: Array.isArray(messages) ? messages : [messages],
      })
    }

    fn.text = (text: string) => fn({ type: 'text', text })
    fn.image = (url: string, previewUrl?: string) => fn({ type: 'image', originalContentUrl: url, previewImageUrl: previewUrl || url })
    fn.video = (url: string, previewUrl: string) => fn({ type: 'video', originalContentUrl: url, previewImageUrl: previewUrl })
    fn.audio = (url: string, duration: number) => fn({ type: 'audio', originalContentUrl: url, duration })
    fn.location = (title: string, address: string, lat: number, lon: number) => fn({ type: 'location', title, address, latitude: lat, longitude: lon })
    fn.sticker = (packageId: string, stickerId: string) => fn({ type: 'sticker', packageId, stickerId })
    fn.flex = (altText: string, contents: messagingApi.FlexContainer) => {
      return fn({ type: 'flex', altText, contents })
    }
    fn.template = (altText: string, template: messagingApi.Template) => fn({ type: 'template', altText, template })
    return fn
  }
}
