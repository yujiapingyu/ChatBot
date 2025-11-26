import api from './auth'
import type { ChatSession, ChatMessage, FavoriteItem } from '@/types/chat'

// Session API 响应类型
interface SessionResponse {
  id: string
  title: string
  conversation_style: string
  created_at: string
  updated_at: string
}

interface MessageResponse {
  id: string
  role: string
  content: string
  translation?: string
  feedback?: {
    correctedSentence: string
    explanation: string
    naturalnessScore: number
  }
  audio_base64?: string
  created_at: string
}

interface SessionWithMessages extends SessionResponse {
  messages: MessageResponse[]
}

interface FavoriteResponse {
  id: string
  text: string
  translation?: string
  source: string
  mastery: string
  review_count: number
  created_at: string
  last_reviewed_at?: string
}

// 类型转换函数
const toClientSession = (session: SessionResponse): ChatSession => ({
  id: session.id,
  title: session.title,
  createdAt: new Date(session.created_at).getTime(),
  updatedAt: new Date(session.updated_at).getTime(),
  messages: [],
})

const toClientSessionWithMessages = (session: SessionWithMessages): ChatSession => ({
  id: session.id,
  title: session.title,
  createdAt: new Date(session.created_at).getTime(),
  updatedAt: new Date(session.updated_at).getTime(),
  messages: session.messages.map(toClientMessage),
})

const toClientMessage = (msg: MessageResponse): ChatMessage => ({
  id: msg.id,
  role: msg.role as 'user' | 'assistant',
  content: msg.content,
  translation: msg.translation,
  feedback: msg.feedback,
  audioBase64: msg.audio_base64,
  createdAt: new Date(msg.created_at).getTime(),
})

const toClientFavorite = (fav: FavoriteResponse): FavoriteItem => ({
  id: fav.id,
  text: fav.text,
  translation: fav.translation,
  source: fav.source as 'ai-reply' | 'ai-feedback' | 'selection',
  mastery: fav.mastery as 'new' | 'learning' | 'review' | 'mastered',
  reviewCount: fav.review_count,
  createdAt: new Date(fav.created_at).getTime(),
  lastReviewedAt: fav.last_reviewed_at ? new Date(fav.last_reviewed_at).getTime() : undefined,
})

// Session API
export const sessionApi = {
  // 获取所有会话
  getSessions: async (): Promise<ChatSession[]> => {
    const response = await api.get<SessionResponse[]>('/api/sessions/')
    return response.data.map(toClientSession)
  },

  // 创建会话
  createSession: async (title = '新的对话', conversationStyle = 'casual'): Promise<ChatSession> => {
    const response = await api.post<SessionResponse>('/api/sessions/', {
      title,
      conversation_style: conversationStyle,
    })
    return toClientSession(response.data)
  },

  // 获取会话详情（含消息）
  getSession: async (sessionId: string): Promise<ChatSession> => {
    const response = await api.get<SessionWithMessages>(`/api/sessions/${sessionId}`)
    return toClientSessionWithMessages(response.data)
  },

  // 删除会话
  deleteSession: async (sessionId: string): Promise<void> => {
    await api.delete(`/api/sessions/${sessionId}`)
  },

  // 更新会话标题
  updateTitle: async (sessionId: string, title: string): Promise<void> => {
    await api.put(`/api/sessions/${sessionId}/title`, { title })
  },

  // 添加消息
  addMessage: async (
    sessionId: string,
    message: {
      role: 'user' | 'assistant'
      content: string
      translation?: string
      feedback?: ChatMessage['feedback']
      audio_base64?: string
    }
  ): Promise<ChatMessage> => {
    const response = await api.post<MessageResponse>(`/api/sessions/${sessionId}/messages`, {
      role: message.role,
      content: message.content,
      translation: message.translation,
      feedback: message.feedback,
      audio_base64: message.audio_base64,
    })
    return toClientMessage(response.data)
  },
}

// Favorite API
export const favoriteApi = {
  // 获取所有收藏
  getFavorites: async (): Promise<FavoriteItem[]> => {
    const response = await api.get<FavoriteResponse[]>('/api/favorites/')
    return response.data.map(toClientFavorite)
  },

  // 创建收藏
  createFavorite: async (favorite: {
    text: string
    translation?: string
    source: string
  }): Promise<FavoriteItem> => {
    const response = await api.post<FavoriteResponse>('/api/favorites/', favorite)
    return toClientFavorite(response.data)
  },

  // 删除收藏
  deleteFavorite: async (favoriteId: string): Promise<void> => {
    await api.delete(`/api/favorites/${favoriteId}`)
  },

  // 更新熟练度
  updateMastery: async (
    favoriteId: string,
    mastery: 'new' | 'learning' | 'review' | 'mastered',
    reviewCount: number
  ): Promise<FavoriteItem> => {
    const response = await api.put<FavoriteResponse>(`/api/favorites/${favoriteId}`, {
      mastery,
      review_count: reviewCount,
      last_reviewed_at: new Date().toISOString(),
    })
    return toClientFavorite(response.data)
  },
}
