import { useMemo, useState } from 'react'
import { BrandMark } from './components/BrandMark'
import { EstimateResultView } from './components/EstimateResultView'
import { config, formatNim } from './config'
import { followUpQuestions } from './data/questions'
import { createDemoEstimate, requestEstimate } from './lib/estimate'
import { imageToDataUrl } from './lib/image'
import { createRequestId } from './lib/id'
import { connectWallet, friendlyWalletError, payForReport, type WalletConnection } from './lib/nimiq'
import { clearPendingRequest, loadHistory, loadPendingRequest, saveEstimate, savePendingRequest } from './lib/storage'
import type { EstimateRequest, EstimateResult, RepairCategory, StoredEstimate, Urgency } from './types'
import './styles.css'

const categories: Array<{ id: RepairCategory; icon: string; label: string }> = [
  { id: 'plumbing', icon: '◒', label: 'Plumbing' },
  { id: 'electrical', icon: 'ϟ', label: 'Electrical' },
  { id: 'gas', icon: '♨', label: 'Gas' },
  { id: 'hvac', icon: '❉', label: 'Heating & Air' },
  { id: 'roofing', icon: '⌂', label: 'Roofing' },
  { id: 'flooring', icon: '▦', label: 'Flooring' },
  { id: 'painting', icon: '◩', label: 'Painting' },
  { id: 'carpentry', icon: '⌑', label: 'Carpentry' },
  { id: 'drywall', icon: '▤', label: 'Drywall' },
  { id: 'general', icon: '＋', label: 'Other Repair' },
]

const formatBytes = (bytes: number) => bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`

function shouldShowOnboarding() {
  try { return localStorage.getItem('fixestimate-pay:onboarding:v1') !== 'seen' }
  catch { return true }
}

export default function App() {
  const [category, setCategory] = useState<RepairCategory>('plumbing')
  const [urgency, setUrgency] = useState<Urgency>('soon')
  const [description, setDescription] = useState('')
  const [detailAnswers, setDetailAnswers] = useState<Record<string, string>>({})
  const [postalCode, setPostalCode] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState<string>()
  const [photoInfo, setPhotoInfo] = useState<string>()
  const [photoConsent, setPhotoConsent] = useState(false)
  const [wallet, setWallet] = useState<WalletConnection>()
  const [estimate, setEstimate] = useState<EstimateResult>()
  const [pendingRequest, setPendingRequest] = useState<EstimateRequest | undefined>(() => loadPendingRequest())
  const [history, setHistory] = useState<StoredEstimate[]>(() => loadHistory())
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(shouldShowOnboarding)

  const postalValid = !postalCode || /^\d{5}$/.test(postalCode)
  const valid = !photoBusy && postalValid && description.trim().length >= 20 && (!imageDataUrl || photoConsent)
  const walletLabel = useMemo(() => wallet ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : 'Connect wallet', [wallet])

  async function handleConnect() {
    setBusy(true); setError(undefined)
    try { setWallet(await connectWallet()) }
    catch (value) { setError(friendlyWalletError(value)) }
    finally { setBusy(false) }
  }

  async function handlePhoto(file?: File) {
    if (!file) return
    setPhotoBusy(true); setError(undefined)
    try {
      const compressed = await imageToDataUrl(file)
      const compressedBytes = Math.max(0, Math.round((compressed.length - compressed.indexOf(',') - 1) * 0.75))
      setImageDataUrl(compressed)
      setPhotoInfo(`Compressed on this device from ${formatBytes(file.size)} to about ${formatBytes(compressedBytes)}.`)
      setPhotoConsent(false)
    }
    catch (value) { setError(value instanceof Error ? value.message : String(value)) }
    finally { setPhotoBusy(false) }
  }

  function removePhoto() {
    setImageDataUrl(undefined); setPhotoInfo(undefined); setPhotoConsent(false)
  }

  async function handlePaidEstimate() {
    if (!pendingRequest && postalCode && !postalValid) return setError('Enter a five-digit ZIP code or leave it blank.')
    if (!pendingRequest && !valid) return setError('Describe what you see in at least 20 characters.')
    setBusy(true); setError(undefined)
    try {
      let paidRequest = pendingRequest
      if (!paidRequest) {
        const connection = wallet ?? await connectWallet()
        setWallet(connection)
        const requestId = createRequestId()
        const transactionHash = await payForReport(connection, config.recipient, config.reportPriceLuna, requestId)
        const details = Object.fromEntries(Object.entries(detailAnswers).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value))
        paidRequest = { requestId, category, urgency, description: description.trim(), details: Object.keys(details).length ? details : undefined, postalPrefix: postalCode ? postalCode.slice(0, 3) : undefined, imageDataUrl, walletAddress: connection.address, transactionHash }
        setPendingRequest(paidRequest)
        savePendingRequest(paidRequest)
      }
      const result = await requestEstimate(paidRequest, config.apiBaseUrl)
      setEstimate(result)
      setPendingRequest(undefined)
      clearPendingRequest()
      setHistory(saveEstimate({ ...result, category }))
    } catch (value) { setError(friendlyWalletError(value)) }
    finally { setBusy(false) }
  }

  function handleDemo() {
    if (postalCode && !postalValid) return setError('Enter a five-digit ZIP code or leave it blank.')
    if (!valid) return setError('Describe what you see in at least 20 characters.')
    const details = Object.fromEntries(Object.entries(detailAnswers).map(([key, value]) => [key, value.trim()]).filter(([, value]) => value))
    const result = createDemoEstimate({ requestId: createRequestId(), category, urgency, description: description.trim(), details, postalPrefix: postalCode ? postalCode.slice(0, 3) : undefined, imageDataUrl, demo: true })
    setEstimate(result)
    setHistory(saveEstimate({ ...result, category }))
  }

  function reset() {
    setEstimate(undefined); setDescription(''); setDetailAnswers({}); setPostalCode(''); setImageDataUrl(undefined); setPhotoInfo(undefined); setPhotoConsent(false); setError(undefined)
  }

  function dismissOnboarding() {
    try { localStorage.setItem('fixestimate-pay:onboarding:v1', 'seen') } catch { /* Continue without persistence. */ }
    setShowOnboarding(false)
  }

  if (estimate) return <main className="shell"><Header walletLabel={walletLabel} onWallet={handleConnect} busy={busy} /><EstimateResultView key={estimate.id} estimate={estimate} onReset={reset} /></main>

  return (
    <main className="shell">
      <Header walletLabel={walletLabel} onWallet={handleConnect} busy={busy} />
      <section className="intro">
        <span className="eyebrow">Know before you repair</span>
        <h1>Turn repair uncertainty into a clear next step.</h1>
        <p>Describe the problem, add a photo, and receive a practical cost range and contractor-ready scope.</p>
        <button className="how-button" onClick={() => setShowOnboarding(true)}>How it works</button>
      </section>

      <section className="form-card">
        <div className="hazard-warning" role="alert">
          <strong>Electrical or gas work requires a professional.</strong>
          <span>Do not open panels, repair wiring or gas lines, or relight equipment. If you smell gas, leave immediately and call your gas utility or emergency services from outside.</span>
        </div>
        <div className="step-heading"><span>1</span><div><h2>What needs attention?</h2><p>Select the closest category.</p></div></div>
        <div className="category-grid">
          {categories.map((item) => <button key={item.id} className={category === item.id ? 'category category--selected' : 'category'} onClick={() => { setCategory(item.id); setDetailAnswers({}) }}><span>{item.icon}</span>{item.label}</button>)}
        </div>

        <div className="step-heading"><span>2</span><div><h2>Show and describe it</h2><p>Include where it is and what changed.</p></div></div>
        <div className={imageDataUrl ? 'photo photo--filled' : 'photo'}>
          {imageDataUrl ? <img src={imageDataUrl} alt="Selected repair" /> : <><strong>{photoBusy ? 'Compressing photo…' : 'Add a repair photo'}</strong><small>Optional · automatically compressed before upload</small></>}
        </div>
        <div className="photo-actions">
          <label className="photo-action">Take photo<input type="file" accept="image/*" capture="environment" disabled={photoBusy} onChange={(event) => { void handlePhoto(event.target.files?.[0]); event.target.value = '' }} /></label>
          <label className="photo-action">Upload photo<input type="file" accept="image/*" disabled={photoBusy} onChange={(event) => { void handlePhoto(event.target.files?.[0]); event.target.value = '' }} /></label>
          {imageDataUrl && <button type="button" className="photo-remove" onClick={removePhoto}>Remove</button>}
        </div>
        {photoInfo && <p className="photo-info">{photoInfo}</p>}
        {imageDataUrl && <label className="consent"><input type="checkbox" checked={photoConsent} onChange={(event) => setPhotoConsent(event.target.checked)} /><span>I agree to send this photo to Google Gemini solely to generate this report. The photo is not saved in report history.</span></label>}
        <label className="field">
          <span>What are you noticing?</span>
          <textarea value={description} maxLength={800} onChange={(event) => setDescription(event.target.value)} placeholder="Example: Water drips from the cold supply connection whenever the kitchen faucet is running…" />
          <small>{description.length}/800</small>
        </label>
        <div className="follow-up">
          <div className="mini-heading"><strong>A few details improve the range</strong><span>Optional</span></div>
          {followUpQuestions[category].map((question) => <label className="field field--compact" key={question.id}>
            <span>{question.label}</span>
            <input value={detailAnswers[question.id] ?? ''} maxLength={160} onChange={(event) => setDetailAnswers((current) => ({ ...current, [question.id]: event.target.value }))} placeholder={question.placeholder} />
          </label>)}
          <label className="field field--compact">
            <span>ZIP code for regional pricing <em>Optional</em></span>
            <input value={postalCode} maxLength={5} inputMode="numeric" autoComplete="postal-code" onChange={(event) => setPostalCode(event.target.value.replace(/\D/g, '').slice(0, 5))} placeholder="12345" />
            <small className="field-note">Only the first 3 digits are sent with the report request.</small>
          </label>
        </div>
        <fieldset className="urgency-field"><legend>How urgent does it feel?</legend><div>
          {(['routine', 'soon', 'urgent'] as Urgency[]).map((value) => <button key={value} className={urgency === value ? 'chip chip--selected' : 'chip'} onClick={() => setUrgency(value)}>{value}</button>)}
        </div></fieldset>

        {pendingRequest && <div className="pending" role="status">Payment received. Retry this report without another payment.</div>}
        {error && <div className="error" role="alert">{error}</div>}
        <button className="button button--primary" disabled={busy || (!pendingRequest && !valid)} onClick={() => void handlePaidEstimate()}>{busy ? 'Working…' : pendingRequest ? 'Retry paid report' : `Unlock report · ${formatNim(config.reportPriceLuna)}`}</button>
        {config.demoEnabled && <button className="button button--text" disabled={busy || !valid} onClick={handleDemo}>Preview a free sample report</button>}
        <p className="privacy-note">Your wallet approves every payment. FixEstimate Pay never sees your private keys.</p>
      </section>

      {history.length > 0 && <section className="history"><button className="history__toggle" onClick={() => setShowHistory(!showHistory)}><span>Recent reports</span><span>{showHistory ? '−' : '+'}</span></button>{showHistory && <div>{history.map((item) => <button key={item.id} onClick={() => setEstimate(item)}><span>{item.title}</span><small>{new Date(item.createdAt).toLocaleDateString()}</small></button>)}</div>}</section>}
      <footer>Built by Phōstēr Labs · Powered by Nimiq Pay · <a href="/privacy.html">Privacy</a></footer>
      {showOnboarding && <div className="onboarding-backdrop" role="presentation">
        <section className="onboarding" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
          <span className="eyebrow">FixEstimate Pay</span>
          <h2 id="onboarding-title">A clearer repair plan in three steps.</h2>
          <ol>
            <li><strong>Describe it</strong><span>Choose a category, answer quick questions, and optionally add a compressed photo.</span></li>
            <li><strong>Approve once</strong><span>Nimiq Pay shows the 0.1 NIM charge before anything is sent.</span></li>
            <li><strong>Use the report</strong><span>Get costs, safety guidance, supplies, steps, and a contractor-ready scope.</span></li>
          </ol>
          <button className="button button--primary" onClick={dismissOnboarding}>Start my estimate</button>
          <button className="button button--text" onClick={dismissOnboarding}>Skip walkthrough</button>
        </section>
      </div>}
    </main>
  )
}

function Header({ walletLabel, onWallet, busy }: { walletLabel: string; onWallet: () => void; busy: boolean }) {
  return <header><a className="brand" href="/" aria-label="FixEstimate Pay home"><BrandMark /><span><strong>FixEstimate</strong><small>PAY</small></span></a><button className="wallet" disabled={busy} onClick={onWallet}><i />{walletLabel}</button></header>
}
