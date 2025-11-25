import { act } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useChatStore } from '@/store/useChatStore'

const renderStore = () => useChatStore.getState()

describe('useChatStore', () => {
  it('creates user and assistant messages', () => {
    act(() => {
      useChatStore.getState().appendUserMessage('こんにちは')
      useChatStore.getState().applyAiResponse({
        reply: 'こんにちは！',
        replyTranslation: '你好！',
        feedback: {
          correctedSentence: 'こんにちは！',
          explanation: '自然的打招呼方式',
          naturalnessScore: 95,
        },
      })
    })
    const session = renderStore().ensureSession()
    expect(session.messages).toHaveLength(3)
    expect(session.messages[0].role).toBe('assistant')
    expect(session.messages[2].feedback?.naturalnessScore).toBe(95)
  })
})
