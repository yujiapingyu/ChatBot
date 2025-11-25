import { Bookmark } from 'lucide-react'
import type { FeedbackPayload } from '@/types/chat'

interface Props {
  feedback: FeedbackPayload
  originalText: string
  onBookmark: () => void
}

export const CorrectionCard = ({ feedback, originalText, onBookmark }: Props) => (
  <div className="rounded-2xl border border-white/5 bg-rose-500/10 p-4 text-sm text-slate-100 shadow-glass">
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">我的原句</p>
      <p className="mt-1 text-base font-semibold text-white">{originalText}</p>
    </div>
    <div className="mt-4 flex items-center justify-between">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-300">AI 修改建议</p>
      <button
        type="button"
        className="flex items-center gap-1 rounded-full bg-rose-500/20 px-3 py-1 text-xs text-rose-100 transition hover:bg-rose-500/30"
        onClick={onBookmark}
      >
        <Bookmark size={14} />
        收藏
      </button>
    </div>
    <p className="mt-2 text-slate-200">{feedback.explanation}</p>
    <div className="mt-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-200">最终修正版</p>
      <p className="mt-1 text-base font-semibold text-rose-100">{feedback.correctedSentence}</p>
    </div>
    <div className="mt-3 flex items-center gap-2 text-xs text-rose-200">
      <span className="font-semibold">自然度</span>
      <span className="rounded-full bg-rose-500/20 px-2 py-0.5 font-mono">
        {feedback.naturalnessScore}/100
      </span>
    </div>
  </div>
)
