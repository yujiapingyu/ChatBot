declare global {
  interface Window {
    webkitSpeechRecognition?: typeof SpeechRecognition
  }

  interface SpeechRecognitionEvent extends Event {
    readonly results: SpeechRecognitionResultList
  }
}

export {}
