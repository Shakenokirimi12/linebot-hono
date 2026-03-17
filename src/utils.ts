/**
 * new Error(`line-hono(${locate}): ${text}`)
 */
export const newError = (locate: string, text: string): Error => new Error(`line-hono(${locate}): ${text}`)

export const isString = (value: unknown): value is string => typeof value === 'string'
export const isArray = (value: unknown): value is unknown[] => Array.isArray(value)
