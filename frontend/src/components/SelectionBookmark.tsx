import { Bookmark } from 'lucide-react'
import { useSelectionBookmark } from '@/hooks/useSelectionBookmark'
import { useChatStore } from '@/store/useChatStore'
import { toast } from 'sonner'

export const SelectionBookmark = () => {
  const { selectionState, clear } = useSelectionBookmark()
  const addFavorite = useChatStore((state) => state.addFavoriteFromSelection)

  if (!selectionState) return null

  const handleBookmark = async () => {
    console.log('[SelectionBookmark] 开始收藏选区:', selectionState.text)
    try {
      console.log('[SelectionBookmark] 调用 addFavorite...')
      await addFavorite(selectionState.text)
      console.log('[SelectionBookmark] 收藏成功')
      toast.success('已加入收藏本')
      clear()
      window.getSelection()?.removeAllRanges()
    } catch (error) {
      console.error('[SelectionBookmark] 收藏失败:', error)
      toast.error('收藏失败')
    }
  }

  return (
    <button
      type="button"
      onMouseDown={(e) => {
        console.log('[SelectionBookmark] 按钮被点击 (mousedown)')
        e.preventDefault()
        e.stopPropagation()
        handleBookmark()
      }}
      className="fixed z-[100] -translate-x-1/2 rounded-full bg-indigo-600 px-3 py-2 text-xs text-white shadow-lg hover:bg-indigo-700 transition-colors cursor-pointer"
      style={{ left: selectionState.x, top: selectionState.y - 40 }}
    >
      <span className="flex items-center gap-2 pointer-events-none">
        <Bookmark size={14} /> 收藏选区
      </span>
    </button>
  )
}
