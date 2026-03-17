import type { Message, WebhookEvent } from '@line/bot-sdk'

export type { Message, WebhookEvent }

////////// Env //////////

export type Env = {
  Bindings?: object
  Variables?: Record<string, unknown>
}

////////// LineEnv //////////

export type LineEnv = {
  CHANNEL_ACCESS_TOKEN?: string | undefined
  CHANNEL_SECRET?: string | undefined
}

////////// Context //////////

export type LineContext = any // Will be defined in context.ts

////////// InitOptions //////////

export type Verify = (body: string, signature: string | null, secret: string) => Promise<boolean> | boolean

export type InitOptions<E extends Env> = {
  verify?: Verify
  lineEnv?: (env: E['Bindings']) => LineEnv
}

////////// ExecutionContext //////////

export interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void
  passThroughOnException(): void
}
