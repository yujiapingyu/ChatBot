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
    className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 text-xs text-slate-100 transition hover:border-indigo-300 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {isActive ? <Square size={14} /> : <Volume2 size={14} />}
    {isActive ? '停止播放' : '播放语音'}
  </button>
)
