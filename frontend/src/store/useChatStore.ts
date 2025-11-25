import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { AiResponsePayload, ChatMessage, ChatSession, ConversationStyle, FavoriteItem } from '@/types/chat'
import { STYLE_LABELS } from '@/constants/styles'

interface ChatState {
  sessions: ChatSession[]
  activeSessionId: string | null
  favorites: FavoriteItem[]
  isSending: boolean
  sidebarOpen: boolean
  favoritesOpen: boolean
  flashcardIndex: number
  conversationStyle: ConversationStyle
  ensureSession: () => ChatSession
  setActiveSession: (sessionId: string) => void
  createSession: () => ChatSession
  deleteSession: (sessionId: string) => void
  clearSessions: () => void
  appendUserMessage: (text: string) => ChatMessage
  applyAiResponse: (payload: AiResponsePayload) => void
  updateMessage: (messageId: string, patch: Partial<ChatMessage>) => void
  updateSessionTitle: (sessionId: string, title: string) => void
  markSending: (flag: boolean) => void
  addFavoriteFromMessage: (messageId: string, type: 'reply' | 'feedback', text: string, translation?: string) => void
  addFavoriteFromFeedback: (originalText: string, correctedSentence: string, explanation: string) => void
  addFavoriteFromSelection: (text: string, translation?: string) => void
  removeFavorite: (favoriteId: string) => void
  updateFavoriteMastery: (favoriteId: string, isCorrect: boolean) => void
  setSidebarOpen: (flag: boolean) => void
  setFavoritesOpen: (flag: boolean) => void
  updateFlashcardIndex: (delta: number) => void
  setConversationStyle: (style: ConversationStyle) => void
  exportFavoritesMarkdown: () => string
  getActiveSession: () => ChatSession
  rollingWindow: () => ChatMessage[]
}

const createWelcomeMessage = (): ChatMessage => ({
  id: nanoid(),
  role: 'assistant',
  content: 'こんにちは！私は Kokoro Coach です。请用日语聊聊你今天的状态或想练习的场景，我会用中文解释语法并给出口语建议。',
  translation: '你好！我是 Kokoro Coach。先用日语介绍一下你的情况或今天想练习的内容吧，我会结合中文说明和口语评分来协助你。',
  createdAt: Date.now(),
})

const emptySession = (): ChatSession => ({
  id: nanoid(),
  title: '新的对话',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  messages: [createWelcomeMessage()],
})

const memoryStorage = {
  getItem: () => null,
  setItem: (_key: string, _value: string) => undefined,
  removeItem: (_key: string) => undefined,
  clear: () => undefined,
  key: (_index: number) => null,
  get length() {
    return 0
  },
}

const safeStorage = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return memoryStorage
  }
  try {
    const testKey = '__jpchat__'
    window.localStorage.setItem(testKey, 'ok')
    window.localStorage.removeItem(testKey)
    return window.localStorage
  } catch {
    return memoryStorage
  }
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [emptySession()],
      activeSessionId: null,
      favorites: [],
      isSending: false,
      sidebarOpen: true,
      favoritesOpen: false,
      flashcardIndex: 0,
      conversationStyle: 'casual',
      ensureSession: () => {
        const { sessions, activeSessionId } = get()
        const session = sessions.find((s) => s.id === activeSessionId) ?? sessions[0]
        if (activeSessionId && session) {
          return session
        }
        set({ activeSessionId: session.id })
        return session
      },
      setActiveSession: (sessionId) => {
        const session = get().sessions.find((s) => s.id === sessionId)
        if (session) {
          set({ activeSessionId: session.id })
        }
      },
      createSession: () => {
        const session = emptySession()
        set((state) => ({ sessions: [session, ...state.sessions], activeSessionId: session.id }))
        return session
      },
      deleteSession: (sessionId) => {
        set((state) => {
          const sessions = state.sessions.filter((s) => s.id !== sessionId)
          if (sessions.length === 0) {
            const fresh = emptySession()
            return { sessions: [fresh], activeSessionId: fresh.id }
          }
          const activeSessionId = state.activeSessionId === sessionId ? sessions[0].id : state.activeSessionId
          return { sessions, activeSessionId }
        })
      },
      clearSessions: () => {
        const fresh = emptySession()
        set({ sessions: [fresh], activeSessionId: fresh.id })
      },
      appendUserMessage: (text) => {
        const session = get().ensureSession()
        const newMessage: ChatMessage = {
          id: nanoid(),
          role: 'user',
          content: text.trim(),
          createdAt: Date.now(),
        }
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
        return newMessage
      },
      applyAiResponse: (payload) => {
        const session = get().ensureSession()
        const assistantMessage: ChatMessage = {
          id: nanoid(),
          role: 'assistant',
          content: payload.reply,
          translation: payload.replyTranslation,
          feedback: payload.feedback,
          audioBase64: payload.audioBase64,
          createdAt: Date.now(),
        }
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
      updateSessionTitle: (sessionId, title) => {
        set((state) => ({
          sessions: state.sessions.map((session) =>
            session.id === sessionId ? { ...session, title } : session,
          ),
        }))
      },
      markSending: (flag) => set({ isSending: flag }),
      setConversationStyle: (style) => set({ conversationStyle: style }),
      addFavoriteFromMessage: (messageId, type, text, translation) => {
        const session = get().ensureSession()
        const target = session.messages.find((m) => m.id === messageId)
        if (!target) return
        const favorite: FavoriteItem = {
          id: nanoid(),
          text,
          translation,
          source: type === 'reply' ? 'ai-reply' : 'ai-feedback',
          mastery: 'new',
          reviewCount: 0,
          createdAt: Date.now(),
          style: get().conversationStyle,
        }
        set((state) => ({ favorites: [favorite, ...state.favorites] }))
      },
      addFavoriteFromFeedback: (originalText, correctedSentence, explanation) => {
        if (!originalText.trim()) return
        const favorite: FavoriteItem = {
          id: nanoid(),
          text: originalText.trim(),
          translation: correctedSentence || undefined,
          note: explanation || undefined,
          source: 'ai-feedback',
          mastery: 'new',
          reviewCount: 0,
          createdAt: Date.now(),
          style: get().conversationStyle,
        }
        set((state) => ({ favorites: [favorite, ...state.favorites] }))
      },
      addFavoriteFromSelection: (text, translation) => {
        if (!text.trim()) return
        const favorite: FavoriteItem = {
          id: nanoid(),
          text: text.trim(),
          translation,
          source: 'selection',
          mastery: 'new',
          reviewCount: 0,
          createdAt: Date.now(),
          style: get().conversationStyle,
        }
        set((state) => ({ favorites: [favorite, ...state.favorites] }))
      },
      removeFavorite: (favoriteId) => {
        set((state) => ({ favorites: state.favorites.filter((f) => f.id !== favoriteId) }))
      },
      updateFavoriteMastery: (favoriteId, isCorrect) => {
        set((state) => ({
          favorites: state.favorites.map((fav) => {
            if (fav.id !== favoriteId) return fav
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
            return {
              ...fav,
              mastery: newMastery,
              reviewCount: newReviewCount,
              lastReviewedAt: Date.now(),
            }
          }),
        }))
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
      getActiveSession: () => get().ensureSession(),
      rollingWindow: () => {
        const session = get().ensureSession()
        return session.messages.slice(-12)
      },
    }),
    {
      name: 'jpchat-store',
      storage: createJSONStorage(safeStorage),
      partialize: (state) => ({
        sessions: state.sessions,
        activeSessionId: state.activeSessionId,
        favorites: state.favorites,
        conversationStyle: state.conversationStyle,
      }),
    },
  ),
)
