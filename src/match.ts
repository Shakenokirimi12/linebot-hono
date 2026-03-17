import type { EventMessage, MessageEvent } from '@line/bot-sdk'

const __lineHonoMatcherBrand: unique symbol = Symbol('line-hono:matcher')
const __lineHonoTextMatcherBrand: unique symbol = Symbol('line-hono:text-matcher')

export type Matcher<T extends EventMessage['type'] = EventMessage['type']> = {
  readonly [__lineHonoMatcherBrand]: true
  readonly type: T
  readonly where?: Partial<Extract<EventMessage, { type: T }>> | undefined
}

export type TextMatcher = {
  readonly [__lineHonoTextMatcherBrand]: true
  readonly type: 'text'
  readonly value: string | RegExp
}

const make = <T extends EventMessage['type']>(
  type: T,
  where?: Partial<Extract<EventMessage, { type: T }>>,
): Matcher<T> => ({ [__lineHonoMatcherBrand]: true, type, where }) as const

export const match = {
  text: (value: string | RegExp): TextMatcher => ({ [__lineHonoTextMatcherBrand]: true, type: 'text', value }) as const,
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
  return typeof v === 'object' && v !== null && (v as any)[__lineHonoMatcherBrand] === true
}

export const isTextMatcher = (v: unknown): v is TextMatcher => {
  return typeof v === 'object' && v !== null && (v as any)[__lineHonoTextMatcherBrand] === true
}
