import { Bookmark } from 'lucide-react'
import type { FeedbackPayload } from '@/types/chat'

interface Props {
  feedback: FeedbackPayload
  originalText: string
  onBookmark: () => void
}

export const CorrectionCard = ({ feedback, originalText, onBookmark }: Props) => {
  // 根据分数段设置颜色
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'
    if (score >= 75) return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
    if (score >= 60) return 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300'
    if (score >= 40) return 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
    return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
  }

  return (
    <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-5 shadow-md dark:border-indigo-900/50 dark:from-indigo-950/40 dark:to-purple-950/40 dark:shadow-xl">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">我的原句</p>
        <p className="mt-2 text-base font-medium text-slate-900 dark:text-slate-100">{originalText}</p>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 dark:text-indigo-400">AI 修改建议</p>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-indigo-100 px-3 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900/70"
          onClick={onBookmark}
        >
          <Bookmark size={14} />
          收藏
        </button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">{feedback.explanation}</p>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">最终修正版</p>
        <p className="mt-2 text-base font-medium text-purple-900 dark:text-purple-200">{feedback.correctedSentence}</p>
      </div>
      <div className="mt-4 flex items-center gap-2.5">
        <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">自然度评分</span>
        <span className={`rounded-lg px-2.5 py-1 text-xs font-bold ${getScoreColor(feedback.naturalnessScore)}`}>
          {feedback.naturalnessScore}/100
        </span>
      </div>
    </div>
  )
}
