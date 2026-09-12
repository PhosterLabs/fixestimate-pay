import { GoogleGenAI } from '@google/genai'
import { getApps, initializeApp } from 'firebase-admin/app'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { defineSecret, defineString } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'
import { z } from 'zod'
import { verifyNimPayment } from './payment.js'
import { buildContents, estimateSchema } from './prompt.js'

if (!getApps().length) initializeApp()

const geminiApiKey = defineSecret('GEMINI_API_KEY')
const nimiqRpcUrl = defineSecret('NIMIQ_RPC_URL')
const recipient = defineString('NIMIQ_RECIPIENT')
const priceLuna = defineString('REPORT_PRICE_LUNA', { default: '10000' })
const allowedOrigin = defineString('ALLOWED_ORIGIN', { default: '' })
const geminiModel = defineString('GEMINI_MODEL', { default: 'gemini-3.7-flash' })

const requestSchema = z.object({
  requestId: z.string().uuid(),
  category: z.enum(['plumbing', 'electrical', 'gas', 'hvac', 'roofing', 'flooring', 'painting', 'carpentry', 'drywall', 'general']),
  urgency: z.enum(['routine', 'soon', 'urgent']),
  description: z.string().trim().min(20).max(800),
  details: z.record(z.string().max(40), z.string().trim().max(160)).refine((value) => Object.keys(value).length <= 3, { message: 'Too many follow-up details.' }).optional(),
  postalPrefix: z.string().regex(/^\d{3}$/).optional(),
  imageDataUrl: z.string().max(5_600_000).optional(),
  walletAddress: z.string().min(20).max(80),
  transactionHash: z.string().min(8).max(160),
})

const feedbackSchema = z.object({
  requestId: z.string().uuid(),
  transactionHash: z.string().regex(/^[a-zA-Z0-9_-]{8,160}$/),
  helpful: z.boolean().optional(),
  priceAccuracy: z.enum(['about-right', 'lower-than-expected', 'higher-than-expected']).optional(),
  resolved: z.boolean().optional(),
}).refine((value) => value.helpful !== undefined || value.priceAccuracy !== undefined || value.resolved !== undefined, { message: 'Choose at least one feedback option.' })

function originAllowed(origin: string | undefined): boolean {
  const allowedOrigins = allowedOrigin.value().split(',').map((value) => value.trim()).filter(Boolean)
  return !allowedOrigins.length || Boolean(origin && allowedOrigins.includes(origin))
}

const generatedEstimateSchema = z.object({
  title: z.string().min(3).max(100),
  summary: z.string().min(20).max(700),
  urgency: z.enum(['routine', 'soon', 'urgent']),
  lowEstimate: z.number().nonnegative().max(1_000_000),
  highEstimate: z.number().positive().max(1_000_000),
  likelyCauses: z.array(z.string().min(2).max(180)).min(2).max(5),
  safetySteps: z.array(z.string().min(2).max(220)).min(2).max(5),
  professionalRequired: z.boolean(),
  difficulty: z.enum(['easy', 'moderate', 'advanced', 'professional-only']),
  estimatedTime: z.string().min(2).max(80),
  parts: z.array(z.string().min(2).max(180)).max(8),
  materials: z.array(z.string().min(2).max(180)).max(8),
  tools: z.array(z.string().min(2).max(180)).max(10),
  repairSteps: z.array(z.string().min(2).max(350)).min(2).max(12),
  stopConditions: z.array(z.string().min(2).max(250)).min(2).max(6),
  scopeItems: z.array(z.string().min(2).max(220)).min(3).max(8),
  questionsForContractor: z.array(z.string().min(2).max(220)).min(2).max(5),
}).refine((value) => value.highEstimate >= value.lowEstimate, { message: 'Invalid estimate range.' })

export const estimate = onRequest({ region: 'us-east1', secrets: [geminiApiKey, nimiqRpcUrl], timeoutSeconds: 60, memory: '512MiB', maxInstances: 5 }, async (request, response) => {
  if (!originAllowed(request.get('origin'))) return void response.status(403).json({ error: 'This origin is not allowed.' })
  if (request.method !== 'POST') return void response.status(405).json({ error: 'Method not allowed.' })

  const parsed = requestSchema.safeParse(request.body)
  if (!parsed.success) return void response.status(400).json({ error: 'Check the repair details and try again.' })
  const input = parsed.data
  const db = getFirestore()
  const paymentRef = db.collection('verifiedPayments').doc(input.transactionHash)
  let paymentClaimed = false

  try {
    const existing = await paymentRef.get()
    if (existing.exists) return void response.status(409).json({ error: 'This payment has already been used.' })

    await verifyNimPayment(nimiqRpcUrl.value(), {
      transactionHash: input.transactionHash,
      recipient: recipient.value(),
      minimumValue: Number(priceLuna.value()),
      requestId: input.requestId,
      sender: input.walletAddress,
    })

    await paymentRef.create({ requestId: input.requestId, walletAddress: input.walletAddress, verifiedAt: FieldValue.serverTimestamp(), status: 'processing' })
    paymentClaimed = true
    const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() })
    const generated = await ai.models.generateContent({
      model: geminiModel.value(),
      contents: [{ role: 'user', parts: buildContents(input) }],
      config: { responseMimeType: 'application/json', responseJsonSchema: estimateSchema, temperature: 0.25 },
    })
    const result = generatedEstimateSchema.parse(JSON.parse(generated.text || '{}'))
    const estimateResult = { ...result, id: input.requestId, createdAt: new Date().toISOString(), transactionHash: input.transactionHash }
    await paymentRef.update({ status: 'completed', completedAt: FieldValue.serverTimestamp() })
    response.set('Cache-Control', 'no-store').status(200).json({ estimate: estimateResult })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Estimate generation failed.'
    if (paymentClaimed) await paymentRef.delete().catch(() => undefined)
    response.status(/waiting|confirmed/.test(message) ? 409 : 502).json({ error: message })
  }
})

export const feedback = onRequest({ region: 'us-east1', timeoutSeconds: 15, memory: '256MiB', maxInstances: 3 }, async (request, response) => {
  if (!originAllowed(request.get('origin'))) return void response.status(403).json({ error: 'This origin is not allowed.' })
  if (request.method !== 'POST') return void response.status(405).json({ error: 'Method not allowed.' })
  const parsed = feedbackSchema.safeParse(request.body)
  if (!parsed.success) return void response.status(400).json({ error: 'Check the feedback and try again.' })

  const { requestId, transactionHash, ...values } = parsed.data
  const db = getFirestore()
  const payment = await db.collection('verifiedPayments').doc(transactionHash).get()
  if (!payment.exists || payment.data()?.requestId !== requestId || payment.data()?.status !== 'completed') {
    return void response.status(403).json({ error: 'Only a completed paid report can submit feedback.' })
  }

  await db.collection('reportFeedback').doc(transactionHash).set({ requestId, ...values, updatedAt: FieldValue.serverTimestamp() }, { merge: true })
  response.set('Cache-Control', 'no-store').status(200).json({ saved: true })
})
