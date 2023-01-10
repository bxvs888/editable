import { HTMLSerializerWithTransform } from '@editablejs/editor'
import { BackgroundColor } from './interfaces/background-color'

export const withBackgroundColorHTMLTransform: HTMLSerializerWithTransform = (
  next,
  serializer,
  customOptions = {},
) => {
  const { attributes: customAttributes, style: customStyle } = customOptions
  return (node, options) => {
    const { attributes, style } = options ?? {}
    if (BackgroundColor.isBackgroundColor(node)) {
      const { backgroundColor, text } = node
      return serializer.create(
        'span',
        serializer.mergeOptions(node, attributes, customAttributes),
        serializer.mergeOptions(node, style, customStyle, { backgroundColor }),
        text,
      )
    }
    return next(node, options)
  }
}