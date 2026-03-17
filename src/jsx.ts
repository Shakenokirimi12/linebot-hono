import * as Flex from './flex'

export type Props = Record<string, any>

export const jsx = (tag: string | Function, props: Props | null, ...children: any[]): any => {
  if (typeof tag === 'function') {
    return tag({ ...props, children: children.length === 1 ? children[0] : children })
  }

  const flattenedChildren = children.flat(Infinity).filter(Boolean)
  const p = (props || {}) as Props

  switch (tag.toLowerCase()) {
    case 'bubble':
      return Flex.bubble({ ...p, body: flattenedChildren.find((c: any) => c.type === 'box') } as any)
    case 'carousel':
      return Flex.carousel(flattenedChildren)
    case 'box':
      return Flex.box(p['layout'] || 'vertical', flattenedChildren, p)
    case 'text':
      return Flex.text(p['text'] || (typeof children[0] === 'string' ? children[0] : ''), p as any)
    case 'button':
      return Flex.button(p['action'], p as any)
    case 'image':
      return Flex.image(p['url'], p as any)
    case 'icon':
      return Flex.icon(p['url'], p as any)
    case 'span':
      return Flex.span(p['text'] || (typeof children[0] === 'string' ? children[0] : ''), p as any)
    case 'separator':
      return Flex.separator(p as any)
    case 'filler':
      return Flex.filler(p as any)
    default:
      return { type: tag, ...p, contents: flattenedChildren }
  }
}

export const h = jsx

export namespace JSX {
  export interface IntrinsicElements {
    bubble: any
    carousel: any
    box: any
    text: any
    button: any
    image: any
    icon: any
    span: any
    separator: any
    filler: any
    [tagName: string]: any
  }
}

// Higher-level components that handle children mapping
export const Bubble = (props: any) => {
  const children = Array.isArray(props.children) ? props.children : [props.children]
  const body = children.find((c: any) => c?.type === 'box')
  return Flex.bubble({ ...props, body })
}

export const Carousel = (props: any) => {
  const children = Array.isArray(props.children) ? props.children : [props.children]
  return Flex.carousel(children, props)
}

export const Box = (props: any) => {
  const children = Array.isArray(props.children) ? props.children : [props.children]
  return Flex.box(props.layout || 'vertical', children, props)
}

export const Text = (props: any) => {
  const textContent = props.text || (typeof props.children === 'string' ? props.children : undefined)
  return Flex.text(textContent, props)
}

export const Button = (props: any) => Flex.button(props.action, props)
export const Image = (props: any) => Flex.image(props.url, props)
export const Icon = (props: any) => Flex.icon(props.url, props)
export const Span = (props: any) => {
  const textContent = props.text || (typeof props.children === 'string' ? props.children : undefined)
  return Flex.span(textContent, props)
}
export const Separator = (props: any) => Flex.separator(props)
export const Filler = (props: any) => Flex.filler(props)
