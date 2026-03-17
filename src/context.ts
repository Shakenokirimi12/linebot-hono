import { messagingApi } from '@line/bot-sdk'
import type { Env, ExecutionContext, LineEnv, WebhookEvent } from './types'

type CouponCreateRequest = messagingApi.CouponCreateRequest

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
  coupon: (couponId: string) => Promise<R>
}

export type MessageSenderWithOptions<R, O extends object> = {
  (messages: messagingApi.Message | messagingApi.Message[], options?: O): Promise<R>
  text: (text: string, options?: O) => Promise<R>
  image: (url: string, previewUrl?: string, options?: O) => Promise<R>
  video: (url: string, previewUrl: string, options?: O) => Promise<R>
  audio: (url: string, duration: number, options?: O) => Promise<R>
  location: (title: string, address: string, lat: number, lon: number, options?: O) => Promise<R>
  sticker: (packageId: string, stickerId: string, options?: O) => Promise<R>
  flex: (altText: string, contents: messagingApi.FlexContainer, options?: O) => Promise<R>
  template: (altText: string, template: messagingApi.Template, options?: O) => Promise<R>
  coupon: (couponId: string, options?: O) => Promise<R>
}

type WithRetryKey<O extends object> = O & { retryKey?: string }

const asArray = <T>(v: T | T[]): T[] => (Array.isArray(v) ? v : [v])

const defineMessageSender = <R>(send: (messages: messagingApi.Message[]) => Promise<R>): MessageSender<R> => {
  const fn = async (messages: messagingApi.Message | messagingApi.Message[]): Promise<R> => {
    return send(asArray(messages))
  }

  fn.text = (text: string): Promise<R> => fn({ type: 'text', text })
  fn.image = (url: string, previewUrl?: string): Promise<R> =>
    fn({ type: 'image', originalContentUrl: url, previewImageUrl: previewUrl || url })
  fn.video = (url: string, previewUrl: string): Promise<R> =>
    fn({ type: 'video', originalContentUrl: url, previewImageUrl: previewUrl })
  fn.audio = (url: string, duration: number): Promise<R> => fn({ type: 'audio', originalContentUrl: url, duration })
  fn.location = (title: string, address: string, lat: number, lon: number): Promise<R> =>
    fn({ type: 'location', title, address, latitude: lat, longitude: lon })
  fn.sticker = (packageId: string, stickerId: string): Promise<R> => fn({ type: 'sticker', packageId, stickerId })
  fn.flex = (altText: string, contents: messagingApi.FlexContainer): Promise<R> =>
    fn({ type: 'flex', altText, contents })
  fn.template = (altText: string, template: messagingApi.Template): Promise<R> =>
    fn({ type: 'template', altText, template })
  fn.coupon = (couponId: string): Promise<R> => fn({ type: 'coupon', couponId } as any)
  return fn
}

const defineMessageSenderIfPossible = <R>(
  sendIfPossible: (messages: messagingApi.Message[]) => Promise<R | undefined>,
): MessageSender<R | undefined> => {
  const fn = async (messages: messagingApi.Message | messagingApi.Message[]): Promise<R | undefined> => {
    return sendIfPossible(asArray(messages))
  }

  fn.text = (text: string): Promise<R | undefined> => fn({ type: 'text', text })
  fn.image = (url: string, previewUrl?: string): Promise<R | undefined> =>
    fn({ type: 'image', originalContentUrl: url, previewImageUrl: previewUrl || url })
  fn.video = (url: string, previewUrl: string): Promise<R | undefined> =>
    fn({ type: 'video', originalContentUrl: url, previewImageUrl: previewUrl })
  fn.audio = (url: string, duration: number): Promise<R | undefined> =>
    fn({ type: 'audio', originalContentUrl: url, duration })
  fn.location = (title: string, address: string, lat: number, lon: number): Promise<R | undefined> =>
    fn({ type: 'location', title, address, latitude: lat, longitude: lon })
  fn.sticker = (packageId: string, stickerId: string): Promise<R | undefined> =>
    fn({ type: 'sticker', packageId, stickerId })
  fn.flex = (altText: string, contents: messagingApi.FlexContainer): Promise<R | undefined> =>
    fn({ type: 'flex', altText, contents })
  fn.template = (altText: string, template: messagingApi.Template): Promise<R | undefined> =>
    fn({ type: 'template', altText, template })
  fn.coupon = (couponId: string): Promise<R | undefined> => fn({ type: 'coupon', couponId } as any)
  return fn
}

const defineMessageSenderWithOptions = <R, O extends object>(
  send: (messages: messagingApi.Message[], options?: O) => Promise<R>,
): MessageSenderWithOptions<R, O> => {
  const fn = async (messages: messagingApi.Message | messagingApi.Message[], options?: O): Promise<R> => {
    return send(asArray(messages), options)
  }

  fn.text = (text: string, options?: O): Promise<R> => fn({ type: 'text', text }, options)
  fn.image = (url: string, previewUrl?: string, options?: O): Promise<R> =>
    fn({ type: 'image', originalContentUrl: url, previewImageUrl: previewUrl || url }, options)
  fn.video = (url: string, previewUrl: string, options?: O): Promise<R> =>
    fn({ type: 'video', originalContentUrl: url, previewImageUrl: previewUrl }, options)
  fn.audio = (url: string, duration: number, options?: O): Promise<R> =>
    fn({ type: 'audio', originalContentUrl: url, duration }, options)
  fn.location = (title: string, address: string, lat: number, lon: number, options?: O): Promise<R> =>
    fn({ type: 'location', title, address, latitude: lat, longitude: lon }, options)
  fn.sticker = (packageId: string, stickerId: string, options?: O): Promise<R> =>
    fn({ type: 'sticker', packageId, stickerId }, options)
  fn.flex = (altText: string, contents: messagingApi.FlexContainer, options?: O): Promise<R> =>
    fn({ type: 'flex', altText, contents }, options)
  fn.template = (altText: string, template: messagingApi.Template, options?: O): Promise<R> =>
    fn({ type: 'template', altText, template }, options)
  fn.coupon = (couponId: string, options?: O): Promise<R> => fn({ type: 'coupon', couponId } as any, options)
  return fn
}

class CouponBuilder {
  #ctx: Context<any, any>
  #request: Partial<CouponCreateRequest> = {}

  constructor(ctx: Context<any, any>) {
    this.#ctx = ctx
  }

  /**
   * Set arbitrary fields (escape hatch).
   */
  set(request: Partial<CouponCreateRequest>): this {
    this.#request = { ...this.#request, ...request }
    return this
  }

  title(value: string): this {
    this.#request.title = value as any
    return this
  }

  description(value: string): this {
    this.#request.description = value as any
    return this
  }

  imageUrl(url: string): this {
    this.#request.imageUrl = url as any
    return this
  }

  timezone(value: string): this {
    this.#request.timezone = value as any
    return this
  }

  visibility(value: string): this {
    this.#request.visibility = value as any
    return this
  }

  startTimestamp(value: number): this {
    this.#request.startTimestamp = value as any
    return this
  }

  endTimestamp(value: number): this {
    this.#request.endTimestamp = value as any
    return this
  }

  maxUseCountPerTicket(value: number): this {
    this.#request.maxUseCountPerTicket = value as any
    return this
  }

  acquisitionNormal(): this {
    this.#request.acquisitionCondition = { type: 'normal' } as any
    return this
  }

  discountFixed(amount: number): this {
    this.#request.reward = {
      type: 'discount',
      priceInfo: { type: 'fixed', fixedAmount: amount },
    } as any
    return this
  }

  async create(): Promise<any> {
    return this.#ctx.coupon.create(this.#request as CouponCreateRequest)
  }
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
    if (!this.#executionCtx) throw new Error('executionCtx is not available')
    return this.#executionCtx
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
    return defineMessageSender(async messages => {
      if ('replyToken' in this.#event) {
        const replyToken = (this.#event as any).replyToken
        if (typeof replyToken === 'string') {
          return this.client.replyMessage({
            replyToken,
            messages,
          })
        }
      }
      throw new Error('This event does not support reply')
    })
  }

  /**
   * True when this event supports replies.
   */
  get canReply(): boolean {
    return 'replyToken' in this.#event && typeof (this.#event as any).replyToken === 'string'
  }

  /**
   * Reply if possible. Returns `undefined` when replyToken is not available.
   */
  get replyIfPossible(): MessageSender<messagingApi.ReplyMessageResponse | undefined> {
    return defineMessageSenderIfPossible(async messages => {
      if (!this.canReply) return undefined
      return this.client.replyMessage({
        replyToken: (this.#event as any).replyToken,
        messages,
      })
    })
  }

  /**
   * Send a push message to the current source (user, group, or room).
   * Usage: `c.push(messages)` or `c.push.text('Hello')`
   */
  get push(): MessageSender<messagingApi.PushMessageResponse> {
    return defineMessageSender(async messages => {
      const to = this.userId || this.groupId || this.roomId
      if (!to) throw new Error('No destination found for push')
      return this.client.pushMessage({
        to,
        messages,
      })
    })
  }

  /**
   * True when `c.userId || c.groupId || c.roomId` is available.
   */
  get canPush(): boolean {
    return Boolean(this.userId || this.groupId || this.roomId)
  }

  /**
   * Push if possible. Returns `undefined` when destination is not available.
   */
  get pushIfPossible(): MessageSender<messagingApi.PushMessageResponse | undefined> {
    return defineMessageSenderIfPossible(async messages => {
      const to = this.userId || this.groupId || this.roomId
      if (!to) return undefined
      return this.client.pushMessage({
        to,
        messages,
      })
    })
  }

  /**
   * Broadcast message to multiple users.
   * Usage: `c.broadcast.text('Hello')` or `c.broadcast(messages, { notificationDisabled, retryKey })`
   */
  get broadcast(): MessageSenderWithOptions<object, WithRetryKey<Omit<messagingApi.BroadcastRequest, 'messages'>>> {
    return defineMessageSenderWithOptions(async (messages, options) => {
      const { retryKey, ...rest } = options || ({} as any)
      return this.client.broadcast({ messages, ...(rest as any) } as any, retryKey)
    })
  }

  /**
   * Multicast message to specific users.
   * Usage: `c.multicast.to(userIds).text('Hello')` or `c.multicast(messages, { to: userIds, retryKey })`
   */
  get multicast(): MessageSenderWithOptions<object, WithRetryKey<Omit<messagingApi.MulticastRequest, 'messages'>>> & {
    to: (
      to: string[],
    ) => MessageSenderWithOptions<object, WithRetryKey<Omit<messagingApi.MulticastRequest, 'messages' | 'to'>>>
  } {
    const base = defineMessageSenderWithOptions<object, WithRetryKey<Omit<messagingApi.MulticastRequest, 'messages'>>>(
      async (messages, options) => {
        const { retryKey, ...rest } = options || ({} as any)
        return this.client.multicast({ messages, ...(rest as any) } as any, retryKey)
      },
    ) as any

    base.to = (to: string[]) =>
      defineMessageSenderWithOptions<object, WithRetryKey<Omit<messagingApi.MulticastRequest, 'messages' | 'to'>>>(
        async (messages, options) => {
          const { retryKey, ...rest } = options || ({} as any)
          return this.client.multicast({ to, messages, ...(rest as any) } as any, retryKey)
        },
      )

    return base
  }

  /**
   * Narrowcast message.
   * Usage: `c.narrowcast.text('Hello', { recipient, retryKey })`
   */
  get narrowcast(): MessageSenderWithOptions<object, WithRetryKey<Omit<messagingApi.NarrowcastRequest, 'messages'>>> {
    return defineMessageSenderWithOptions(async (messages, options) => {
      const { retryKey, ...rest } = options || ({} as any)
      return this.client.narrowcast({ messages, ...(rest as any) } as any, retryKey)
    })
  }

  /**
   * Convenience wrappers (non-send APIs) — Hono-first entry points.
   */
  botInfo(): Promise<messagingApi.BotInfoResponse> {
    return this.client.getBotInfo()
  }

  profile(userId?: string): Promise<messagingApi.UserProfileResponse> {
    const uid = userId || this.userId
    if (!uid) throw new Error('userId is required')
    return this.client.getProfile(uid)
  }

  issueLinkToken(userId?: string): Promise<messagingApi.IssueLinkTokenResponse> {
    const uid = userId || this.userId
    if (!uid) throw new Error('userId is required')
    return this.client.issueLinkToken(uid)
  }

  get webhookEndpoint(): {
    get: () => Promise<any>
    set: (request: messagingApi.SetWebhookEndpointRequest) => Promise<any>
    test: (request?: messagingApi.TestWebhookEndpointRequest) => Promise<any>
  } {
    return {
      get: () => this.client.getWebhookEndpoint(),
      set: (request: messagingApi.SetWebhookEndpointRequest) => this.client.setWebhookEndpoint(request),
      test: (request?: messagingApi.TestWebhookEndpointRequest) => this.client.testWebhookEndpoint(request),
    }
  }

  get quota(): { message: () => Promise<any>; consumption: () => Promise<any> } {
    return {
      message: () => this.client.getMessageQuota(),
      consumption: () => this.client.getMessageQuotaConsumption(),
    }
  }

  get statistics(): any {
    return {
      aggregationUnit: {
        names: (limit?: number | string, start?: string) =>
          this.client.getAggregationUnitNameList(limit === undefined ? undefined : String(limit), start),
        usage: () => this.client.getAggregationUnitUsage(),
      },
      pnp: {
        messages: (date: string) => this.client.getPNPMessageStatistics(date),
      },
      sent: {
        broadcast: (date: string) => this.client.getNumberOfSentBroadcastMessages(date),
        multicast: (date: string) => this.client.getNumberOfSentMulticastMessages(date),
        push: (date: string) => this.client.getNumberOfSentPushMessages(date),
        reply: (date: string) => this.client.getNumberOfSentReplyMessages(date),
      },
      narrowcast: {
        progress: (requestId: string) => this.client.getNarrowcastProgress(requestId),
      },
    }
  }

  get followers(): { get: (start?: string, limit?: number) => Promise<any> } {
    return {
      get: (start?: string, limit?: number) => this.client.getFollowers(start, limit),
    }
  }

  get groups(): any {
    return {
      summary: (groupId: string) => this.client.getGroupSummary(groupId),
      memberCount: (groupId: string) => this.client.getGroupMemberCount(groupId),
      members: {
        ids: (groupId: string, start?: string) => this.client.getGroupMembersIds(groupId, start),
        profile: (groupId: string, userId: string) => this.client.getGroupMemberProfile(groupId, userId),
      },
      leave: (groupId: string) => this.client.leaveGroup(groupId),
    }
  }

  get rooms(): any {
    return {
      memberCount: (roomId: string) => this.client.getRoomMemberCount(roomId),
      members: {
        ids: (roomId: string, start?: string) => this.client.getRoomMembersIds(roomId, start),
        profile: (roomId: string, userId: string) => this.client.getRoomMemberProfile(roomId, userId),
      },
      leave: (roomId: string) => this.client.leaveRoom(roomId),
    }
  }

  get richMenu(): any {
    return {
      create: (request: messagingApi.RichMenuRequest) => this.client.createRichMenu(request),
      get: (richMenuId: string) => this.client.getRichMenu(richMenuId),
      list: () => this.client.getRichMenuList(),
      del: (richMenuId: string) => this.client.deleteRichMenu(richMenuId),
      default: {
        get: () => this.client.getDefaultRichMenuId(),
        set: (richMenuId: string) => this.client.setDefaultRichMenu(richMenuId),
        cancel: () => this.client.cancelDefaultRichMenu(),
      },
      user: {
        get: (userId?: string) => {
          const uid = userId || this.userId
          if (!uid) throw new Error('userId is required')
          return this.client.getRichMenuIdOfUser(uid)
        },
        link: (richMenuId: string, userId?: string) => {
          const uid = userId || this.userId
          if (!uid) throw new Error('userId is required')
          return this.client.linkRichMenuIdToUser(richMenuId, uid)
        },
        unlink: (userId?: string) => {
          const uid = userId || this.userId
          if (!uid) throw new Error('userId is required')
          return this.client.unlinkRichMenuIdFromUser(uid)
        },
      },
      bulk: {
        link: (request: messagingApi.RichMenuBulkLinkRequest) => this.client.linkRichMenuIdToUsers(request),
        unlink: (request: messagingApi.RichMenuBulkUnlinkRequest) => this.client.unlinkRichMenuIdFromUsers(request),
      },
      alias: {
        create: (request: messagingApi.CreateRichMenuAliasRequest) => this.client.createRichMenuAlias(request),
        get: (richMenuAliasId: string) => this.client.getRichMenuAlias(richMenuAliasId),
        list: () => this.client.getRichMenuAliasList(),
        update: (richMenuAliasId: string, request: messagingApi.UpdateRichMenuAliasRequest) =>
          this.client.updateRichMenuAlias(richMenuAliasId, request),
        del: (richMenuAliasId: string) => this.client.deleteRichMenuAlias(richMenuAliasId),
      },
      batch: {
        request: (request: messagingApi.RichMenuBatchRequest) => this.client.richMenuBatch(request),
        progress: (requestId: string) => this.client.getRichMenuBatchProgress(requestId),
      },
    }
  }

  get coupon(): any {
    return {
      create: (request?: messagingApi.CouponCreateRequest) => this.client.createCoupon(request),
      list: (status?: Set<string>, start?: string, limit?: number) =>
        this.client.listCoupon(status as any, start, limit),
      get: (couponId: string) => this.client.getCouponDetail(couponId),
      close: (couponId: string) => this.client.closeCoupon(couponId),
      builder: () => new CouponBuilder(this as any),
    }
  }

  get membership(): any {
    return {
      list: () => this.client.getMembershipList(),
      subscription: (userId?: string) => {
        const uid = userId || this.userId
        if (!uid) throw new Error('userId is required')
        return this.client.getMembershipSubscription(uid)
      },
      joinedUsers: (membershipId: number, start?: string, limit?: number) =>
        this.client.getJoinedMembershipUsers(membershipId, start, limit),
    }
  }

  showLoading(request: messagingApi.ShowLoadingAnimationRequest): Promise<object> {
    return this.client.showLoadingAnimation(request)
  }

  markAsRead(request: messagingApi.MarkMessagesAsReadRequest): Promise<any> {
    return this.client.markMessagesAsRead(request)
  }

  markAsReadByToken(request: messagingApi.MarkMessagesAsReadByTokenRequest): Promise<any> {
    return this.client.markMessagesAsReadByToken(request)
  }
}
