import { useCallback, useRef, useState } from 'react'

type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance

interface SpeechRecognitionInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorPayload) => void) | null
  onresult: ((event: SpeechRecognitionEventPayload) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

interface SpeechRecognitionErrorPayload {
  error: string
}

interface SpeechRecognitionEventPayload {
  results: ArrayLike<{
    0?: { transcript: string }
  }>
}

const getSpeechRecognition = (): SpeechRecognitionConstructor | null => {
  if (typeof window === 'undefined') return null
  const globalWindow = window as typeof window & {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return globalWindow.SpeechRecognition ?? globalWindow.webkitSpeechRecognition ?? null
}

const SpeechRecognition = getSpeechRecognition()

interface UseSpeechRecognitionOptions {
  onResult: (text: string) => void
  onError?: (message: string) => void
}

export const useSpeechRecognition = ({ onResult, onError }: UseSpeechRecognitionOptions) => {
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const resultIndexRef = useRef(0) // 跟踪已处理的结果索引

  const start = useCallback(() => {
    if (!SpeechRecognition) {
      setError('当前浏览器不支持语音识别')
      return
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    
    // 重置结果索引
    resultIndexRef.current = 0
    
    const recognition = new SpeechRecognition()
    recognition.lang = 'ja-JP'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setError(null)
      setIsListening(true)
    }
    recognition.onerror = (event) => {
      const code = event.error
      const hints: Record<string, string> = {
        'no-speech': '没有检测到语音，请再试一次',
        'audio-capture': '未检测到麦克风，请检查设备',
        'not-allowed': '请允许浏览器访问麦克风',
      }
      const message = hints[code] ?? '语音识别出现问题'
      setError(message)
      onError?.(message)
      recognition.stop()
    }
    recognition.onresult = (event) => {
      // 只处理新的结果，从 resultIndexRef.current 开始
      const results = Array.from(event.results)
      const newResults = results.slice(resultIndexRef.current)
      
      // 更新已处理的结果索引
      resultIndexRef.current = results.length
      
      // 提取新结果的文本
      const newTexts = newResults
        .map((result) => result[0]?.transcript.trim())
        .filter(Boolean)
      
      const finalText = newTexts.join(' ').trim()
      if (finalText) {
        console.log('[SpeechRecognition] 新识别结果:', finalText)
        onResult(finalText)
      }
    }
    recognition.onend = () => {
      setIsListening(false)
      resultIndexRef.current = 0 // 重置索引
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [onError, onResult])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return {
    isSupported: Boolean(SpeechRecognition),
    isListening,
    error,
    start,
    stop,
  }
}
