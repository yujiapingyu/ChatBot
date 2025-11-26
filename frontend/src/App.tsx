import { Fragment, useMemo, useState, useRef, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Sparkles, Star, BookMarked, Menu, Sun, Moon } from 'lucide-react'
import { Toaster, toast } from 'sonner'
import './App.css'
import './index.css'
import { Sidebar } from '@/components/Sidebar'
import { MessageBubble } from '@/components/MessageBubble'
import { VoiceRecorderButton } from '@/components/VoiceRecorderButton'
import { SelectionBookmark } from '@/components/SelectionBookmark'
import { FavoritesDrawer } from '@/components/FavoritesDrawer'
import { FlashcardModal } from '@/components/FlashcardModal'
import { LoadingDots } from '@/components/LoadingDots'
import { CorrectionCard } from '@/components/CorrectionCard'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { useChatStore } from '@/store/useChatStore'
import { requestChat, requestTts, requestTitle } from '@/lib/api'
import type { ChatMessage } from '@/types/chat'
import { STYLE_OPTIONS } from '@/constants/styles'

function App() {
  const {
    sessions,
    activeSessionId,
    setActiveSession,
    createSession,
    deleteSession,
    clearSessions,
    appendUserMessage,
    applyAiResponse,
    updateMessage,
    updateSessionTitle,
    markSending,
    rollingWindow,
    isSending,
    addFavoriteFromMessage,
    addFavoriteFromFeedback,
    favoritesOpen,
    setFavoritesOpen,
    favorites,
    flashcardIndex,
    updateFlashcardIndex,
    conversationStyle,
    setConversationStyle,
    sidebarOpen,
    setSidebarOpen,
  } = useChatStore()
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === (activeSessionId ?? sessions[0]?.id)),
    [sessions, activeSessionId],
  )
  const [input, setInput] = useState('')
  const [flashcardOpen, setFlashcardOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const { isPlaying, currentId, playBase64, stop } = useAudioPlayer()

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [activeSession?.messages, isSending])

  // 主题切换
  useEffect(() => {
    const root = document.documentElement
    if (isDarkMode) {
      root.classList.add('dark')
      localStorage.setItem('theme', 'dark')
    } else {
      root.classList.remove('dark')
      localStorage.setItem('theme', 'light')
    }
  }, [isDarkMode])

  const speech = useSpeechRecognition({
    onResult: (text) => {
      setInput((prev) => (prev ? `${prev.trim()} ${text}` : text))
    },
    onError: (message) => toast.error(message),
  })

  const handleSubmit = async (event?: FormEvent) => {
    event?.preventDefault()
    if (!input.trim() || !activeSession) return
    const text = input.trim()
    setInput('')
    const userMessageCount = activeSession.messages.filter((msg) => msg.role === 'user').length
    const shouldGenerateTitle = userMessageCount === 0
    const userMessage = appendUserMessage(text)
    markSending(true)
    try {
      const contextMessages = [...rollingWindow(), { ...userMessage }]
      const aiPayload = await requestChat(activeSession.id, contextMessages, conversationStyle)
      const assistantMessage = applyAiResponse(aiPayload)
      if (shouldGenerateTitle) {
        const title = await requestTitle(`${text}\n${aiPayload.reply}`)
        updateSessionTitle(activeSession.id, title)
      }
      // 自动播放 AI 回复的音频
      if (assistantMessage.audioBase64) {
        setTimeout(() => {
          console.log('[Auto-play] Playing audio for message:', assistantMessage.id)
          void playBase64(assistantMessage.id, assistantMessage.audioBase64!).catch((err) => {
            console.error('[Auto-play] Failed to play audio:', err)
          })
        }, 300)
      } else {
        console.log('[Auto-play] No audio data in response')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : '发送失败'
      toast.error(message)
      setInput((prev) => (prev ? `${prev}\n${text}` : text))
    } finally {
      markSending(false)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault()
      void handleSubmit()
    }
  }

  const handleAudio = async (message: ChatMessage) => {
    if (currentId === message.id && isPlaying) {
      stop()
      return
    }
    let base64 = message.audioBase64
    try {
      if (!base64) {
        base64 = await requestTts(message.content)
        updateMessage(message.id, { audioBase64: base64 })
      }
      await playBase64(message.id, base64)
    } catch (error) {
      const messageText = error instanceof Error ? error.message : '播放失败'
      toast.error(messageText)
    }
  }

  const handleBookmark = (messageId: string, type: 'reply' | 'feedback', text: string, translation?: string) => {
    addFavoriteFromMessage(messageId, type, text, translation)
    toast.success('已加入收藏本')
  }

  const handleFeedbackBookmark = (originalText: string, assistantMessage: ChatMessage) => {
    if (!assistantMessage.feedback) return
    addFavoriteFromFeedback(
      originalText,
      assistantMessage.feedback.correctedSentence,
      assistantMessage.feedback.explanation,
    )
    toast.success('已加入收藏本')
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 text-gray-900 transition-colors dark:bg-slate-900 dark:text-slate-50">
      <Toaster position="top-right" richColors />
      <SelectionBookmark />
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSession?.id ?? null}
        isOpen={sidebarOpen}
        onSelect={setActiveSession}
        onCreate={createSession}
        onDelete={deleteSession}
        onClearAll={clearSessions}
        onClose={() => setSidebarOpen(false)}
      />
      <FavoritesDrawer open={favoritesOpen} onClose={() => setFavoritesOpen(false)} onOpenFlashcards={() => setFlashcardOpen(true)} />
      <FlashcardModal
        open={flashcardOpen}
        onClose={() => setFlashcardOpen(false)}
        favorite={favorites[flashcardIndex]}
        onNext={() => updateFlashcardIndex(1)}
        onPrev={() => updateFlashcardIndex(-1)}
      />
      <div className="flex flex-1 flex-col h-full overflow-hidden">
        <header className="glass-panel sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 px-6 py-4 shrink-0 dark:border-slate-800">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-xs uppercase tracking-[0.5em] text-indigo-500 dark:text-indigo-400">Kokoro Coach</p>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">日语口语练习</h1>
              <p className="text-sm text-gray-600 dark:text-slate-400">AI 日语老师 + 纠错 + 语音播报</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="rounded-lg border border-gray-300 bg-white p-2.5 text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
              title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
            <div className="flex items-center gap-2">
              {STYLE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setConversationStyle(option.value)}
                  className={`rounded-full px-4 py-2 text-xs font-medium transition-all ${
                    conversationStyle === option.value
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/30'
                      : 'border border-gray-300 bg-white text-gray-700 shadow-sm hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                  title={option.description}
                >
                  {option.icon} {option.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFavoritesOpen(true)}
              className="flex items-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-2 text-sm text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              <BookMarked size={16} /> <span className="hidden sm:inline">收藏本</span>
            </button>
            <button
              type="button"
              onClick={createSession}
              className="flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-sm text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/40"
            >
              <Sparkles size={16} /> <span className="hidden sm:inline">新话题</span>
            </button>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-10 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-4">
            {activeSession?.messages.map((message, index) => {
              const nextMessage = activeSession.messages[index + 1]
              const feedbackCard =
                message.role === 'user' && nextMessage?.feedback
                  ? {
                      feedback: nextMessage.feedback,
                      assistantMessage: nextMessage,
                    }
                  : null
              return (
                <Fragment key={message.id}>
                  <MessageBubble
                    message={message}
                    onBookmark={handleBookmark}
                    onPlayAudio={handleAudio}
                    isPlaying={currentId === message.id && isPlaying}
                  />
                  {feedbackCard && (
                    <div className="flex w-full justify-end">
                      <div className="mt-3 w-full max-w-xl">
                        <CorrectionCard
                          originalText={message.content}
                          feedback={feedbackCard.feedback}
                          onBookmark={() => handleFeedbackBookmark(message.content, feedbackCard.assistantMessage)}
                        />
                      </div>
                    </div>
                  )}
                </Fragment>
              )
            })}
            {isSending && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <LoadingDots /> 正在思考中...
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </main>
        <footer className="glass-panel border-t border-white/5 px-6 py-4 shrink-0">
          <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl flex-col gap-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入日语句子，⌘+Enter 发送（Windows 用 Ctrl+Enter），Shift+Enter 换行"
              className="min-h-[120px] w-full rounded-2xl border border-gray-300 bg-white px-5 py-4 text-sm text-gray-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <VoiceRecorderButton
                isListening={speech.isListening}
                onToggle={() => (speech.isListening ? speech.stop() : speech.start())}
                disabled={!speech.isSupported}
              />
              <div className="flex items-center gap-3">
                {isSending && <span className="text-xs text-slate-400">AI 正在回复...</span>}
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-500/30 transition-all hover:shadow-xl hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Star size={16} /> 发送
                </button>
              </div>
            </div>
          </form>
        </footer>
      </div>
    </div>
  )
}

export default App

