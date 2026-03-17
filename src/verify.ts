// Reference
// https://gist.github.com/devsnek/77275f6e3f810a9545440931ed314dc1
// https://developers.line.biz/en/docs/messaging-api/receiving-webhooks/#verifying-signatures

import { newError } from './utils'

const base64ToBytes = (b64: string): Uint8Array => {
  if (typeof globalThis.atob === 'function') {
    const bin = globalThis.atob(b64)
    const out = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
    return out
  }

  // Node.js fallback
  const BufferCtor = (globalThis as any).Buffer as typeof Buffer | undefined
  if (!BufferCtor) throw newError('verify', 'atob/Buffer')
  return new Uint8Array(BufferCtor.from(b64, 'base64'))
}

export const verify = async (body: string, signature: string | null, secret: string): Promise<boolean> => {
  if (!body || !signature || !secret) return false
  const subtle: SubtleCrypto = globalThis.crypto?.subtle
  if (!subtle) throw newError('verify', 'crypto')
  if (typeof (subtle as any).verify !== 'function') throw newError('verify', 'subtle.verify')

  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const key = await subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])

  let sig: BufferSource
  try {
    sig = base64ToBytes(signature) as unknown as BufferSource
  } catch {
    return false
  }
  const data = encoder.encode(body)
  return subtle.verify('HMAC', key, sig, data)
}
