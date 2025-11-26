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
  isFirstAssistantMessage?: boolean
}

export const MessageBubble = ({ message, onBookmark, onPlayAudio, isPlaying, isFirstAssistantMessage = false }: Props) => {
  const isUser = message.role === 'user'
  // 开圼白消息：ID 为 'welcome' 或者是第一条 AI 消息
  const isWelcome = message.id === 'welcome' || isFirstAssistantMessage
  return (
    <div className={clsx('flex w-full flex-col', isUser ? 'items-end' : 'items-start')}>
      <div
        className={clsx(
          'max-w-xl rounded-3xl border px-5 py-4 text-sm shadow-md',
          isUser
            ? 'border-indigo-200 bg-gradient-to-br from-indigo-500 to-purple-500 text-white shadow-indigo-200/50 dark:border-indigo-400/40 dark:bg-indigo-600/30 dark:shadow-indigo-500/20'
            : 'border-gray-200 bg-white text-gray-900 dark:border-white/10 dark:bg-white/5 dark:text-slate-100',
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : (
          <div className="prose prose-sm max-w-none leading-relaxed dark:prose-invert">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
        {!isUser && message.translation && (
          <p className="mt-2 text-xs text-gray-600 dark:text-slate-300">{message.translation}</p>
        )}
        {!isUser && !isWelcome && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-gray-700 transition-colors hover:bg-gray-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-400 dark:hover:border-indigo-300 dark:hover:text-slate-200"
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
