# FixEstimate Pay

A mobile-first Nimiq Pay Mini App that turns a repair description and optional photo into a cautious cost range and contractor-ready scope. A confirmed NIM payment unlocks each AI-generated report.

This is an isolated competition companion. It does not contain, import, deploy, or modify the production FixEstimate iOS or Android applications.

Live competition app: https://fixestimatepay.phosterlabs.com

Firebase fallback: https://fixestimate-pay.web.app

Nimiq Pay testnet launch link: https://nimpay.app/miniapps/open/fixestimatepay.phosterlabs.com

## Highlights

- Ten guided repair categories with category-specific follow-up questions
- On-device photo resizing and compression before consented AI processing
- Professional-only handling for all electrical and gas reports
- Optional three-digit ZIP prefix for broad regional cost context
- Shareable and print-to-PDF reports with locally saved recent history
- Verified feedback limited to completed paid reports

## Architecture

1. Nimiq Pay injects the wallet provider.
2. The user approves a NIM transaction containing a unique estimate reference.
3. The HTTPS function verifies recipient, value, reference, confirmation, and single-use status.
4. Only then does the server call Gemini using a server-side secret.
5. The browser stores up to 12 report results locally; private keys are never accessible to the app.
6. Optional feedback is accepted only when it matches a completed paid report.

## Local setup

Requirements: Node 22+, Firebase CLI, and Nimiq Pay on a phone or emulator.

```bash
npm install
npm --prefix functions install
cp .env.example .env.local
npm run dev -- --host
```

Enter the printed network URL in Nimiq Pay's Custom URL field. Keep `VITE_ENABLE_DEMO=true` only for local UI testing without a payment. The deployed app disables demo reports.

## Production configuration

Create a separate Firebase project and copy `.firebaserc.example` to `.firebaserc`. Store secrets, then deploy and provide the non-secret parameter values when prompted:

```bash
firebase functions:secrets:set GEMINI_API_KEY
firebase functions:secrets:set NIMIQ_RPC_URL
firebase deploy
```

Use `NIMIQ_RECIPIENT=YOUR_NIMIQ_ADDRESS`, `REPORT_PRICE_LUNA=10000`, `ALLOWED_ORIGIN=https://YOUR_HOST`, and `GEMINI_MODEL=gemini-3.7-flash` as the prompted parameter values.

Set `VITE_NIMIQ_RECIPIENT` to the same recipient and `VITE_ENABLE_DEMO=false` for the final production build. Never commit `.env`, `.env.local`, `.firebaserc`, service-account JSON, or secret values.

## Verification

```bash
npm run check
npm --prefix functions run build
```

## License

MIT © 2026 Phoster Labs LLC
