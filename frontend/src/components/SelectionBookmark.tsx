import { Bookmark } from 'lucide-react'
import { useSelectionBookmark } from '@/hooks/useSelectionBookmark'
import { useChatStore } from '@/store/useChatStore'
import { toast } from 'sonner'

export const SelectionBookmark = () => {
  const { selectionState, clear } = useSelectionBookmark()
  const addFavorite = useChatStore((state) => state.addFavoriteFromSelection)

  if (!selectionState) return null

  const handleBookmark = () => {
    addFavorite(selectionState.text)
    toast.success('已加入收藏本')
    clear()
    window.getSelection()?.removeAllRanges()
  }

  return (
    <button
      type="button"
      onClick={handleBookmark}
      className="fixed z-50 -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-2 text-xs text-white shadow-lg"
      style={{ left: selectionState.x, top: selectionState.y - 40 }}
    >
      <span className="flex items-center gap-2">
        <Bookmark size={14} /> 收藏选区
      </span>
    </button>
  )
}
