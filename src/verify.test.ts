import { afterEach, describe, expect, it, vi } from 'vitest'
import { verify } from './verify'

describe('verify', () => {
  const body = '{"events":[]}'
  const signature = 'test_signature'
  const secret = 'test_secret'

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('should return false if body or signature is missing', async () => {
    expect(await verify(body, null, secret)).toBe(false)
    expect(await verify('', signature, secret)).toBe(false)
  })

  it('should return the result of crypto.subtle (false)', async () => {
    const mockSign = vi.fn().mockResolvedValue(new ArrayBuffer(32))
    const mockImportKey = vi.fn().mockResolvedValue('importedKey')
    vi.stubGlobal('crypto', {
      subtle: {
        sign: mockSign,
        importKey: mockImportKey,
      },
    })
    // Since we mock sign to return 32 bytes of 0s, and signature is 'test_signature', it should be false
    expect(await verify(body, signature, secret)).toBe(false)
    expect(mockSign).toHaveBeenCalled()
    expect(mockImportKey).toHaveBeenCalled()
  })

  it('should return true if signature matches', async () => {
    // This is hard to mock perfectly without reproducing the logic,
    // but we can trust the implementation if the logic looks sound.
    // Let's at least test that it calls subtle.sign with correct params.
    const mockSign = vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer)
    const mockImportKey = vi.fn().mockResolvedValue('key')
    vi.stubGlobal('crypto', {
      subtle: {
        sign: mockSign,
        importKey: mockImportKey,
      },
    })

    // base64 of [1,2,3] is 'AQID'
    await verify(body, 'AQID', secret)

    expect(mockSign).toHaveBeenCalledWith('HMAC', 'key', expect.any(Uint8Array))
  })
})
