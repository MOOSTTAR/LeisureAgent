// AIPlanPage 共享类型

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export type AnimationType = 'scale' | 'translate' | 'count' | 'irregular'

export interface BubbleConfig {
  size: number
  color: string
  offsetX: number
  offsetY: number
  animationType: AnimationType
  speed: number
  amplitude: number
  initialRotation: number
}
