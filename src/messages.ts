import type { Message } from '@line/bot-sdk'

const messageText = (value: string): Message => ({ type: 'text', text: value })

export const sticker = (packageId: string, stickerId: string): Message =>
  ({ type: 'sticker', packageId, stickerId }) as any

export const coupon = (couponId: string): Message => ({ type: 'coupon', couponId }) as any

/**
 * Convenience namespace for fluent-like usage.
 *
 * Example:
 * - `app.message(msg.sticker('1','2'), handler)`
 * - `return c.push(msg.coupon(couponId))`
 */
export const msg = {
  text: messageText,
  sticker,
  coupon,
}

// Backward-compatible aliases (if users imported old names)
export const textMessage = messageText
export const stickerMessage = sticker
export const couponMessage = coupon
