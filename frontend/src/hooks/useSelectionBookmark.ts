import { useEffect, useState } from 'react'

interface SelectionState {
  text: string
  x: number
  y: number
}

export const useSelectionBookmark = () => {
  const [selectionState, setSelectionState] = useState<SelectionState | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined

    const handleMouseUp = (e: MouseEvent) => {
      // 检查选中是否在对话区域内
      const chatMessages = document.getElementById('chat-messages')
      if (!chatMessages || !e.target) {
        setSelectionState(null)
        return
      }

      // 检查点击目标是否在 chat-messages 内
      const target = e.target as Node
      if (!chatMessages.contains(target)) {
        setSelectionState(null)
        return
      }

      const selection = window.getSelection()
      if (!selection || selection.isCollapsed) {
        setSelectionState(null)
        return
      }
      const text = selection.toString().trim()
      if (!text) {
        setSelectionState(null)
        return
      }
      const range = selection.getRangeAt(0)
      const rect = range.getBoundingClientRect()
      setSelectionState({ text, x: rect.x + rect.width / 2, y: rect.y })
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [])

  return {
    selectionState,
    clear: () => setSelectionState(null),
  }
}
