const parsePositiveInteger = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback
}

export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  recipient: (import.meta.env.VITE_NIMIQ_RECIPIENT || '').trim(),
  reportPriceLuna: parsePositiveInteger(import.meta.env.VITE_REPORT_PRICE_LUNA, 100_000),
  demoEnabled: import.meta.env.VITE_ENABLE_DEMO === 'true',
}

export const formatNim = (luna: number) => `${(luna / 100_000).toLocaleString(undefined, { maximumFractionDigits: 5 })} NIM`
