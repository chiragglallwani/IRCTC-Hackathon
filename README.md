# RailEase

Citizen-first railway, multimodal and tourism planning prototype for the “What Moves India” hackathon. The implementation follows the selected Google Stitch project and uses the supplied large synthetic dataset as its source of truth.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. For production verification:

```bash
npm run typecheck
npm test
npm run build
npm start
```

## Razorpay test mode

Add a Razorpay test key pair to `.env.local`:

```text
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
```

The public key reaches Standard Checkout. The secret is used only by `/api/razorpay/order` and `/api/razorpay/verify`. A booking is persisted only after server-side signature verification. If credentials are absent, the payment screen clearly enters a prototype pending state and exposes success/failure/cancel simulation controls; it never silently claims a live payment.

## Architecture

- `lib/data.ts` is the typed repository layer over all supplied JSON records.
- `lib/search.ts` builds graph paths of up to three legs, joins fares/availability, scores deterministically, and generates explanations.
- UI state uses URL search parameters, React state/context, and a single local storage abstraction.
- Namespaced keys: `railease_user`, `railease_session`, `railease_passengers`, `railease_bookings`, `railease_itineraries`, `railease_preferences`, `railease_checkout`.
- Routes and Stitch mapping are documented in `docs/implementation-map.md`.

## Prototype boundaries

- The dataset, PNRs, auth, bookings, tracking, refunds and itinerary payment are synthetic. Nothing is submitted to Indian Railways.
- localStorage auth is intentionally passwordless and is not production authentication.
- The supplied graph contains `train` and `metro_transfer` edges, not scheduled bus services. RailEase renders the available metro connectors as multimodal legs rather than inventing incompatible bus schedules.
- Razorpay requires the developer's own test credentials and internet access. No secret is committed or exposed to the browser.
- The AI assistant is deterministic and intentionally does not call an LLM.
