export type MessageRole = 'user' | 'assistant'
export type ConversationStyle = 'casual' | 'formal'

export interface FeedbackPayload {
  correctedSentence: string
  explanation: string
  naturalnessScore: number
}

export interface AiResponsePayload {
  reply: string
  replyTranslation: string
  feedback: FeedbackPayload
  audioBase64?: string
}

export interface ChatMessage {
  id: string
  role: MessageRole
  content: string
  translation?: string
  createdAt: number
  feedback?: FeedbackPayload
  audioBase64?: string
  isStreaming?: boolean
}

export interface ChatSession {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  messages: ChatMessage[]
}

export type FavoriteSource = 'ai-reply' | 'ai-feedback' | 'selection'

export interface FavoriteItem {
  id: string
  text: string
  translation?: string
  source: FavoriteSource
  note?: string
  mastery: 'new' | 'learning' | 'review' | 'mastered'
  createdAt: number
  lastReviewedAt?: number
  reviewCount: number
  style?: ConversationStyle
}

export interface SelectionBookmarkPayload {
  text: string
  translation?: string
  sourceMessageId: string
}
