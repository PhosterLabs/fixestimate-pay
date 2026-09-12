export type RepairCategory = 'plumbing' | 'electrical' | 'gas' | 'hvac' | 'roofing' | 'flooring' | 'painting' | 'carpentry' | 'drywall' | 'general'
export type Urgency = 'routine' | 'soon' | 'urgent'

export interface EstimateRequest {
  requestId: string
  category: RepairCategory
  urgency: Urgency
  description: string
  details?: Record<string, string>
  postalPrefix?: string
  imageDataUrl?: string
  walletAddress?: string
  transactionHash?: string
  demo?: boolean
}

export interface ReportFeedback {
  helpful?: boolean
  priceAccuracy?: 'about-right' | 'lower-than-expected' | 'higher-than-expected'
  resolved?: boolean
}

export interface EstimateResult {
  id: string
  title: string
  summary: string
  urgency: Urgency
  lowEstimate: number
  highEstimate: number
  likelyCauses: string[]
  safetySteps: string[]
  professionalRequired: boolean
  difficulty: 'easy' | 'moderate' | 'advanced' | 'professional-only'
  estimatedTime: string
  parts: string[]
  materials: string[]
  tools: string[]
  repairSteps: string[]
  stopConditions: string[]
  scopeItems: string[]
  questionsForContractor: string[]
  createdAt: string
  transactionHash?: string
  demo?: boolean
}

export interface StoredEstimate extends EstimateResult {
  category: RepairCategory
}
