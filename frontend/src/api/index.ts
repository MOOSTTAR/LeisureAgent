import { get, post, put, del } from './client'

// ==================== Types ====================

export interface Restaurant {
  id: number
  name: string
  address: string
  x: number
  y: number
  cuisine_type: string | null
  dining_style: number
  tags: string[]
  business_hours: string | null
  booking_hours: string | null
  current_booking_count: number
  max_booking_count: number
  queue_time: number
  indoor_env: string | null
}

export interface Park {
  id: number
  name: string
  address: string
  x: number
  y: number
  spot_type: string | null
  business_hours: string | null
  booking_hours: string | null
  current_booking_count: number
  max_booking_count: number
  crowd_density: number
}

export interface Mall {
  id: number
  name: string
  address: string
  x: number
  y: number
  cinema_has: number
  supermarket_has: number
}

export interface ExhibitionHall {
  id: number
  name: string
  address: string
  x: number
  y: number
  hall_type: string | null
  business_hours: string | null
  booking_hours: string | null
  current_booking_count: number
  max_booking_count: number
  exhibition_theme: string | null
  ticket_type: number
  ticket_price: number | null
  manual_guide: number
  interactive_project: number
  crowd_level: number
}

export interface AmusementPark {
  id: number
  name: string
  address: string
  x: number
  y: number
  business_hours: string | null
  booking_hours: string | null
  current_booking_count: number
  max_booking_count: number
  park_theme: string | null
  ticket_price: number
  queue_time: number
  performance_info: string | null
}

export interface TravelPlan {
  id: number
  plan_title: string
  plan_desc: string | null
  travel_days: number
  travel_type: string | null
  travel_date: string | null
  total_cost: number
  created_at: string
  updated_at: string
}

export interface TravelPlanItem {
  id: number
  plan_id: number
  location_table_name: string
  location_id: number
  day_num: number
  arrive_time: string | null
  leave_time: string | null
  stay_minute: number
  remark: string | null
  is_need_booking: number
  is_had_booking: number
  created_at: string
  updated_at: string
}

export interface ResolvedLocation {
  name: string
  address: string
  typeLabel: string
  subtypeLabel: string | null
  theme: 'orange' | 'emerald' | 'pink' | 'violet' | 'amber'
}

// ==================== Param Types ====================

interface GetRestaurantsParams {
  name?: string
  cuisine_type?: string
  dining_style?: number
  distance?: '<200m' | '<500m' | '<1.0km' | '<2.0km' | 'other'
  page?: number
  page_size?: number
}

interface GetParksParams {
  name?: string
  spot_type?: string
  crowd_level?: number
  distance?: '<200m' | '<500m' | '<1.0km' | '<2.0km' | 'other'
  page?: number
  page_size?: number
}

interface GetMallsParams {
  name?: string
  has_cinema?: boolean
  has_supermarket?: boolean
  distance?: '<200m' | '<500m' | '<1.0km' | '<2.0km' | 'other'
  page?: number
  page_size?: number
}

interface GetExhibitionsParams {
  name?: string
  hall_type?: string
  free_entry?: boolean
  distance?: '<200m' | '<500m' | '<1.0km' | '<2.0km' | 'other'
  page?: number
  page_size?: number
}

interface GetAmusementParksParams {
  name?: string
  park_theme?: string
  free_entry?: boolean
  distance?: '<200m' | '<500m' | '<1.0km' | '<2.0km' | 'other'
  page?: number
  page_size?: number
}

export interface GetTravelPlansParams {
  title?: string
  travel_type?: string
  travel_date?: string
  page?: number
  page_size?: number
}

// ==================== Response Types ====================

interface ListResponse<T> {
  code: number
  data: { list: T[]; total: number; page: number; page_size: number }
  msg: string
}

interface ItemResponse<T> {
  code: number
  data: T | null
  msg: string
}

interface CreateResponse {
  code: number
  data: { id: number }
  msg: string
}

interface UpdateDeleteResponse {
  code: number
  data: null
  msg: string
}

// ==================== Restaurants ====================

const R = '/api/restaurants'

export async function getRestaurants(params: GetRestaurantsParams): Promise<ListResponse<Restaurant>> {
  return get<ListResponse<Restaurant>>(R, params as Record<string, unknown>)
}

export async function getRestaurantById(id: number): Promise<ItemResponse<Restaurant>> {
  return get<ItemResponse<Restaurant>>(`${R}/${id}`)
}

export async function createRestaurant(data: Omit<Restaurant, 'id'>): Promise<CreateResponse> {
  return post<CreateResponse>(R, data)
}

export async function updateRestaurant(id: number, data: Partial<Omit<Restaurant, 'id'>>): Promise<UpdateDeleteResponse> {
  return put<UpdateDeleteResponse>(`${R}/${id}`, data)
}

export async function deleteRestaurant(id: number): Promise<UpdateDeleteResponse> {
  return del<UpdateDeleteResponse>(`${R}/${id}`)
}

export async function getBookingRestaurants(params: { page?: number; page_size?: number } = {}): Promise<ListResponse<Restaurant>> {
  return get<ListResponse<Restaurant>>(`${R}/get_booking_list`, params as Record<string, unknown>)
}

// ==================== Parks ====================

const PARK = '/api/parks'

export async function getParks(params: GetParksParams): Promise<ListResponse<Park>> {
  return get<ListResponse<Park>>(PARK, params as Record<string, unknown>)
}

export async function getParkById(id: number): Promise<ItemResponse<Park>> {
  return get<ItemResponse<Park>>(`${PARK}/${id}`)
}

export async function createPark(data: Omit<Park, 'id'>): Promise<CreateResponse> {
  return post<CreateResponse>(PARK, data)
}

export async function updatePark(id: number, data: Partial<Omit<Park, 'id'>>): Promise<UpdateDeleteResponse> {
  return put<UpdateDeleteResponse>(`${PARK}/${id}`, data)
}

export async function deletePark(id: number): Promise<UpdateDeleteResponse> {
  return del<UpdateDeleteResponse>(`${PARK}/${id}`)
}

export async function getBookingParks(params: { page?: number; page_size?: number } = {}): Promise<ListResponse<Park>> {
  return get<ListResponse<Park>>(`${PARK}/get_booking_list`, params as Record<string, unknown>)
}

// ==================== Malls ====================

const M = '/api/malls'

export async function getMalls(params: GetMallsParams): Promise<ListResponse<Mall>> {
  return get<ListResponse<Mall>>(M, params as Record<string, unknown>)
}

export async function getMallById(id: number): Promise<ItemResponse<Mall>> {
  return get<ItemResponse<Mall>>(`${M}/${id}`)
}

export async function createMall(data: Omit<Mall, 'id'>): Promise<CreateResponse> {
  return post<CreateResponse>(M, data)
}

export async function updateMall(id: number, data: Partial<Omit<Mall, 'id'>>): Promise<UpdateDeleteResponse> {
  return put<UpdateDeleteResponse>(`${M}/${id}`, data)
}

export async function deleteMall(id: number): Promise<UpdateDeleteResponse> {
  return del<UpdateDeleteResponse>(`${M}/${id}`)
}

// ==================== Exhibition Halls ====================

const EH = '/api/exhibition-halls'

export async function getExhibitions(params: GetExhibitionsParams): Promise<ListResponse<ExhibitionHall>> {
  return get<ListResponse<ExhibitionHall>>(EH, params as Record<string, unknown>)
}

export async function getExhibitionById(id: number): Promise<ItemResponse<ExhibitionHall>> {
  return get<ItemResponse<ExhibitionHall>>(`${EH}/${id}`)
}

export async function createExhibition(data: Omit<ExhibitionHall, 'id'>): Promise<CreateResponse> {
  return post<CreateResponse>(EH, data)
}

export async function updateExhibition(id: number, data: Partial<Omit<ExhibitionHall, 'id'>>): Promise<UpdateDeleteResponse> {
  return put<UpdateDeleteResponse>(`${EH}/${id}`, data)
}

export async function deleteExhibition(id: number): Promise<UpdateDeleteResponse> {
  return del<UpdateDeleteResponse>(`${EH}/${id}`)
}

export async function getBookingExhibitions(params: { page?: number; page_size?: number } = {}): Promise<ListResponse<ExhibitionHall>> {
  return get<ListResponse<ExhibitionHall>>(`${EH}/get_booking_list`, params as Record<string, unknown>)
}

// ==================== Amusement Parks ====================

const AP = '/api/amusement-parks'

export async function getAmusementParks(params: GetAmusementParksParams): Promise<ListResponse<AmusementPark>> {
  return get<ListResponse<AmusementPark>>(AP, params as Record<string, unknown>)
}

export async function getAmusementParkById(id: number): Promise<ItemResponse<AmusementPark>> {
  return get<ItemResponse<AmusementPark>>(`${AP}/${id}`)
}

export async function createAmusementPark(data: Omit<AmusementPark, 'id'>): Promise<CreateResponse> {
  return post<CreateResponse>(AP, data)
}

export async function updateAmusementPark(id: number, data: Partial<Omit<AmusementPark, 'id'>>): Promise<UpdateDeleteResponse> {
  return put<UpdateDeleteResponse>(`${AP}/${id}`, data)
}

export async function deleteAmusementPark(id: number): Promise<UpdateDeleteResponse> {
  return del<UpdateDeleteResponse>(`${AP}/${id}`)
}

export async function getBookingAmusementParks(params: { page?: number; page_size?: number } = {}): Promise<ListResponse<AmusementPark>> {
  return get<ListResponse<AmusementPark>>(`${AP}/get_booking_list`, params as Record<string, unknown>)
}

// ==================== Travel Plans ====================

const TP = '/api/travel-plans'

export async function getTravelPlans(params: GetTravelPlansParams = {}): Promise<ListResponse<TravelPlan>> {
  return get<ListResponse<TravelPlan>>(TP, params as Record<string, unknown>)
}

export async function getTravelPlanById(id: number): Promise<ItemResponse<TravelPlan>> {
  return get<ItemResponse<TravelPlan>>(`${TP}/${id}`)
}

export async function createTravelPlan(data: Omit<TravelPlan, 'id' | 'created_at' | 'updated_at'>): Promise<CreateResponse> {
  return post<CreateResponse>(TP, data)
}

export async function updateTravelPlan(id: number, data: Partial<Omit<TravelPlan, 'id' | 'created_at' | 'updated_at'>>): Promise<UpdateDeleteResponse> {
  return put<UpdateDeleteResponse>(`${TP}/${id}`, data)
}

export async function deleteTravelPlan(id: number): Promise<UpdateDeleteResponse> {
  return del<UpdateDeleteResponse>(`${TP}/${id}`)
}

// ==================== Travel Plan Items ====================

const TPI = '/api/travel-plan-items'

export async function getTravelPlanItems(params: { plan_id?: number; page?: number; page_size?: number } = {}): Promise<ListResponse<TravelPlanItem>> {
  return get<ListResponse<TravelPlanItem>>(TPI, params as Record<string, unknown>)
}

export async function getTravelPlanItemById(id: number): Promise<ItemResponse<TravelPlanItem>> {
  return get<ItemResponse<TravelPlanItem>>(`${TPI}/${id}`)
}

export async function addTravelPlanItem(params: {
  plan_id: number
  location_table_name: string
  location_id: number
  day_num?: number
  arrive_time?: string | null
  leave_time?: string | null
  stay_minute?: number
  remark?: string | null
  is_need_booking?: number
  is_had_booking?: number
}): Promise<CreateResponse> {
  return post<CreateResponse>(TPI, params)
}

export async function updateTravelPlanItem(id: number, data: Partial<Omit<TravelPlanItem, 'id' | 'created_at' | 'updated_at'>>): Promise<UpdateDeleteResponse> {
  return put<UpdateDeleteResponse>(`${TPI}/${id}`, data)
}

export async function deleteTravelPlanItem(id: number): Promise<UpdateDeleteResponse> {
  return del<UpdateDeleteResponse>(`${TPI}/${id}`)
}

export async function confirmBooking(itemId: number): Promise<UpdateDeleteResponse> {
  return post<UpdateDeleteResponse>(`/api/booking/confirm/${itemId}`)
}

export async function cancelBooking(itemId: number): Promise<UpdateDeleteResponse> {
  return post<UpdateDeleteResponse>(`/api/booking/cancel/${itemId}`)
}

// ==================== Agent Types ====================

export interface AgentSession {
  id: number
  title: string
  last_message: string | null
  travel_plan_id: number | null
  status: number
  created_at: string | null
  updated_at: string | null
}

export interface AgentMessage {
  role: string
  content: string
  metadata: Record<string, unknown>
  created_at: string
}

export interface AgentSessionDetail extends AgentSession {
  messages: AgentMessage[]
}

export interface AgentPlanItem {
  step_order: number
  activity_type: string
  location_table_name: string
  location_id: number
  location_name: string
  address: string
  arrive_time: string
  leave_time: string
  stay_minute: number
  remark: string
  estimated_cost: number
}

export interface AgentPlan {
  id: number | null
  title: string
  description: string
  scenario: string
  travel_type: string
  total_cost: number
  items: AgentPlanItem[]
  share_text: string
  share_url: string
}

export interface TokenEvent {
  node: string
  current_step: string
  message: string
}

export interface ExecuteResult {
  location_table_name: string
  location_id: number
  location_name: string
  status: string
  message: string
}

interface ExecuteResponse {
  code: number
  data: ExecuteResult[]
  msg: string
}

// ==================== Agent APIs ====================

export async function getAgentSessions(): Promise<ListResponse<AgentSession>> {
  return get<ListResponse<AgentSession>>('/api/agent/sessions')
}

export async function getAgentSession(id: number): Promise<ItemResponse<AgentSessionDetail>> {
  return get<ItemResponse<AgentSessionDetail>>(`/api/agent/sessions/${id}`)
}

export async function deleteAgentSession(id: number): Promise<UpdateDeleteResponse> {
  return del<UpdateDeleteResponse>(`/api/agent/sessions/${id}`)
}

export async function executePlan(planId: number): Promise<ExecuteResponse> {
  return post<ExecuteResponse>(`/api/agent/plans/${planId}/execute`)
}

export async function getPlanShare(planId: number): Promise<ItemResponse<unknown>> {
  return get<ItemResponse<unknown>>(`/api/agent/plans/${planId}/share`)
}

export async function chatStream(
  message: string,
  sessionId: number,
  callbacks: {
    onToken?: (data: TokenEvent) => void
    onPlan?: (plan: AgentPlan) => void
    onDone?: () => void
    onError?: (message: string) => void
  },
  signal?: AbortSignal,
): Promise<void> {
  const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''
  const res = await fetch(`${BASE_URL}/api/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, session_id: sessionId }),
    signal,
  })

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    callbacks.onError?.(body.msg || body.detail || `请求失败 (${res.status})`)
    return
  }

  const reader = res.body!.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      let currentEvent = ''
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        } else if (line.startsWith('data: ')) {
          try {
            const parsed = JSON.parse(line.slice(6))
            switch (currentEvent) {
              case 'token':
                callbacks.onToken?.(parsed)
                break
              case 'plan':
                callbacks.onPlan?.(parsed)
                break
              case 'done':
                callbacks.onDone?.()
                break
              case 'error':
                callbacks.onError?.(parsed.message || '未知错误')
                break
            }
          } catch { /* skip unparseable data */ }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

// ==================== resolveLocation (async) ====================

const TABLE_NAME_LABELS: Record<string, { typeLabel: string; theme: ResolvedLocation['theme'] }> = {
  restaurant: { typeLabel: '餐厅', theme: 'orange' },
  scenic_spot: { typeLabel: '景点', theme: 'emerald' },
  mall: { typeLabel: '商场', theme: 'pink' },
  exhibition_hall: { typeLabel: '展馆', theme: 'violet' },
  amusement_park: { typeLabel: '乐园', theme: 'amber' },
}

export async function resolveLocation(tableName: string, locationId: number): Promise<ResolvedLocation | null> {
  const labelInfo = TABLE_NAME_LABELS[tableName]
  if (!labelInfo) return null

  let found: { name: string; address: string; subtypeLabel?: string } | null = null

  switch (tableName) {
    case 'restaurant': {
      const res = await getRestaurantById(locationId)
      if (res.code === 0 && res.data) {
        found = { name: res.data.name, address: res.data.address, subtypeLabel: res.data.cuisine_type ?? undefined }
      }
      break
    }
    case 'scenic_spot': {
      const res = await getParkById(locationId)
      if (res.code === 0 && res.data) {
        found = { name: res.data.name, address: res.data.address, subtypeLabel: res.data.spot_type ?? undefined }
      }
      break
    }
    case 'mall': {
      const res = await getMallById(locationId)
      if (res.code === 0 && res.data) {
        found = { name: res.data.name, address: res.data.address }
      }
      break
    }
    case 'exhibition_hall': {
      const res = await getExhibitionById(locationId)
      if (res.code === 0 && res.data) {
        found = { name: res.data.name, address: res.data.address, subtypeLabel: res.data.hall_type ?? undefined }
      }
      break
    }
    case 'amusement_park': {
      const res = await getAmusementParkById(locationId)
      if (res.code === 0 && res.data) {
        found = { name: res.data.name, address: res.data.address, subtypeLabel: res.data.park_theme ?? undefined }
      }
      break
    }
  }

  if (!found) return null
  return {
    name: found.name,
    address: found.address,
    typeLabel: labelInfo.typeLabel,
    subtypeLabel: found.subtypeLabel ?? null,
    theme: labelInfo.theme,
  }
}
