import type { messagingApi } from '@line/bot-sdk'

const omit = <T extends object>(obj: T, keys: string[]): any => {
  const result = { ...obj } as any
  for (const key of keys) {
    if (key in result) delete result[key]
  }
  return result
}

export const bubble = (options: Partial<messagingApi.FlexBubble> = {}): messagingApi.FlexBubble => ({
  type: 'bubble',
  ...omit(options, ['children']),
})

export const carousel = (contents: messagingApi.FlexBubble[], options: Partial<messagingApi.FlexCarousel> = {}): messagingApi.FlexCarousel => ({
  type: 'carousel',
  contents,
  ...omit(options, ['children']),
})

export const box = (
  layout: 'vertical' | 'horizontal' | 'baseline',
  contents: messagingApi.FlexComponent[],
  options: Partial<messagingApi.FlexBox> = {},
): messagingApi.FlexBox => ({
  type: 'box',
  layout,
  contents,
  ...omit(options, ['children']),
})

export const text = (text: string, options: Partial<messagingApi.FlexText> = {}): messagingApi.FlexText => ({
  type: 'text',
  text,
  ...omit(options, ['children']),
})

export const button = (
  action: string | messagingApi.Action,
  options: Partial<messagingApi.FlexButton> = {},
): messagingApi.FlexButton => ({
  type: 'button',
  action: typeof action === 'string' ? { type: 'uri', label: action, uri: action } : action,
  ...omit(options, ['children']),
})

export const image = (url: string, options: Partial<messagingApi.FlexImage> = {}): messagingApi.FlexImage => ({
  type: 'image',
  url,
  ...omit(options, ['children']),
})

export const icon = (url: string, options: Partial<messagingApi.FlexIcon> = {}): messagingApi.FlexIcon => ({
  type: 'icon',
  url,
  ...omit(options, ['children']),
})

export const span = (text: string, options: Partial<messagingApi.FlexSpan> = {}): messagingApi.FlexSpan => ({
  type: 'span',
  text,
  ...omit(options, ['children']),
})

export const separator = (options: Partial<messagingApi.FlexSeparator> = {}): messagingApi.FlexSeparator => ({
  type: 'separator',
  ...omit(options, ['children']),
})

export const filler = (options: Partial<messagingApi.FlexFiller> = {}): messagingApi.FlexFiller => ({
  type: 'filler',
  ...omit(options, ['children']),
})
