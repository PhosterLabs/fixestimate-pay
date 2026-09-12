import { useState } from 'react'
import { config } from '../config'
import { submitFeedback } from '../lib/feedback'
import type { EstimateResult, ReportFeedback } from '../types'

interface Props { estimate: EstimateResult; onReset: () => void }

const listText = (title: string, items: string[]) => items.length ? `\n${title}:\n${items.map((item, index) => `${index + 1}. ${item}`).join('\n')}` : ''

export function EstimateResultView({ estimate, onReset }: Props) {
  const [feedback, setFeedback] = useState<ReportFeedback>({})
  const [feedbackStatus, setFeedbackStatus] = useState<string>()
  const [feedbackBusy, setFeedbackBusy] = useState(false)
  const [shareStatus, setShareStatus] = useState<string>()

  const shareText = [
    estimate.title,
    `Typical repair range: $${estimate.lowEstimate.toLocaleString()}–$${estimate.highEstimate.toLocaleString()}`,
    `Recommended path: ${estimate.professionalRequired ? 'Licensed professional' : 'Guided DIY may be appropriate'}`,
    `Typical time: ${estimate.estimatedTime}`,
    `\n${estimate.summary}`,
    listText('Safety first', estimate.safetySteps),
    listText(estimate.professionalRequired ? 'Safe next steps' : 'Repair steps', estimate.repairSteps),
    listText('Contractor-ready scope', estimate.scopeItems),
    '\nCreated with FixEstimate Pay.',
  ].join('\n')

  async function handleShare() {
    setShareStatus(undefined)
    try {
      if (navigator.share) await navigator.share({ title: estimate.title, text: shareText, url: window.location.origin })
      else if (navigator.clipboard) { await navigator.clipboard.writeText(`${shareText}\n${window.location.origin}`); setShareStatus('Report summary copied.') }
      else setShareStatus('Use Print / Save PDF to share this report.')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return
      setShareStatus('Sharing is unavailable. Try Print / Save PDF instead.')
    }
  }

  async function sendFeedback(update: ReportFeedback) {
    const next = { ...feedback, ...update }
    setFeedback(next); setFeedbackBusy(true); setFeedbackStatus(undefined)
    try { await submitFeedback(estimate, update, config.apiBaseUrl); setFeedbackStatus('Thanks—your feedback was saved.') }
    catch (error) { setFeedbackStatus(error instanceof Error ? error.message : 'Feedback could not be saved.') }
    finally { setFeedbackBusy(false) }
  }

  return (
    <section className="result" aria-live="polite">
      <div className="result__hero">
        <span className={`urgency urgency--${estimate.urgency}`}>{estimate.urgency}</span>
        {estimate.demo && <span className="demo-pill">Sample</span>}
        <h1>{estimate.title}</h1>
        <p>{estimate.summary}</p>
        <div className="price-range">
          <span>Typical repair range</span>
          <strong>${estimate.lowEstimate.toLocaleString()}–${estimate.highEstimate.toLocaleString()}</strong>
        </div>
      </div>

      <ResultSection title="Likely causes" items={estimate.likelyCauses} />
      <ResultSection title="Safety first" items={estimate.safetySteps} tone="warning" />
      {estimate.difficulty && <section className={estimate.professionalRequired ? 'guidance guidance--pro' : 'guidance'}>
        <div><span>Recommended path</span><strong>{estimate.professionalRequired ? 'Licensed professional' : 'Guided DIY may be appropriate'}</strong></div>
        <div><span>Difficulty</span><strong>{estimate.difficulty.replace('-', ' ')}</strong></div>
        <div><span>Typical time</span><strong>{estimate.estimatedTime}</strong></div>
      </section>}
      {!estimate.professionalRequired && <>
        <div className="kit-grid">
          <ResultSection title="Parts" items={estimate.parts || []} />
          <ResultSection title="Materials" items={estimate.materials || []} />
          <ResultSection title="Tools & equipment" items={estimate.tools || []} />
        </div>
      </>}
      <ResultSection title={estimate.professionalRequired ? 'Safe next steps' : 'Step-by-step repair'} items={estimate.repairSteps || []} numbered />
      <ResultSection title="Stop and call a professional if…" items={estimate.stopConditions || []} tone="warning" />
      <ResultSection title="Contractor-ready scope" items={estimate.scopeItems} numbered />
      <ResultSection title="Questions to ask" items={estimate.questionsForContractor} />

      <div className="report-actions">
        <button className="button button--secondary" onClick={() => void handleShare()}>Share report</button>
        <button className="button button--secondary" onClick={() => window.print()}>Print / Save PDF</button>
      </div>
      {shareStatus && <p className="action-status" role="status">{shareStatus}</p>}

      {!estimate.demo && estimate.transactionHash && <section className="feedback-card">
        <div><h2>Help us improve</h2><span>Verified paid-report feedback</span></div>
        <fieldset><legend>Was this report helpful?</legend><div>
          <button disabled={feedbackBusy} aria-pressed={feedback.helpful === true} onClick={() => void sendFeedback({ helpful: true })}>Yes</button>
          <button disabled={feedbackBusy} aria-pressed={feedback.helpful === false} onClick={() => void sendFeedback({ helpful: false })}>Needs work</button>
        </div></fieldset>
        <fieldset><legend>How did the price range look?</legend><div>
          <button disabled={feedbackBusy} aria-pressed={feedback.priceAccuracy === 'about-right'} onClick={() => void sendFeedback({ priceAccuracy: 'about-right' })}>About right</button>
          <button disabled={feedbackBusy} aria-pressed={feedback.priceAccuracy === 'lower-than-expected'} onClick={() => void sendFeedback({ priceAccuracy: 'lower-than-expected' })}>Too low</button>
          <button disabled={feedbackBusy} aria-pressed={feedback.priceAccuracy === 'higher-than-expected'} onClick={() => void sendFeedback({ priceAccuracy: 'higher-than-expected' })}>Too high</button>
        </div></fieldset>
        <button className="resolved-button" disabled={feedbackBusy} aria-pressed={feedback.resolved === true} onClick={() => void sendFeedback({ resolved: !feedback.resolved })}>✓ I resolved this issue</button>
        {feedbackStatus && <p role="status">{feedbackStatus}</p>}
      </section>}

      {estimate.transactionHash && <p className="receipt">Payment reference: {estimate.transactionHash.slice(0, 14)}…</p>}
      <p className="disclaimer">Informational estimate only. It is not a diagnosis, bid, warranty, or substitute for an on-site inspection by a qualified professional.</p>
      <button className="button button--secondary" onClick={onReset}>Start another estimate</button>
    </section>
  )
}

function ResultSection({ title, items, tone, numbered }: { title: string; items: string[]; tone?: 'warning'; numbered?: boolean }) {
  const List = numbered ? 'ol' : 'ul'
  return (
    <section className={`result-card ${tone ? `result-card--${tone}` : ''}`}>
      <h2>{title}</h2>
      <List>{items.map((item) => <li key={item}>{item}</li>)}</List>
    </section>
  )
}
