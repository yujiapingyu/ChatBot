import { Square, Volume2 } from 'lucide-react'

interface Props {
  isActive: boolean
  disabled?: boolean
  onClick: () => void
}

export const PlaybackButton = ({ isActive, disabled, onClick }: Props) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:border-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {isActive ? <Square size={14} /> : <Volume2 size={14} />}
    {isActive ? '停止播放' : '播放语音'}
  </button>
)
