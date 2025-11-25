import { Download, Trash2, X, BookMarked } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { useChatStore } from '@/store/useChatStore'
import type { FavoriteItem } from '@/types/chat'
import { STYLE_LABELS } from '@/constants/styles'

interface Props {
  open: boolean
  onClose: () => void
  onOpenFlashcards: () => void
}

export const FavoritesDrawer = ({ open, onClose, onOpenFlashcards }: Props) => {
  const favorites = useChatStore((state) => state.favorites)
  const removeFavorite = useChatStore((state) => state.removeFavorite)
  const exportMarkdown = useChatStore((state) => state.exportFavoritesMarkdown)

  const drawerClass = open ? 'translate-x-0' : 'translate-x-full'

  const markdownHref = useMemo(() => {
    const content = exportMarkdown()
    if (!content) return null
    return URL.createObjectURL(new Blob([content], { type: 'text/markdown' }))
  }, [exportMarkdown, favorites])

  useEffect(() => {
    return () => {
      if (markdownHref) {
        URL.revokeObjectURL(markdownHref)
      }
    }
  }, [markdownHref])

  return (
    <aside
      className={`fixed right-0 top-0 z-40 h-full w-full max-w-md transform border-l border-white/5 bg-slate-900/95 p-6 text-slate-50 shadow-xl transition ${drawerClass}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">收藏本</h2>
          <p className="text-sm text-slate-400">共 {favorites.length} 条收藏</p>
        </div>
        <button type="button" onClick={onClose}>
          <X />
        </button>
      </div>
      <div className="mt-4 flex gap-3">
        <button
          type="button"
          onClick={onOpenFlashcards}
          disabled={!favorites.length}
          className="flex flex-1 items-center justify-center gap-2 rounded-full border border-indigo-400/50 px-3 py-2 text-sm text-indigo-100 transition hover:border-indigo-300 disabled:opacity-40"
        >
          <BookMarked size={16} /> 复习模式
        </button>
        {markdownHref && (
          <a
            download="favorites.md"
            href={markdownHref}
            className="flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-sm text-slate-100"
          >
            <Download size={16} /> 导出
          </a>
        )}
      </div>
      <div className="mt-6 space-y-4 overflow-y-auto pr-2" style={{ maxHeight: 'calc(100vh - 200px)' }}>
        {favorites.map((fav: FavoriteItem) => {
          const masteryLabels = {
            new: '新学',
            learning: '学习中',
            review: '复习中',
            mastered: '已掌握',
          }
          const masteryColors = {
            new: 'text-slate-400 border-slate-400/50',
            learning: 'text-blue-400 border-blue-400/50',
            review: 'text-yellow-400 border-yellow-400/50',
            mastered: 'text-green-400 border-green-400/50',
          }
          return (
            <div key={fav.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span>{fav.source}</span>
                  <span className="text-[10px]">
                    {new Date(fav.createdAt).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-slate-200">
                    {STYLE_LABELS[fav.style ?? 'casual']}
                  </span>
                  <button type="button" onClick={() => removeFavorite(fav.id)}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <p className="mt-2 text-base font-semibold text-slate-50">{fav.text}</p>
              {fav.translation && (
                <p className="mt-1 text-sm text-slate-300">
                  {fav.source === 'ai-feedback' ? `修正版：${fav.translation}` : fav.translation}
                </p>
              )}
              {fav.source === 'ai-feedback' && fav.note && (
                <p className="mt-1 text-xs text-rose-200">AI 说明：{fav.note}</p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${masteryColors[fav.mastery]}`}>
                  {masteryLabels[fav.mastery]}
                </span>
                {fav.reviewCount > 0 && (
                  <span className="text-[10px] text-slate-400">已复习 {fav.reviewCount} 次</span>
                )}
              </div>
            </div>
          )
        })}
        {!favorites.length && <p className="text-center text-sm text-slate-400">还没有收藏，试着收藏一句吧～</p>}
      </div>
    </aside>
  )
}
