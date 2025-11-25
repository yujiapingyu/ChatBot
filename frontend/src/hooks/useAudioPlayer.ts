import { useCallback, useRef, useState } from 'react'

export const useAudioPlayer = () => {
  const contextRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const [currentId, setCurrentId] = useState<string | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)

  const stop = useCallback(() => {
    sourceRef.current?.stop()
    sourceRef.current = null
    setIsPlaying(false)
    setCurrentId(null)
  }, [])

  const playBase64 = useCallback(async (messageId: string, base64: string) => {
    if (!base64) return
    if (typeof window === 'undefined') return
    if (!contextRef.current) {
      const AudioCtx = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioCtx) return
      contextRef.current = new AudioCtx()
    }
    if (sourceRef.current) {
      stop()
    }
    const binary = atob(base64)
    const len = binary.length
    const buffer = new Uint8Array(len)
    for (let i = 0; i < len; i += 1) {
      buffer[i] = binary.charCodeAt(i)
    }
    const audioBuffer = await contextRef.current.decodeAudioData(buffer.buffer)
    const source = contextRef.current.createBufferSource()
    source.buffer = audioBuffer
    source.connect(contextRef.current.destination)
    source.start()
    source.onended = () => {
      setIsPlaying(false)
      setCurrentId(null)
      sourceRef.current = null
    }
    sourceRef.current = source
    setIsPlaying(true)
    setCurrentId(messageId)
  }, [stop])

  return { isPlaying, currentId, playBase64, stop }
}
