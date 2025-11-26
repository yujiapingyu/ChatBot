import { X, ChevronLeft, ChevronRight, CheckCircle2, XCircle } from 'lucide-react'
import type { FavoriteItem } from '@/types/chat'
import { useChatStore } from '@/store/useChatStore'
import { useAuthStore } from '@/store/useAuthStore'
import { formatDate } from '@/lib/timezone'

interface Props {
  open: boolean
  favorite?: FavoriteItem
  onClose: () => void
  onNext: () => void
  onPrev: () => void
}

export const FlashcardModal = ({ open, favorite, onClose, onNext, onPrev }: Props) => {
  const updateFavoriteMastery = useChatStore((state) => state.updateFavoriteMastery)
  const user = useAuthStore((state) => state.user)

  if (!open || !favorite) return null

  const handleFeedback = (isCorrect: boolean) => {
    updateFavoriteMastery(favorite.id, isCorrect)
    onNext()
  }

  const masteryLabels = {
    new: '新学',
    learning: '学习中',
    review: '复习中',
    mastered: '已掌握',
  }

  const masteryColors = {
    new: 'text-slate-400',
    learning: 'text-blue-400',
    review: 'text-yellow-400',
    mastered: 'text-green-400',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="glass-panel relative w-full max-w-xl rounded-3xl p-8 text-slate-50">
        <button className="absolute right-4 top-4" type="button" onClick={onClose}>
          <X />
        </button>
        <div className="text-center">
          <div className="flex items-center justify-center gap-3">
            <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">Flashcard</p>
            <span className={`rounded-full border border-white/20 px-3 py-1 text-xs font-medium ${masteryColors[favorite.mastery]}`}>
              {masteryLabels[favorite.mastery]}
            </span>
          </div>
          <h3 className="mt-4 text-3xl font-semibold text-white">{favorite.text}</h3>
          <p className="mt-3 text-lg text-slate-200">{favorite.translation ?? '（尚无翻译）'}</p>
          <div className="mt-2 flex items-center justify-center gap-3 text-xs text-slate-400">
            <span>来源：{favorite.source}</span>
            <span>•</span>
            <span>
              {formatDate(favorite.createdAt, user?.timezone)}
            </span>
            {favorite.reviewCount > 0 && (
              <>
                <span>•</span>
                <span>已复习 {favorite.reviewCount} 次</span>
              </>
            )}
          </div>
        </div>
        <div className="mt-8 flex items-center justify-between gap-4">
          <button type="button" onClick={onPrev} className="rounded-full border border-white/10 p-3 hover:bg-white/5">
            <ChevronLeft />
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => handleFeedback(false)}
              className="flex items-center gap-2 rounded-full border border-rose-400/50 px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/10"
            >
              <XCircle size={18} /> 不熟悉
            </button>
            <button
              type="button"
              onClick={() => handleFeedback(true)}
              className="flex items-center gap-2 rounded-full border border-green-400/50 px-4 py-2 text-sm text-green-300 hover:bg-green-500/10"
            >
              <CheckCircle2 size={18} /> 已掌握
            </button>
          </div>
          <button type="button" onClick={onNext} className="rounded-full border border-white/10 p-3 hover:bg-white/5">
            <ChevronRight />
          </button>
        </div>
      </div>
    </div>
  )
}
