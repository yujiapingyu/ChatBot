import { Mic, Square } from 'lucide-react'

interface Props {
  isListening: boolean
  onToggle: () => void
  disabled?: boolean
}

export const VoiceRecorderButton = ({ isListening, onToggle, disabled }: Props) => (
  <button
    type="button"
    onClick={onToggle}
    disabled={disabled}
    className={`rounded-full border px-3 py-2 text-xs font-medium transition ${
      isListening
        ? 'border-rose-400 bg-rose-500/20 text-rose-100'
        : 'border-white/10 text-slate-100 hover:border-indigo-300'
    } disabled:cursor-not-allowed disabled:opacity-50`}
  >
    <span className="flex items-center gap-2">
      {isListening ? <Square size={16} /> : <Mic size={16} />}
      {isListening ? '停止录音' : '语音输入'}
    </span>
  </button>
)
