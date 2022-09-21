import { Editable, isHotkey, Transforms, Editor, Range, Element, Path } from '@editablejs/editor'
import { SerializeEditor } from '@editablejs/plugin-serializes'

export const BLOCKQUOTE_KEY = 'blockquote'

type Hotkey = string | ((e: KeyboardEvent) => boolean)

const defaultHotkey: Hotkey = 'mod+shift+e'

export interface BlockquoteOptions {
  hotkey?: Hotkey
}

export const BLOCKQUOTE_OPTIONS = new WeakMap<Editable, BlockquoteOptions>()
export interface BlockquoteEditor extends Editable {
  toggleBlockquote: () => void
}

export interface Blockquote extends Element {
  type: 'blockquote'
}

export const BlockquoteEditor = {
  isBlockquoteEditor: (editor: Editable): editor is BlockquoteEditor => {
    return !!(editor as BlockquoteEditor).toggleBlockquote
  },

  isBlockquote: (editor: Editable, n: any): n is Blockquote => {
    return Editor.isBlock(editor, n) && n.type === BLOCKQUOTE_KEY
  },

  isActive: (editor: Editable) => {
    const elements = editor.queryActiveElements()
    return !!elements[BLOCKQUOTE_KEY]
  },

  getOptions: (editor: Editable): BlockquoteOptions => {
    return BLOCKQUOTE_OPTIONS.get(editor) ?? {}
  },

  toggle: (editor: BlockquoteEditor) => {
    editor.toggleBlockquote()
  },
}

export const withBlockquote = <T extends Editable>(editor: T, options: BlockquoteOptions = {}) => {
  const newEditor = editor as T & BlockquoteEditor

  BLOCKQUOTE_OPTIONS.set(newEditor, options)

  newEditor.toggleBlockquote = () => {
    editor.normalizeSelection(selection => {
      if (editor.selection !== selection) editor.selection = selection
      if (BlockquoteEditor.isActive(editor)) {
        Transforms.unwrapNodes(editor, {
          match: n => Editor.isBlock(editor, n) && n.type === BLOCKQUOTE_KEY,
          split: true,
        })
      } else {
        Transforms.wrapNodes(
          editor,
          { type: BLOCKQUOTE_KEY, children: [] },
          {
            mode: 'highest',
            match: n =>
              Editor.isBlock(editor, n) &&
              !editor.isGrid(n) &&
              !editor.isGridRow(n) &&
              !editor.isGridCell(n),
          },
        )
      }
    })
  }

  const { renderElement } = newEditor

  newEditor.renderElement = ({ element, attributes, children }) => {
    if (BlockquoteEditor.isBlockquote(newEditor, element)) {
      return (
        <blockquote
          tw="m-0 pl-4 opacity-50 border-4 border-solid border-gray-200 border-y-0 border-r-0"
          {...attributes}
        >
          {children}
        </blockquote>
      )
    }
    return renderElement({ attributes, children, element })
  }

  const hotkey = options.hotkey ?? defaultHotkey
  const { onKeydown } = newEditor
  newEditor.onKeydown = (e: KeyboardEvent) => {
    const toggle = () => {
      e.preventDefault()
      newEditor.toggleBlockquote()
    }
    if (
      (typeof hotkey === 'string' && isHotkey(hotkey, e)) ||
      (typeof hotkey === 'function' && hotkey(e))
    ) {
      toggle()
      return
    }
    const { selection } = editor
    if (
      !selection ||
      !Range.isCollapsed(selection) ||
      !BlockquoteEditor.isActive(newEditor) ||
      isHotkey('shift+enter', e)
    )
      return onKeydown(e)
    if (isHotkey('enter', e)) {
      const entry = Editor.above(newEditor, {
        match: n => Editor.isBlock(newEditor, n) && !Editor.isVoid(newEditor, n),
      })
      if (entry) {
        const [block, path] = entry
        const [parent, parentPath] = Editor.parent(newEditor, path)
        if (Editable.isEmpty(newEditor, block) && (parent as Element).type === BLOCKQUOTE_KEY) {
          e.preventDefault()
          Transforms.moveNodes(newEditor, {
            at: path,
            to: Path.next(parentPath),
          })
          return
        }
      }
    }
    onKeydown(e)
  }

  SerializeEditor.with(newEditor, e => {
    const { serializeHtml } = e

    e.serializeHtml = options => {
      const { node, attributes, styles } = options
      if (BlockquoteEditor.isBlockquote(newEditor, node)) {
        return SerializeEditor.createHtml(
          BLOCKQUOTE_KEY,
          attributes,
          {
            ...styles,
            'border-left': '4px solid #e2e8f0',
            'padding-left': '1rem',
            'margin-left': '0',
            opacity: '0.5',
          },
          node.children.map(child => e.serializeHtml({ node: child })).join(''),
        )
      }
      return serializeHtml(options)
    }
  })
  return newEditor
}