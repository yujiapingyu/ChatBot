import ReactMarkdown from 'react-markdown'
import { Bookmark } from 'lucide-react'
import clsx from 'clsx'
import type { ChatMessage } from '@/types/chat'
import { PlaybackButton } from './PlaybackButton'

interface Props {
  message: ChatMessage
  onBookmark: (messageId: string, type: 'reply' | 'feedback', text: string, translation?: string) => void
  onPlayAudio: (message: ChatMessage) => void
  isPlaying: boolean
}

export const MessageBubble = ({ message, onBookmark, onPlayAudio, isPlaying }: Props) => {
  const isUser = message.role === 'user'
  return (
    <div className={clsx('flex w-full flex-col', isUser ? 'items-end' : 'items-start')}>
      <div
        className={clsx(
          'max-w-xl rounded-3xl border px-5 py-4 text-sm shadow-glass',
          isUser
            ? 'border-indigo-400/40 bg-indigo-600/30 text-white'
            : 'border-white/10 bg-white/5 text-slate-100',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose prose-invert max-w-none text-sm leading-relaxed">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {!isUser && message.translation && (
          <p className="mt-2 text-xs text-slate-300">{message.translation}</p>
        )}
        {!isUser && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-white/10 px-3 py-1 hover:border-indigo-300"
              onClick={() => onBookmark(message.id, 'reply', message.content, message.translation)}
            >
              <Bookmark size={14} /> 收藏整句
            </button>
            <PlaybackButton isActive={isPlaying} onClick={() => onPlayAudio(message)} />
          </div>
        )}
      </div>
    </div>
  )
}
