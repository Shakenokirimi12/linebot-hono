import type { EventMessage, MessageEvent } from '@line/bot-sdk'

const __linebotHonoMatcherBrand: unique symbol = Symbol('linebot-hono:matcher')
const __linebotHonoTextMatcherBrand: unique symbol = Symbol('linebot-hono:text-matcher')

export type Matcher<T extends EventMessage['type'] = EventMessage['type']> = {
  readonly [__linebotHonoMatcherBrand]: true
  readonly type: T
  readonly where?: Partial<Extract<EventMessage, { type: T }>> | undefined
}

export type TextMatcher = {
  readonly [__linebotHonoTextMatcherBrand]: true
  readonly type: 'text'
  readonly value: string | RegExp
}

const make = <T extends EventMessage['type']>(
  type: T,
  where?: Partial<Extract<EventMessage, { type: T }>>,
): Matcher<T> => ({ [__linebotHonoMatcherBrand]: true, type, where }) as const

export const match = {
  text: (value: string | RegExp): TextMatcher =>
    ({ [__linebotHonoTextMatcherBrand]: true, type: 'text', value }) as const,
  sticker: (packageId?: string, stickerId?: string) => make('sticker', { packageId, stickerId } as any),
  image: () => make('image'),
  video: () => make('video'),
  audio: () => make('audio'),
  file: () => make('file'),
  location: () => make('location'),
} as const

export type MessageEventOf<T extends EventMessage['type']> = Omit<MessageEvent, 'message'> & {
  message: Extract<EventMessage, { type: T }>
}

export const isMatcher = (v: unknown): v is Matcher => {
  return typeof v === 'object' && v !== null && (v as any)[__linebotHonoMatcherBrand] === true
}

export const isTextMatcher = (v: unknown): v is TextMatcher => {
  return typeof v === 'object' && v !== null && (v as any)[__linebotHonoTextMatcherBrand] === true
}
