import type { AiResponsePayload, ChatMessage, ConversationStyle } from '@/types/chat'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

const toJson = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const message = await response.text()
    throw new Error(message || '请求 Gemini 服务失败')
  }
  return response.json() as Promise<T>
}

export const requestChat = async (
  sessionId: string,
  messages: ChatMessage[],
  style: ConversationStyle,
): Promise<AiResponsePayload> => {
  const payload = {
    sessionId,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    style,
  }
  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  return toJson<AiResponsePayload>(response)
}

export const requestTts = async (text: string): Promise<string> => {
  const response = await fetch(`${BASE_URL}/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  const data = await toJson<{ audioBase64: string }>(response)
  return data.audioBase64
}

export const requestTitle = async (transcript: string): Promise<string> => {
  const response = await fetch(`${BASE_URL}/title`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transcript }),
  })
  const data = await toJson<{ title: string }>(response)
  return data.title
}
