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
    const mockVerify = vi.fn().mockResolvedValue(false)
    const mockImportKey = vi.fn().mockResolvedValue('importedKey')
    vi.stubGlobal('crypto', {
      subtle: {
        verify: mockVerify,
        importKey: mockImportKey,
      },
    })
    expect(await verify(body, 'AQID', secret)).toBe(false)
    expect(mockVerify).toHaveBeenCalled()
    expect(mockImportKey).toHaveBeenCalled()
  })

  it('should return true if signature matches', async () => {
    const mockVerify = vi.fn().mockResolvedValue(true)
    const mockImportKey = vi.fn().mockResolvedValue('key')
    vi.stubGlobal('crypto', {
      subtle: {
        verify: mockVerify,
        importKey: mockImportKey,
      },
    })

    await verify(body, 'AQID', secret)

    expect(mockVerify).toHaveBeenCalledWith('HMAC', 'key', expect.any(Uint8Array), expect.any(Uint8Array))
  })
})
