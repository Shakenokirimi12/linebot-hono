// Reference
// https://gist.github.com/devsnek/77275f6e3f810a9545440931ed314dc1
// https://developers.line.biz/en/docs/messaging-api/receiving-webhooks/#verifying-signatures

import { newError } from './utils'

export const verify = async (body: string, signature: string | null, secret: string): Promise<boolean> => {
  if (!body || !signature || !secret) return false
  const subtle: SubtleCrypto = globalThis.crypto?.subtle
  if (!subtle) throw newError('verify', 'crypto')

  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const key = await subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const signatureBuffer = await subtle.sign('HMAC', key, encoder.encode(body))

  const generatedSignature = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))

  return generatedSignature === signature
}
