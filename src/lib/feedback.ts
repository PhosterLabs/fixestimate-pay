import type { EstimateResult, ReportFeedback } from '../types'

export async function submitFeedback(estimate: EstimateResult, feedback: ReportFeedback, apiBaseUrl: string): Promise<void> {
  if (!estimate.transactionHash) throw new Error('Feedback is available for paid reports.')
  const response = await fetch(`${apiBaseUrl}/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId: estimate.id, transactionHash: estimate.transactionHash, ...feedback }),
  })
  const payload = await response.json().catch(() => null) as { error?: string } | null
  if (!response.ok) throw new Error(payload?.error || 'Feedback could not be saved.')
}
