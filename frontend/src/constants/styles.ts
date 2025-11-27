import type { ConversationStyle } from '@/types/chat'

export const STYLE_OPTIONS: ReadonlyArray<{
  value: ConversationStyle
  label: string
  description: string
  icon: string
}> = [
  // {
  //   value: 'casual',
  //   label: '轻松',
  //   description: '亲切自然，类似朋友之间的轻松语气',
  //   icon: '😊',
  // },
  // {
  //   value: 'formal',
  //   label: '正式',
  //   description: '敬语礼貌，适合商务、面试或考试',
  //   icon: '💼',
  // },
]

export const STYLE_LABELS: Record<ConversationStyle, string> = {
  casual: '日常会话',
  formal: '正式会话',
}
