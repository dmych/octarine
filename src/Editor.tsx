import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect } from 'react'

export default function Editor() {
  const editor = useEditor({
    extensions: [StarterKit],
    content: localStorage.getItem('editor-content') || '<p>Привет! Это мой первый блок.</p>',
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      localStorage.setItem('editor-content', html)
    },
  })

  return <EditorContent editor={editor} />
}
