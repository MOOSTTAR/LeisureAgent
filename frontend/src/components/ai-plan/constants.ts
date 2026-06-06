// AIPlanPage 共享常量

import type { AnimationType } from './types'

export const BUBBLE_COLORS = [
  'bg-blue-300/30',
  'bg-blue-300/20',
  'bg-indigo-300/30',
  'bg-indigo-300/20',
  'bg-sky-300/30',
  'bg-sky-300/20',
  'bg-purple-300/25',
  'bg-violet-300/25',
]

export const ANIMATION_TYPES: AnimationType[] = ['scale', 'translate', 'count', 'irregular']

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  play: '游玩',
  dining: '用餐',
  shopping: '购物',
  buffer: '休息',
}

export const TRAVEL_MODE_LABELS: Record<string, string> = {
  walking: '步行',
  biking: '骑车',
  driving: '开车',
  subway: '地铁',
}

export const TRAVEL_MODE_ICONS: Record<string, string> = {
  walking: '🚶',
  biking: '🚴',
  driving: '🚗',
  subway: '🚇',
}

export const TRAVEL_SPEEDS: Record<string, number> = {
  walking: 80, biking: 250, driving: 500, subway: 600,
}

export const TABLE_TYPE_INFO: Record<string, { typeLabel: string; theme: string; dot: string }> = {
  restaurant: { typeLabel: '餐厅', theme: 'bg-orange-50 text-orange-600 border-orange-200', dot: 'bg-orange-400' },
  scenic_spot: { typeLabel: '景点', theme: 'bg-emerald-50 text-emerald-600 border-emerald-200', dot: 'bg-emerald-400' },
  mall: { typeLabel: '商场', theme: 'bg-pink-50 text-pink-600 border-pink-200', dot: 'bg-pink-400' },
  exhibition_hall: { typeLabel: '展馆', theme: 'bg-violet-50 text-violet-600 border-violet-200', dot: 'bg-violet-400' },
  amusement_park: { typeLabel: '乐园', theme: 'bg-amber-50 text-amber-600 border-amber-200', dot: 'bg-amber-400' },
}

export const NODE_LABELS: Record<string, string> = {
  load_session: '正在加载会话数据...',
  classify_intent: '正在分类意图（Agent）...',
  analyze_goal: '正在解析出行需求（Agent 提取场景/偏好/天数）...',
  search_candidates: '正在搜索候选地点...',
  search_inquiry: '正在搜索...',
  detect_exceptions: '正在检查地点可用性...',
  adjust_search: '正在扩大搜索范围...',
  compose_plan: 'Agent 正在编排行程方案...',
  persist_plan: '正在保存方案到数据库...',
  present_plan: '正在整理方案...',
  present_inquiry: '正在整理搜索结果...',
  analyze_feedback: '正在理解修改意见（Agent）...',
  execute_bookings: '正在执行预约...',
  replan_execute: '正在重新规划替代方案...',
  finalize: '正在生成分享文案...',
  finalize_executed: '预约完成',
}

export const NODE_PHASES: Record<string, string> = {
  load_session: 'load',
  classify_intent: 'classify',
  analyze_goal: 'analyze',
  search_candidates: 'search',
  search_inquiry: 'search',
  detect_exceptions: 'detect',
  adjust_search: 'adjust',
  compose_plan: 'compose',
  persist_plan: 'persist',
  present_plan: 'present',
  present_inquiry: 'present',
  analyze_feedback: 'feedback',
  execute_bookings: 'execute',
  replan_execute: 'execute',
  finalize: 'finalize',
  finalize_executed: 'finalize',
  direct_reply: 'reply',
}

export function calcDist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2)
}

export function estTravelMins(dist: number, mode: string): number {
  if (!mode || !TRAVEL_SPEEDS[mode]) return 0
  let mins = dist / TRAVEL_SPEEDS[mode]
  if (mode === 'subway') mins += 10
  return Math.max(1, Math.round(mins))
}
