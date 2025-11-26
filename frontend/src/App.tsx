import { Fragment, useMemo, useState, useRef, useEffect } from 'react'
import type { FormEvent } from 'react'
import { Star, BookMarked, Menu, Sun, Moon } from 'lucide-react'
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
import AuthModal from '@/components/AuthModal'
import UserProfileModal from '@/components/UserProfileModal'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { useChatStore } from '@/store/useChatStore'
import { useAuthStore } from '@/store/useAuthStore'
import { requestChat, requestTts, requestTitle } from '@/lib/api'
import type { ChatMessage } from '@/types/chat'
import { STYLE_OPTIONS } from '@/constants/styles'

function App() {
  // 确保在根路径
  useEffect(() => {
    if (window.location.pathname !== '/') {
      window.history.replaceState(null, '', '/')
    }
  }, [])

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
    loadSessions,
    loadFavorites,
  } = useChatStore()
  const { isAuthenticated, isInitializing, checkAuth, user, logout } = useAuthStore()
  const activeSession = useMemo(
    () => sessions.find((session) => session.id === (activeSessionId ?? sessions[0]?.id)),
    [sessions, activeSessionId],
  )
  const [input, setInput] = useState('')
  const [flashcardOpen, setFlashcardOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [profileModalOpen, setProfileModalOpen] = useState(false)
  const [clearAllModalOpen, setClearAllModalOpen] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : true
  })
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const hasInitialized = useRef(false) // 追踪是否已初始化

  const { isPlaying, currentId, playBase64, stop } = useAudioPlayer()

  // 检查认证状态
  useEffect(() => {
    void checkAuth()
  }, [checkAuth])

  // 登录成功后加载数据
  useEffect(() => {
    const initializeData = async () => {
      if (isAuthenticated && !hasInitialized.current) {
        console.log('[App] 开始初始化...')
        hasInitialized.current = true
        await loadSessions()
        await loadFavorites()
        console.log('[App] 初始化完成')
      } else if (!isAuthenticated) {
        // 退出登录时重置初始化状态
        hasInitialized.current = false
      }
    }
    void initializeData()
  }, [isAuthenticated, loadSessions, loadFavorites])

  // 控制登录模态框显示
  useEffect(() => {
    // 只有在初始化完成且未认证时才显示登录框
    if (!isInitializing && !isAuthenticated) {
      setAuthModalOpen(true)
    } else {
      setAuthModalOpen(false)
    }
  }, [isAuthenticated, isInitializing])

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
    
    // 如果正在语音输入，先停止
    if (speech.isListening) {
      speech.stop()
    }
    
    const text = input.trim()
    setInput('')
    const userMessageCount = activeSession.messages.filter((msg) => msg.role === 'user').length
    const shouldGenerateTitle = userMessageCount === 0
    const userMessage = appendUserMessage(text)
    if (!userMessage) return // 如果没有会话，直接返回
    markSending(true)
    try {
      const contextMessages = [...rollingWindow(), { ...userMessage }]
      const aiPayload = await requestChat(activeSession.id, contextMessages, conversationStyle)
      const assistantMessage = await applyAiResponse(aiPayload)
      
      // 生成并更新标题
      if (shouldGenerateTitle) {
        // 不使用 setTimeout，直接等待
        try {
          const title = await requestTitle(`${text}\n${aiPayload.reply}`)
          // 从 store 获取最新的 activeSessionId
          const latestSessionId = useChatStore.getState().activeSessionId
          if (latestSessionId) {
            await updateSessionTitle(latestSessionId, title)
          }
        } catch (err) {
          console.error('生成标题失败:', err)
        }
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

  const handleClearAll = async () => {
    await clearSessions()
    setClearAllModalOpen(false)
    toast.success('已清空所有对话')
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-gray-50 text-gray-900 transition-colors dark:bg-slate-900 dark:text-slate-50">
      <Toaster position="top-right" richColors />
      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <UserProfileModal isOpen={profileModalOpen} onClose={() => setProfileModalOpen(false)} />
      
      {/* 清空对话确认模态框 */}
      {clearAllModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md p-8 m-4">
            <h2 className="text-xl font-bold text-center mb-4 text-gray-900 dark:text-white">
              确认清空所有对话？
            </h2>
            <p className="text-center text-gray-600 dark:text-gray-400 mb-6">
              此操作将删除所有对话记录，且无法恢复。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setClearAllModalOpen(false)}
                className="flex-1 px-4 py-3 rounded-lg border border-gray-300 dark:border-gray-600
                         text-gray-700 dark:text-gray-300 font-medium
                         hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleClearAll}
                className="flex-1 bg-red-500 text-white py-3 rounded-lg
                         font-semibold hover:bg-red-600
                         transform transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                         shadow-lg hover:shadow-xl"
              >
                确认清空
              </button>
            </div>
          </div>
        </div>
      )}
      
      <SelectionBookmark />
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSession?.id ?? null}
        isOpen={sidebarOpen}
        onSelect={setActiveSession}
        onCreate={createSession}
        onDelete={deleteSession}
        onClearAll={() => setClearAllModalOpen(true)}
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
        <header className="glass-panel sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 px-4 py-3 shrink-0 dark:border-slate-800 md:px-6 md:py-4">
          <div className="flex items-center gap-2 md:gap-4">
            <button
              type="button"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
            >
              <Menu size={20} />
            </button>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-indigo-500 dark:text-indigo-400 md:tracking-[0.5em]">Kokoro Coach</p>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white md:text-2xl">日语口语练习</h1>
              <p className="hidden text-sm text-gray-600 dark:text-slate-400 sm:block">AI 日语老师</p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
            {/* 主题切换 - 始终显示 */}
            <button
              type="button"
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="rounded-lg border border-gray-300 bg-white p-2 text-gray-700 shadow-sm transition-all hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 md:p-2.5"
              title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}
            >
              {isDarkMode ? <Sun size={16} className="md:w-[18px] md:h-[18px]" /> : <Moon size={16} className="md:w-[18px] md:h-[18px]" />}
            </button>
            
            {/* 对话风格 - 桌面端显示 */}
            <div className="hidden items-center gap-2 lg:flex">
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
            
            {/* 收藏本按钮 */}
            <button
              type="button"
              onClick={() => setFavoritesOpen(true)}
              className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm transition-colors hover:bg-gray-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 md:gap-2 md:px-4"
            >
              <BookMarked size={16} /> <span className="hidden sm:inline">收藏本</span>
            </button>
            
            {/* 用户信息 */}
            {isAuthenticated && user && (
              <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800 md:px-3 md:py-2">
                <button
                  onClick={() => setProfileModalOpen(true)}
                  className="flex items-center gap-1.5 hover:opacity-80 transition-opacity md:gap-2"
                >
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt="头像"
                      className="h-7 w-7 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600 md:h-8 md:w-8"
                    />
                  ) : (
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-xs font-semibold text-white md:h-8 md:w-8 md:text-sm">
                      {(user.username || user.email).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden text-sm text-gray-700 dark:text-slate-300 md:inline">{user.username || user.email.split('@')[0]}</span>
                </button>
                <button
                  onClick={() => {
                    logout()
                    toast.success('已退出登录')
                  }}
                  className="ml-1 text-xs text-gray-500 hover:text-red-600 dark:text-slate-400 dark:hover:text-red-400 md:ml-2"
                  title="退出登录"
                >
                  退出
                </button>
              </div>
            )}
          </div>
        </header>
        <main id="chat-messages" className="flex-1 overflow-y-auto px-4 py-6 md:px-10 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
          <div className="mx-auto flex max-w-3xl flex-col gap-6 pb-4">
            {activeSession?.messages.map((message, index) => {
              const nextMessage = activeSession.messages[index + 1]
              // 检查是否是第一条 assistant 消息（开圼白）
              const isFirstAssistantMessage = message.role === 'assistant' && 
                index === 0 || 
                (index > 0 && activeSession.messages.slice(0, index).every(m => m.role === 'user'))
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
                    isFirstAssistantMessage={isFirstAssistantMessage}
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
        <footer className="glass-panel border-t border-white/5 px-4 py-3 shrink-0 md:px-6 md:py-4">
          {/* 对话风格 - 移动端显示 */}
          <div className="flex items-center justify-center gap-2 mb-3 lg:hidden">
            {STYLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setConversationStyle(option.value)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
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

