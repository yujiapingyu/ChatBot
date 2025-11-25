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

    const handleMouseUp = () => {
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
