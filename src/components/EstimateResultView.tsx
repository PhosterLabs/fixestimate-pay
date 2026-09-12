import type { EstimateResult } from '../types'

interface Props { estimate: EstimateResult; onReset: () => void }

export function EstimateResultView({ estimate, onReset }: Props) {
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
