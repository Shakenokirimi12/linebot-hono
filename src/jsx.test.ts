import { describe, expect, it } from 'vitest'
import { Box, Bubble, jsx, Text } from './jsx'

describe('JSX Layer', () => {
  it('should transform JSX-like calls to Flex objects', () => {
    const result = jsx('bubble', null, jsx('box', { layout: 'vertical' }, jsx('text', { text: 'hello' })))

    expect(result).toEqual({
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        contents: [{ type: 'text', text: 'hello' }],
      },
    })
  })

  it('should work with component functions', () => {
    const result = jsx(Bubble, null, jsx(Box, { layout: 'horizontal' }, jsx(Text, { text: 'world' })))

    expect(result).toEqual({
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'horizontal',
        contents: [{ type: 'text', text: 'world' }],
      },
    })
  })

  it('should handle children as text for Text component', () => {
    const result = jsx(Text, null, 'child text')
    expect(result).toEqual({
      type: 'text',
      text: 'child text',
    })
  })
})
