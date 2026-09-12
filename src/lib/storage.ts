import type { EstimateRequest, StoredEstimate } from '../types'

const STORAGE_KEY = 'fixestimate-pay:history:v1'
const PENDING_KEY = 'fixestimate-pay:pending:v1'
const MAX_HISTORY = 12

export function loadHistory(): StoredEstimate[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]')
    return Array.isArray(value) ? value.slice(0, MAX_HISTORY) : []
  } catch {
    return []
  }
}

export function saveEstimate(estimate: StoredEstimate): StoredEstimate[] {
  const next = [estimate, ...loadHistory().filter((item) => item.id !== estimate.id)].slice(0, MAX_HISTORY)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  return next
}

export function loadPendingRequest(): EstimateRequest | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_KEY) ?? 'null') as Partial<EstimateRequest> | null
    if (!value || typeof value.requestId !== 'string' || typeof value.transactionHash !== 'string' || typeof value.walletAddress !== 'string' || typeof value.description !== 'string') return undefined
    if (!['plumbing', 'electrical', 'gas', 'hvac', 'roofing', 'flooring', 'painting', 'carpentry', 'drywall', 'general'].includes(value.category ?? '')) return undefined
    if (!['routine', 'soon', 'urgent'].includes(value.urgency ?? '')) return undefined
    return value as EstimateRequest
  } catch {
    return undefined
  }
}

export function savePendingRequest(request: EstimateRequest): void {
  const safeRequest = { ...request }
  delete safeRequest.imageDataUrl
  localStorage.setItem(PENDING_KEY, JSON.stringify(safeRequest))
}

export function clearPendingRequest(): void {
  localStorage.removeItem(PENDING_KEY)
}
