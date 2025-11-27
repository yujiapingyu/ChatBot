import { create } from 'zustand'
import { nanoid } from 'nanoid'
import type { AiResponsePayload, ChatMessage, ChatSession, ConversationStyle, FavoriteItem } from '@/types/chat'
import { STYLE_LABELS } from '@/constants/styles'
import { sessionApi, favoriteApi } from '@/lib/sessionApi'

interface ChatState {
  sessions: ChatSession[]
  activeSessionId: string | null
  favorites: FavoriteItem[]
  isSending: boolean
  sidebarOpen: boolean
  favoritesOpen: boolean
  flashcardIndex: number
  conversationStyle: ConversationStyle
  isLoading: boolean
  pendingSessionCreation: Promise<string> | null  // 跟踪会话创建状态
  
  // Actions
  loadSessions: () => Promise<void>
  loadFavorites: () => Promise<void>
  ensureSession: () => ChatSession | null
  setActiveSession: (sessionId: string) => Promise<void>
  createSession: () => Promise<ChatSession>
  deleteSession: (sessionId: string) => Promise<void>
  clearSessions: () => Promise<void>
  appendUserMessage: (text: string) => ChatMessage | undefined
  applyAiResponse: (payload: AiResponsePayload) => Promise<ChatMessage>
  updateMessage: (messageId: string, patch: Partial<ChatMessage>) => void
  updateSessionTitle: (sessionId: string, title: string) => Promise<void>
  markSending: (flag: boolean) => void
  addFavoriteFromMessage: (messageId: string, type: 'reply' | 'feedback', text: string, translation?: string) => Promise<void>
  addFavoriteFromFeedback: (originalText: string, correctedSentence: string, explanation: string) => Promise<void>
  addFavoriteFromSelection: (text: string, translation?: string) => Promise<void>
  removeFavorite: (favoriteId: string) => Promise<void>
  updateFavoriteMastery: (favoriteId: string, isCorrect: boolean) => Promise<void>
  setSidebarOpen: (flag: boolean) => void
  setFavoritesOpen: (flag: boolean) => void
  updateFlashcardIndex: (delta: number) => void
  setConversationStyle: (style: ConversationStyle) => void
  exportFavoritesMarkdown: () => string
  getActiveSession: () => ChatSession | undefined
  rollingWindow: () => ChatMessage[]
}

const createWelcomeMessage = (): ChatMessage => ({
  id: 'welcome',
  role: 'assistant',
  content: 'こんにちは！私は Kokoro Coach です。请用日语聊聊你今天的状态或想练习的场景。',
  translation: '你好！我是 Kokoro Coach。先用日语介绍一下你的情况或今天想练习的内容吧。',
  createdAt: Date.now(),
})

const emptySession = (): ChatSession => ({
  id: nanoid(),
  title: '新的对话',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [createWelcomeMessage()],
})

// 跟踪已保存到数据库的会话ID（避免重复创建）
const savedSessionIds = new Set<string>()

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  activeSessionId: null,
  favorites: [],
  isSending: false,
  sidebarOpen: window.innerWidth >= 768, // 移动端默认关闭，桌面端默认打开
  favoritesOpen: false,
  flashcardIndex: 0,
  conversationStyle: 'casual',
  isLoading: false,
  pendingSessionCreation: null,

  loadSessions: async () => {
    console.log('[loadSessions] 开始加载会话...')
    try {
      const sessions = await sessionApi.getSessions()
      console.log('[loadSessions] 获取到', sessions.length, '个会话列表')
      // 为每个 session 加载完整数据（包括消息）
      const fullSessions = await Promise.all(
        sessions.map(s => sessionApi.getSession(s.id))
      )
      console.log('[loadSessions] 完整数据:', fullSessions.map(s => ({
        id: s.id,
        title: s.title,
        messageCount: s.messages.length
      })))
      
      // 如果没有会话，不创建临时会话
      // 让用户通过"新建对话"按钮主动创建
      if (fullSessions.length === 0) {
        console.log('[loadSessions] 无会话，设置为空')
        set({ sessions: [], activeSessionId: null })
      } else {
        console.log('[loadSessions] 设置', fullSessions.length, '个会话到 store')
        // 标记所有从数据库加载的会话
        fullSessions.forEach(s => savedSessionIds.add(s.id))
        set({ sessions: fullSessions })
        if (!get().activeSessionId) {
          console.log('[loadSessions] 设置活动会话:', fullSessions[0].id)
          set({ activeSessionId: fullSessions[0].id })
        }
      }
    } catch (error) {
      console.error('加载会话失败:', error)
      // 加载失败时也不创建临时会话，避免数据丢失
      set({ sessions: [], activeSessionId: null })
    }
  },

  loadFavorites: async () => {
    try {
      const favorites = await favoriteApi.getFavorites()
      set({ favorites })
    } catch (error) {
      console.error('加载收藏失败:', error)
    }
  },

  ensureSession: () => {
    const { sessions, activeSessionId } = get()
    const session = sessions.find((s) => s.id === activeSessionId) ?? sessions[0]
    if (activeSessionId && session) {
      return session
    }
    if (session) {
      set({ activeSessionId: session.id })
      return session
    }
    // 如果没有会话，返回 null 而不是创建临时会话
    return null
  },

  setActiveSession: async (sessionId) => {
    const session = get().sessions.find((s) => s.id === sessionId)
    if (session) {
      set({ activeSessionId: session.id })
      // 重新加载会话消息
      try {
        const fullSession = await sessionApi.getSession(sessionId)
        set(state => ({
          sessions: state.sessions.map(s => s.id === sessionId ? fullSession : s)
        }))
      } catch (error) {
        console.error('加载会话失败:', error)
      }
    }
  },

  createSession: async () => {
    console.log('[createSession] 开始创建新会话...')
    try {
      const session = await sessionApi.createSession('新的对话', get().conversationStyle)
      console.log('[createSession] 后端创建会话成功，ID:', session.id)
      // 添加欢迎消息到本地
      const sessionWithWelcome = {
        ...session,
        messages: [createWelcomeMessage()],
      }
      
      // 同时保存欢迎消息到数据库
      const welcomeMsg = createWelcomeMessage()
      sessionApi.addMessage(session.id, {
        role: 'assistant',
        content: welcomeMsg.content,
        translation: welcomeMsg.translation,
      }).catch(error => {
        console.error('保存欢迎消息失败:', error)
      })
      
      console.log('[createSession] 将会话添加到列表')
      // 标记为已保存到数据库的会话
      savedSessionIds.add(session.id)
      set((state) => ({ 
        sessions: [sessionWithWelcome, ...state.sessions], 
        activeSessionId: session.id 
      }))
      return sessionWithWelcome
    } catch (error) {
      console.error('创建会话失败:', error)
      // 降级到本地会话
      const session = emptySession()
      set((state) => ({ sessions: [session, ...state.sessions], activeSessionId: session.id }))
      return session
    }
  },

  deleteSession: async (sessionId) => {
    try {
      await sessionApi.deleteSession(sessionId)
      // 从已保存集合中移除
      savedSessionIds.delete(sessionId)
      set((state) => {
        const sessions = state.sessions.filter((s) => s.id !== sessionId)
        if (sessions.length === 0) {
          return { sessions: [], activeSessionId: null }
        }
        const activeSessionId = state.activeSessionId === sessionId ? sessions[0].id : state.activeSessionId
        return { sessions, activeSessionId }
      })
    } catch (error) {
      console.error('删除会话失败:', error)
    }
  },

  clearSessions: async () => {
    try {
      // 删除所有会话
      const sessions = get().sessions
      await Promise.all(sessions.map(s => sessionApi.deleteSession(s.id)))
      set({ sessions: [], activeSessionId: null })
    } catch (error) {
      console.error('清空会话失败:', error)
    }
  },

  appendUserMessage: (text) => {
    const session = get().ensureSession()
    if (!session) {
      console.warn('没有活动会话，无法添加消息')
      return undefined
    }
    const newMessage: ChatMessage = {
      id: nanoid(),
      role: 'user',
      content: text.trim(),
      createdAt: Date.now(),
    }
    
    // 先更新本地状态
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === session.id
          ? {
              ...s,
              updatedAt: Date.now(),
              messages: [...s.messages, newMessage],
            }
          : s,
      ),
    }))
    
    // 异步保存到后端
    // 检查会话是否已经保存到数据库
    const isSessionSaved = savedSessionIds.has(session.id)
    console.log('[appendUserMessage] sessionId:', session.id, 'isSessionSaved:', isSessionSaved, 'messages count:', session.messages.length)
    
    if (!isSessionSaved) {
      console.log('[appendUserMessage] 检测到未保存的临时会话，将创建数据库会话')
      // 这是临时会话的第一条消息，需要创建数据库会话
      const creationPromise = sessionApi.createSession(session.title, get().conversationStyle)
        .then(newSession => {
          // 标记新会话为已保存
          savedSessionIds.add(newSession.id)
          // 更新会话 ID
          set((state) => ({
            sessions: state.sessions.map((s) =>
              s.id === session.id ? { ...s, id: newSession.id } : s
            ),
            activeSessionId: newSession.id,
            pendingSessionCreation: null,
          }))
          
          // 保存欢迎消息（跳过 ID 为 'welcome' 的消息）
          const welcomeMsg = session.messages.find(m => m.role === 'assistant' && m.id !== 'welcome')
          if (welcomeMsg) {
            return sessionApi.addMessage(newSession.id, {
              role: 'assistant',
              content: welcomeMsg.content,
              translation: welcomeMsg.translation,
            }).then(() => newSession.id)
          }
          return newSession.id
        })
        .then(sessionId => {
          // 保存用户消息
          return sessionApi.addMessage(sessionId, {
            role: 'user',
            content: text.trim(),
          }).then(() => sessionId)
        })
        .catch(error => {
          console.error('保存会话失败:', error)
          set({ pendingSessionCreation: null })
          throw error
        })
      
      set({ pendingSessionCreation: creationPromise })
    } else {
      console.log('[appendUserMessage] 会话已存在，直接保存消息到数据库')
      // 直接保存消息（会话已存在于数据库）
      sessionApi.addMessage(session.id, {
        role: 'user',
        content: text.trim(),
      }).catch(error => {
        console.error('保存用户消息失败:', error)
      })
    }
    
    return newMessage
  },

  applyAiResponse: async (payload) => {
    const session = get().ensureSession()
    if (!session) {
      console.warn('没有活动会话，无法添加AI回复')
      // 返回一个空消息作为占位
      return {
        id: nanoid(),
        role: 'assistant' as const,
        content: payload.reply,
        translation: payload.replyTranslation,
        feedback: payload.feedback,
        audioBase64: payload.audioBase64,
        createdAt: Date.now(),
      }
    }
    const assistantMessage: ChatMessage = {
      id: nanoid(),
      role: 'assistant',
      content: payload.reply,
      translation: payload.replyTranslation,
      feedback: payload.feedback,
      audioBase64: payload.audioBase64,
      createdAt: Date.now(),
    }
    
    // 先更新本地状态
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === session.id
          ? {
              ...s,
              updatedAt: Date.now(),
              messages: [...s.messages, assistantMessage],
            }
          : s,
      ),
    }))
    
    // 等待会话创建完成（如果正在创建）
    const { pendingSessionCreation, activeSessionId } = get()
    let targetSessionId = session.id
    
    if (pendingSessionCreation) {
      try {
        targetSessionId = await pendingSessionCreation
      } catch (error) {
        console.error('等待会话创建失败:', error)
        return assistantMessage
      }
    } else if (activeSessionId && activeSessionId !== session.id) {
      // 如果 activeSessionId 已经更新，使用新的 ID
      targetSessionId = activeSessionId
    }
    
    // 异步保存到后端
    try {
      await sessionApi.addMessage(targetSessionId, {
        role: 'assistant',
        content: payload.reply,
        translation: payload.replyTranslation,
        feedback: payload.feedback,
        audio_base64: payload.audioBase64,
      })
    } catch (error) {
      console.error('保存 AI 消息失败:', error)
    }
    
    return assistantMessage
  },

  updateMessage: (messageId, patch) => {
    set((state) => ({
      sessions: state.sessions.map((session) => ({
        ...session,
        messages: session.messages.map((message) =>
          message.id === messageId ? { ...message, ...patch } : message,
        ),
      })),
    }))
  },

  updateSessionTitle: async (sessionId, title) => {
    // 等待会话创建完成（如果正在创建）
    const { pendingSessionCreation, activeSessionId } = get()
    let targetSessionId = sessionId
    
    if (pendingSessionCreation) {
      try {
        targetSessionId = await pendingSessionCreation
      } catch (error) {
        console.error('等待会话创建失败:', error)
        return
      }
    } else if (activeSessionId && activeSessionId !== sessionId) {
      // 如果 activeSessionId 已经更新，使用新的 ID
      targetSessionId = activeSessionId
    }
    
    try {
      await sessionApi.updateTitle(targetSessionId, title)
      set((state) => ({
        sessions: state.sessions.map((session) =>
          session.id === targetSessionId ? { ...session, title } : session,
        ),
      }))
    } catch (error) {
      console.error('更新标题失败:', error)
    }
  },

  markSending: (flag) => set({ isSending: flag }),
  
  setConversationStyle: (style) => set({ conversationStyle: style }),

  addFavoriteFromMessage: async (_messageId, type, text, translation) => {
    try {
      const favorite = await favoriteApi.createFavorite({
        text,
        translation,
        source: type === 'reply' ? 'ai-reply' : 'ai-feedback',
      })
      set((state) => ({ favorites: [favorite, ...state.favorites] }))
    } catch (error) {
      console.error('添加收藏失败:', error)
    }
  },

  addFavoriteFromFeedback: async (originalText, correctedSentence, _explanation) => {
    if (!originalText.trim()) return
    try {
      const favorite = await favoriteApi.createFavorite({
        text: originalText.trim(),
        translation: correctedSentence,
        source: 'ai-feedback',
      })
      set((state) => ({ favorites: [favorite, ...state.favorites] }))
    } catch (error) {
      console.error('添加收藏失败:', error)
    }
  },

  addFavoriteFromSelection: async (text, translation) => {
    if (!text.trim()) return
    try {
      const favorite = await favoriteApi.createFavorite({
        text: text.trim(),
        translation,
        source: 'selection',
      })
      set((state) => ({ favorites: [favorite, ...state.favorites] }))
    } catch (error) {
      console.error('添加收藏失败:', error)
    }
  },

  removeFavorite: async (favoriteId) => {
    try {
      await favoriteApi.deleteFavorite(favoriteId)
      set((state) => ({ favorites: state.favorites.filter((f) => f.id !== favoriteId) }))
    } catch (error) {
      console.error('删除收藏失败:', error)
    }
  },

  updateFavoriteMastery: async (favoriteId, isCorrect) => {
    const fav = get().favorites.find((f) => f.id === favoriteId)
    if (!fav) return

    const newReviewCount = fav.reviewCount + 1
    let newMastery = fav.mastery

    if (isCorrect) {
      if (fav.mastery === 'new' && newReviewCount >= 2) newMastery = 'learning'
      else if (fav.mastery === 'learning' && newReviewCount >= 5) newMastery = 'review'
      else if (fav.mastery === 'review' && newReviewCount >= 10) newMastery = 'mastered'
    } else {
      if (fav.mastery === 'mastered') newMastery = 'review'
      else if (fav.mastery === 'review') newMastery = 'learning'
    }

    try {
      await favoriteApi.updateMastery(favoriteId, newMastery, newReviewCount)
      set((state) => ({
        favorites: state.favorites.map((f) =>
          f.id === favoriteId
            ? {
                ...f,
                mastery: newMastery,
                reviewCount: newReviewCount,
                lastReviewedAt: Date.now(),
              }
            : f,
        ),
      }))
    } catch (error) {
      console.error('更新熟练度失败:', error)
    }
  },

  setSidebarOpen: (flag) => set({ sidebarOpen: flag }),
  
  setFavoritesOpen: (flag) => set({ favoritesOpen: flag }),
  
  updateFlashcardIndex: (delta) => {
    const { favorites, flashcardIndex } = get()
    if (favorites.length === 0) return
    const next = (flashcardIndex + delta + favorites.length) % favorites.length
    set({ flashcardIndex: next })
  },

  exportFavoritesMarkdown: () => {
    const favorites = get().favorites
    if (!favorites.length) return ''
    const lines = favorites.map(
      (fav) =>
        `### ${fav.text}\n- 来源: ${fav.source}\n- 风格: ${STYLE_LABELS[fav.style ?? 'casual']}\n- 翻译/修正版: ${fav.translation ?? '（未填写）'}\n- 说明: ${fav.note ?? '（无说明）'}\n- 熟悉度: ${fav.mastery}\n- 收藏时间: ${new Date(fav.createdAt).toLocaleString()}\n`
    )
    return ['# 日语学习收藏本', ...lines].join('\n\n')
  },

  getActiveSession: () => {
    const session = get().ensureSession()
    return session ?? undefined
  },
  
  rollingWindow: () => {
    const session = get().ensureSession()
    if (!session) return []
    return session.messages.slice(-12)
  },
}))
