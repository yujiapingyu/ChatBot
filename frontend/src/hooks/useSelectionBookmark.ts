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
      // 如果点击的是收藏按钮，不要清除选区
      const target = e.target as HTMLElement
      if (target.closest('button')?.textContent?.includes('收藏选区')) {
        console.log('[useSelectionBookmark] 点击了收藏按钮，保持选区')
        return
      }

      // 检查选中是否在对话区域内
      const chatMessages = document.getElementById('chat-messages')
      if (!chatMessages || !e.target) {
        setSelectionState(null)
        return
      }

      // 检查点击目标是否在 chat-messages 内
      const targetNode = e.target as Node
      if (!chatMessages.contains(targetNode)) {
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
      const state = { text, x: rect.x + rect.width / 2, y: rect.y }
      console.log('[useSelectionBookmark] 选中文本:', text, '位置:', state)
      setSelectionState(state)
    }

    document.addEventListener('mouseup', handleMouseUp)
    return () => document.removeEventListener('mouseup', handleMouseUp)
  }, [])

  return {
    selectionState,
    clear: () => setSelectionState(null),
  }
}
