import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import type { FavoriteItem } from '@/types/chat'

interface Props {
  open: boolean
  favorite?: FavoriteItem
  onClose: () => void
  onNext: () => void
  onPrev: () => void
}

export const FlashcardModal = ({ open, favorite, onClose, onNext, onPrev }: Props) => {
  if (!open || !favorite) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="glass-panel relative w-full max-w-xl rounded-3xl p-8 text-slate-50">
        <button className="absolute right-4 top-4" type="button" onClick={onClose}>
          <X />
        </button>
        <div className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-200">Flashcard</p>
          <h3 className="mt-4 text-3xl font-semibold text-white">{favorite.text}</h3>
          <p className="mt-3 text-lg text-slate-200">{favorite.translation ?? '（尚无翻译）'}</p>
          <p className="mt-1 text-xs text-slate-400">来源：{favorite.source}</p>
        </div>
        <div className="mt-8 flex items-center justify-between">
          <button type="button" onClick={onPrev} className="rounded-full border border-white/10 p-3">
            <ChevronLeft />
          </button>
          <button type="button" onClick={onNext} className="rounded-full border border-white/10 p-3">
            <ChevronRight />
          </button>
        </div>
      </div>
    </div>
  )
}
