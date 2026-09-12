import type { EstimateRequest, EstimateResult } from '../types'

const DEMO_RESULTS = {
  plumbing: { title: 'Possible sink supply-line leak', low: 135, high: 425, causes: ['Loose compression fitting', 'Worn supply-line seal', 'Damaged shutoff valve'] },
  electrical: { title: 'Possible branch-circuit fault', low: 175, high: 650, causes: ['Loose device connection', 'Failed receptacle or switch', 'Overloaded circuit'] },
  gas: { title: 'Possible gas-system concern', low: 175, high: 1_200, causes: ['Appliance connection issue', 'Failed shutoff or regulator', 'Combustion equipment fault'] },
  hvac: { title: 'Possible airflow or cooling fault', low: 190, high: 1_250, causes: ['Restricted filter or coil', 'Condensate blockage', 'Electrical component failure'] },
  roofing: { title: 'Possible localized roof leak', low: 350, high: 1_800, causes: ['Failed flashing', 'Damaged shingles', 'Vent boot deterioration'] },
  flooring: { title: 'Flooring repair assessment', low: 175, high: 1_500, causes: ['Surface wear or impact damage', 'Moisture movement', 'Subfloor or installation issue'] },
  painting: { title: 'Painting and finish assessment', low: 150, high: 1_200, causes: ['Normal finish wear', 'Poor surface preparation', 'Moisture or adhesion failure'] },
  carpentry: { title: 'Carpentry repair assessment', low: 200, high: 1_800, causes: ['Loose or failed fastener', 'Wood movement or wear', 'Moisture-related deterioration'] },
  drywall: { title: 'Drywall repair assessment', low: 150, high: 950, causes: ['Impact damage', 'Fastener movement', 'Moisture or framing movement'] },
  general: { title: 'General repair assessment', low: 150, high: 900, causes: ['Normal wear', 'Moisture intrusion', 'Failed fixture or fastener'] },
} as const

export function createDemoEstimate(request: EstimateRequest): EstimateResult {
  const preset = DEMO_RESULTS[request.category]
  const professionalOnly = request.category === 'electrical' || request.category === 'gas' || request.category === 'roofing'
  return {
    id: request.requestId,
    title: preset.title,
    summary: `Based on your description, this appears consistent with ${preset.causes[0].toLowerCase()}. A hands-on inspection is required before work begins.`,
    urgency: request.urgency,
    lowEstimate: preset.low,
    highEstimate: preset.high,
    likelyCauses: [...preset.causes],
    safetySteps: ['Keep people away from the affected area.', 'Shut off the relevant water, power, or equipment if it is safe to do so.', 'Contact emergency services for fire, gas odor, sparking, or immediate structural danger.'],
    professionalRequired: professionalOnly,
    difficulty: professionalOnly ? 'professional-only' : 'moderate',
    estimatedTime: professionalOnly ? 'Professional assessment required' : '30–90 minutes after diagnosis',
    parts: request.category === 'plumbing' ? ['Matching braided faucet supply line, if inspection confirms failure'] : ['Replacement component after exact model and failure are confirmed'],
    materials: ['Clean towels or absorbent pads', 'Manufacturer-approved seal or fastener, only if specified'],
    tools: ['Flashlight', 'Safety glasses', 'Phone camera for documentation'],
    repairSteps: professionalOnly
      ? ['Keep clear of the affected area and do not open, climb, or disassemble anything.', 'Document visible symptoms from a safe location and contact an appropriately licensed professional.']
      : ['Shut off the affected fixture or equipment and verify the area is safe and dry.', 'Inspect accessible components without forcing, cutting, or opening concealed systems.', 'Match any replacement part by manufacturer, model, size, and connection type.', 'Install according to the manufacturer instructions without overtightening.', 'Restore service slowly, observe the repair, and check again after 15 minutes.'],
    stopConditions: ['Stop if the source differs from the visible problem or concealed damage appears.', 'Stop for gas odor, heat, sparking, damaged wiring, structural movement, sewage, or uncontrolled water.'],
    scopeItems: ['Inspect and document the affected area', 'Confirm the source and extent of damage', 'Repair or replace the failed component', 'Test the completed repair', 'Clean the work area and provide photos'],
    questionsForContractor: ['Is this estimate labor and materials?', 'Could concealed damage change the price?', 'What warranty applies to the repair?'],
    createdAt: new Date().toISOString(),
    demo: true,
  }
}

export async function requestEstimate(request: EstimateRequest, apiBaseUrl: string): Promise<EstimateResult> {
  const response = await fetch(`${apiBaseUrl}/estimate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  })
  const payload = await response.json().catch(() => null) as { estimate?: EstimateResult; error?: string } | null
  if (!response.ok || !payload?.estimate) throw new Error(payload?.error || 'The estimate service is temporarily unavailable.')
  return payload.estimate
}
