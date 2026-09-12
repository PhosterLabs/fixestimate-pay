import { useMemo, useState } from 'react'
import { BrandMark } from './components/BrandMark'
import { EstimateResultView } from './components/EstimateResultView'
import { config, formatNim } from './config'
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
  { id: 'hvac', icon: '❉', label: 'Heating & Air' },
  { id: 'roofing', icon: '⌂', label: 'Roofing' },
  { id: 'general', icon: '＋', label: 'Other Repair' },
]

export default function App() {
  const [category, setCategory] = useState<RepairCategory>('plumbing')
  const [urgency, setUrgency] = useState<Urgency>('soon')
  const [description, setDescription] = useState('')
  const [imageDataUrl, setImageDataUrl] = useState<string>()
  const [photoConsent, setPhotoConsent] = useState(false)
  const [wallet, setWallet] = useState<WalletConnection>()
  const [estimate, setEstimate] = useState<EstimateResult>()
  const [pendingRequest, setPendingRequest] = useState<EstimateRequest | undefined>(() => loadPendingRequest())
  const [history, setHistory] = useState<StoredEstimate[]>(() => loadHistory())
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const valid = description.trim().length >= 20 && (!imageDataUrl || photoConsent)
  const walletLabel = useMemo(() => wallet ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : 'Connect wallet', [wallet])

  async function handleConnect() {
    setBusy(true); setError(undefined)
    try { setWallet(await connectWallet()) }
    catch (value) { setError(friendlyWalletError(value)) }
    finally { setBusy(false) }
  }

  async function handlePhoto(file?: File) {
    if (!file) return
    setError(undefined)
    try { setImageDataUrl(await imageToDataUrl(file)); setPhotoConsent(false) }
    catch (value) { setError(value instanceof Error ? value.message : String(value)) }
  }

  async function handlePaidEstimate() {
    if (!pendingRequest && !valid) return setError('Describe what you see in at least 20 characters.')
    setBusy(true); setError(undefined)
    try {
      let paidRequest = pendingRequest
      if (!paidRequest) {
        const connection = wallet ?? await connectWallet()
        setWallet(connection)
        const requestId = createRequestId()
        const transactionHash = await payForReport(connection, config.recipient, config.reportPriceLuna, requestId)
        paidRequest = { requestId, category, urgency, description: description.trim(), imageDataUrl, walletAddress: connection.address, transactionHash }
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
    if (!valid) return setError('Describe what you see in at least 20 characters.')
    const result = createDemoEstimate({ requestId: createRequestId(), category, urgency, description: description.trim(), imageDataUrl, demo: true })
    setEstimate(result)
    setHistory(saveEstimate({ ...result, category }))
  }

  function reset() {
    setEstimate(undefined); setDescription(''); setImageDataUrl(undefined); setPhotoConsent(false); setError(undefined)
  }

  if (estimate) return <main className="shell"><Header walletLabel={walletLabel} onWallet={handleConnect} busy={busy} /><EstimateResultView estimate={estimate} onReset={reset} /></main>

  return (
    <main className="shell">
      <Header walletLabel={walletLabel} onWallet={handleConnect} busy={busy} />
      <section className="intro">
        <span className="eyebrow">Know before you repair</span>
        <h1>Turn repair uncertainty into a clear next step.</h1>
        <p>Describe the problem, add a photo, and receive a practical cost range and contractor-ready scope.</p>
      </section>

      <section className="form-card">
        <div className="step-heading"><span>1</span><div><h2>What needs attention?</h2><p>Select the closest category.</p></div></div>
        <div className="category-grid">
          {categories.map((item) => <button key={item.id} className={category === item.id ? 'category category--selected' : 'category'} onClick={() => setCategory(item.id)}><span>{item.icon}</span>{item.label}</button>)}
        </div>

        <div className="step-heading"><span>2</span><div><h2>Show and describe it</h2><p>Include where it is and what changed.</p></div></div>
        <label className={imageDataUrl ? 'photo photo--filled' : 'photo'}>
          {imageDataUrl ? <img src={imageDataUrl} alt="Selected repair" /> : <><strong>＋ Add a repair photo</strong><small>Optional · maximum 4 MB</small></>}
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => void handlePhoto(event.target.files?.[0])} />
        </label>
        {imageDataUrl && <label className="consent"><input type="checkbox" checked={photoConsent} onChange={(event) => setPhotoConsent(event.target.checked)} /><span>I agree to send this photo to Google Gemini solely to generate this report. The photo is not saved in report history.</span></label>}
        <label className="field">
          <span>What are you noticing?</span>
          <textarea value={description} maxLength={800} onChange={(event) => setDescription(event.target.value)} placeholder="Example: Water drips from the cold supply connection whenever the kitchen faucet is running…" />
          <small>{description.length}/800</small>
        </label>
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
    </main>
  )
}

function Header({ walletLabel, onWallet, busy }: { walletLabel: string; onWallet: () => void; busy: boolean }) {
  return <header><a className="brand" href="/" aria-label="FixEstimate Pay home"><BrandMark /><span><strong>FixEstimate</strong><small>PAY</small></span></a><button className="wallet" disabled={busy} onClick={onWallet}><i />{walletLabel}</button></header>
}
