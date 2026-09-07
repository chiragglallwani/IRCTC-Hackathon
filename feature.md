# RailEase Voice Search and Assisted Booking Plan

> Implementation status (2026-09-05): core feature delivered. The assistant,
> browser speech hooks, secured structured parser, existing-results integration,
> shared checkout selection, deterministic advisories, quota warnings, cost
> controls, tests, and setup documentation are implemented. Some component names
> from the proposed file map were consolidated into `components/assistant/assistant.tsx`
> to keep the interaction state in one auditable place.

> Tourism extension (2026-09-07): Disha now parses holiday-planning requests,
> resolves destinations against RailEase tourism data, collects missing dates,
> and opens the existing planner with destination, dates, travelers, rooms,
> budget, pace, style, transport, accommodation, and meal preferences prefilled.
> It can also open saved tourism bookings. Itinerary review and final payment
> remain manual in the existing tourism screens.
> Confirmed tourism packages can also be cancelled through Disha using their
> `RTP-########` reference. The assistant requires explicit confirmation, then
> updates the same itinerary storage used by Tourism Bookings and reloads the UI.

## 1. Objective

Build a production-shaped voice-assisted journey search and booking experience on top of the existing RailEase UI. A user should be able to describe a journey naturally, review the same results already shown on `/search`, refine or select a result by voice, see all availability and quota warnings, and continue through the existing passenger and payment flow.

The completed implementation must be ready to run with only this manual configuration:

```env
OPENAI_API_KEY=sk-...
```

The key must be placed in `.env.local` or the deployment provider's secret store. It must never use a `NEXT_PUBLIC_` prefix, appear in client code, be logged, or be committed.

The feature must also remain usable without a configured key: typed search, the existing search form, deterministic help, and a limited deterministic voice-command fallback must continue to work.

## 2. Product boundaries

### In scope

- Voice-to-text through the browser's speech-recognition capability.
- Typed and spoken natural-language journey requests.
- English, Hindi, and Hinglish as the initial tested language set.
- Multi-turn collection of missing search details.
- Station ambiguity resolution using the RailEase station dataset.
- Existing `/search` page as the only journey-results source of truth.
- Voice commands to refine, sort, inspect, and select displayed journeys.
- Availability, RAC, waitlist, insufficient-seat, unavailable, multi-leg, quota, verification, and fare-change advisories.
- Provisional quota guidance before passengers are known.
- Final deterministic quota recommendation after passengers are selected.
- Explicit confirmation before searching, selecting a journey, or entering checkout.
- Browser text-to-speech for short assistant responses when enabled.
- A secure Next.js server route for OpenAI parsing.
- Cost, abuse, timeout, and graceful-degradation controls.

### Out of scope

- Autonomous purchase or payment confirmation.
- Sending payment credentials, identity-document values, or complete passenger profiles to OpenAI.
- Continuous background microphone recording.
- Replacing the existing journey cards with AI-generated results.
- Allowing the model to invent stations, fares, availability, eligibility, or warnings.
- A real IRCTC reservation integration. RailEase's current journeys, bookings, and PNRs remain synthetic.
- OpenAI Realtime speech-to-speech for the first release. It is unnecessary for this interaction and would increase cost and implementation complexity.

## 3. Core design decisions

1. **OpenAI interprets; RailEase validates and executes.** The model may extract an intent, but only project code can resolve stations, run searches, rank journeys, calculate quota eligibility, generate warnings, save checkout state, or navigate.
2. **Reuse the existing search page.** Voice search constructs the existing `SearchInput` and navigates to `/search`; results remain visible as normal `JourneyCard` components.
3. **Warnings have one deterministic source.** The assistant, journey cards, and checkout must render the same advisory objects from a shared warning engine.
4. **Quota selection happens at the correct time.** Search results can show availability by quota, but the final best quota is calculated only after actual passengers and their eligibility claims are known.
5. **Confirmation gates consequential actions.** Search can follow a confirmed summary. Journey selection requires a fare/availability warning summary. Payment always remains a manual UI action.
6. **Use OpenAI only when it adds value.** Known UI commands, confirmations, result filtering, quota computation, and standard explanations are handled locally.

## 4. Existing integration points

- `components/shell.tsx`: replace the current keyword-based `AIAssistant`, retaining its global bottom-right placement.
- `components/search-card.tsx`: extract and reuse search-query construction and validation.
- `app/search/page.tsx`: publish the exact displayed search input and journeys to assistant context.
- `app/api/search/route.ts`: continue using the current deterministic journey search.
- `components/journey-card.tsx`: extract checkout-context creation and render shared advisories.
- `components/checkout.tsx`: reuse passenger validation, `selectBestAvailableQuota`, and payment handoff; render the shared final quota advisories.
- `lib/places.ts`: resolve model-extracted place text to project-owned stations and aliases.
- `lib/search.ts`: remain the source of journey, fare, and availability data.
- `lib/journey-utils.ts`: remain the source of quota eligibility and best-quota calculation.
- `lib/storage.ts`: persist the assistant draft only when useful; never persist audio or sensitive raw transcripts.

## 5. Target architecture

```text
User speaks or types
        |
        v
Browser speech recognition (voice only)
        |
        v
Local command recognizer
   | recognized locally              | ambiguous/free-form request
   v                                 v
Local action                    POST /api/assistant/parse
                                      |
                                      v
                              OpenAI Responses API
                              strict structured output
                                      |
                                      v
                              Zod response validation
   |                                  |
   +----------------+-----------------+
                    v
           Deterministic action executor
                    |
        +-----------+------------+
        |                        |
        v                        v
Station/date validation     Existing page context
        |                        |
        v                        v
Existing /api/search        Filters/result selection
        |                        |
        +-----------+------------+
                    v
        Shared booking advisory engine
                    |
                    v
        Explicit user confirmation
                    |
                    v
        Existing checkout/passenger/payment flow
```

## 6. End-to-end user flow

### 6.1 Search

1. User opens the bottom-right journey assistant.
2. User taps the microphone or types a request.
3. For voice, RailEase requests microphone permission and displays interim/final transcript text.
4. The local recognizer handles simple commands; otherwise the transcript and a compact assistant state are sent to `/api/assistant/parse`.
5. The returned intent is validated.
6. Extracted place names are resolved against `findPlaces`; the model never supplies trusted station IDs.
7. RailEase asks about missing or ambiguous fields one at a time.
8. RailEase displays a structured search summary.
9. User confirms the search.
10. RailEase navigates to the existing `/search` URL and loads results through the existing API route.

### 6.2 Results and refinement

1. The search page publishes the same filtered/sorted journeys visible to the user into assistant context.
2. The user can say commands such as “only direct,” “cheapest first,” “confirmed seats only,” “after 6 PM,” “read the first three,” or “select the second one.”
3. Local code applies known filters and ranking. OpenAI is not called for commands that can be classified safely on-device.
4. Each journey renders deterministic advisories.
5. Spoken summaries mention blocking advisories first, then material RAC/waitlist/quota information; they do not read every visual notice automatically.

### 6.3 Journey selection

1. User selects a visible journey by button or voice.
2. RailEase opens the same selection-review panel for both interaction modes.
3. The panel summarizes route, date, train/legs, class, passenger count, availability, fare, and relevant advisories.
4. Before passengers are selected, the panel clearly says that quota guidance is provisional.
5. User explicitly confirms “Continue to booking.”
6. RailEase creates checkout state using the same shared helper used by `JourneyCard`.
7. Authentication opens if needed, preserving the selection.

### 6.4 Passengers, final quota, and payment

1. The existing passenger screen collects/selects passengers locally.
2. RailEase runs deterministic eligibility and best-quota selection.
3. It displays the preferred quota, selected quota, availability, any fallback reason, required verification, and blocking conditions.
4. The user explicitly confirms passenger and quota details.
5. Payment is completed through the existing manual flow. The microphone is off by default on sensitive screens.
6. The assistant may navigate or explain but must never collect or transmit card numbers, CVV, UPI PINs, passwords, or identity-document values.

## 7. Assistant state model

```ts
type AssistantPhase =
  | "welcome"
  | "listening"
  | "parsing"
  | "collecting_details"
  | "resolving_station"
  | "confirming_search"
  | "searching"
  | "showing_results"
  | "confirming_journey"
  | "authenticating"
  | "checkout_guidance"
  | "payment_handoff"
  | "booking_complete"
  | "error";
```

The reducer must support cancel, go back, start over, retry, and correction from every non-payment phase. Route changes must not silently discard a confirmed draft or pending journey selection.

## 8. Structured parser contract

### 8.1 Supported actions

```ts
type AssistantAction =
  | "search_trains"
  | "modify_search"
  | "filter_results"
  | "describe_results"
  | "select_journey"
  | "explain_term"
  | "clarify"
  | "cancel"
  | "unsupported";
```

The model cannot return `open_checkout`, `pay`, or another consequential action. Checkout navigation is available only after deterministic validation and a local confirmation event.

### 8.2 Search draft

```ts
interface VoiceSearchDraft {
  originQuery: string | null;
  destinationQuery: string | null;
  date: string | null; // YYYY-MM-DD after interpretation
  adults: number | null;
  children: number | null;
  infants: number | null;
  travelClass: "ANY" | "1A" | "2A" | "3A" | "SL" | "CC" | "EC" | null;
  mode: "quick" | "explore" | "tatkal" | null;
  sort: "recommended" | "cheapest" | "fastest" | null;
  onlyAvailable: boolean | null;
  maxTransfers: 0 | 1 | 2 | null;
  maxFare: number | null;
  departurePeriod: "morning" | "afternoon" | "evening" | "night" | null;
}
```

### 8.3 Model result

```ts
interface ParsedAssistantIntent {
  action: AssistantAction;
  draft: VoiceSearchDraft;
  resultReference: {
    ordinal: number | null; // user-facing 1-based index
    journeyId: string | null;
  } | null;
  explanationTopic:
    | "rac"
    | "waitlist"
    | "quota"
    | "tatkal"
    | "class"
    | "cancellation"
    | null;
  missingFields: Array<keyof VoiceSearchDraft>;
  correctionFields: Array<keyof VoiceSearchDraft>;
  assistantMessage: string;
}
```

This is enforced using OpenAI Structured Outputs/function arguments plus a server-side Zod schema. Invalid model output produces a safe clarification response and never reaches the action executor.

### 8.4 Data sent to OpenAI

Send only:

- The current utterance, capped at 500 characters.
- Current date and `Asia/Kolkata` timezone.
- Selected UI language.
- Compact non-sensitive search draft.
- Current assistant phase and pathname.
- At most five compact displayed-result summaries when resolving a relative reference such as “the second one.”

Do not send:

- Full station, train, route, fare, availability, or locale JSON files.
- API keys or internal configuration.
- User email, password hash, payment data, saved passenger profiles, document numbers, or raw audio.
- Full conversation history. Keep only the minimum structured state and current correction.

## 9. OpenAI implementation

### 9.1 API route

Add `app/api/assistant/parse/route.ts` with:

- Node.js runtime.
- `OPENAI_API_KEY` read only on the server.
- Lazy/singleton OpenAI client.
- Responses API with strict structured output.
- Default cost-sensitive model configured in server code as `gpt-5.6-luna`, with an optional non-public `OPENAI_ASSISTANT_MODEL` override for deployments where model availability differs.
- Short fixed instructions and compact JSON input.
- No web search, file search, code interpreter, image, or audio tools.
- No model-side railway functions that execute automatically.
- `store: false` where supported by the selected endpoint/model configuration.
- Small output limit sufficient for the schema and one short user-facing sentence.
- Request timeout and one controlled retry only for transient failures.
- Normalized error responses that do not expose provider details or secrets.

The current OpenAI model catalog describes `gpt-5.6-luna` as the cost-sensitive high-volume option. Model availability must be verified during implementation and covered by a configuration test rather than assumed permanently.

### 9.2 Prompt rules

The system instructions must require the model to:

- Act only as an intent extractor for RailEase.
- Preserve existing draft values unless the user explicitly changes them.
- Resolve relative dates using the supplied current date/timezone.
- Return `null` instead of guessing missing information.
- Preserve place names as user-facing queries, never fabricate station IDs/codes.
- Never claim live availability, fare, eligibility, quota, or booking success.
- Never request payment, password, or identity-document information.
- Keep `assistantMessage` short and avoid duplicating deterministic warning text.
- Return `unsupported` for unrelated or unsafe requests.

### 9.3 API response envelope

```ts
type ParseResponse =
  | { ok: true; intent: ParsedAssistantIntent }
  | {
      ok: false;
      code: "NOT_CONFIGURED" | "RATE_LIMITED" | "TIMEOUT" | "INVALID_OUTPUT" | "UPSTREAM_ERROR";
      fallbackAvailable: true;
    };
```

The frontend must not depend on raw OpenAI SDK response shapes.

## 10. Shared advisory engine

Create `lib/booking-advisories.ts`. It must be pure, deterministic, localized through translation keys, and used by journey cards, the assistant, checkout confirmation, and passenger/quota review.

```ts
type AdvisoryCode =
  | "AVAILABLE"
  | "INSUFFICIENT_SEATS"
  | "RAC"
  | "WAITLIST"
  | "REGRET"
  | "MULTI_LEG_RISK"
  | "QUOTA_PENDING"
  | "QUOTA_RECOMMENDED"
  | "QUOTA_FALLBACK"
  | "QUOTA_VERIFICATION"
  | "CLASS_FALLBACK"
  | "FARE_CHANGED"
  | "AVAILABILITY_CHANGED";

interface BookingAdvisory {
  code: AdvisoryCode;
  severity: "success" | "info" | "warning" | "danger";
  titleKey: string;
  messageKey: string;
  variables?: Record<string, string | number>;
  blocking: boolean;
  spokenPriority: 0 | 1 | 2;
  suggestedAction?: "change_train" | "change_class" | "change_date" | "review_quota";
}
```

### Advisory rules

- **Available:** show available count and required passenger count.
- **Insufficient seats:** block confirmed-only continuation when available count is below required seats; suggest another journey/class.
- **RAC:** show position, requested passengers, and confirmation likelihood when present; require acknowledgment before continuation.
- **Waitlist:** show position and likelihood; require explicit acknowledgment if waitlisted checkout remains allowed.
- **REGRET:** block continuation.
- **Multi-leg:** calculate the overall state from the weakest leg and identify that leg.
- **Quota pending:** before passenger selection, say General is only the displayed baseline and final quota follows eligibility checks.
- **Quota recommended:** after passengers are selected, show why the selected quota is eligible and whether it has enough seats.
- **Quota fallback:** show preferred versus selected quota, their availability, and the deterministic reason for fallback.
- **Verification:** require acknowledgment when any passenger claim needs documentation.
- **Changed data:** if a re-search changes fare or availability before payment, show old and new values and require reconfirmation.

The model may explain an advisory in simpler language, but it cannot create, suppress, change the severity of, or override an advisory.

## 11. Local command layer

To reduce API calls, handle these commands without OpenAI when the current phase makes their meaning unambiguous:

- yes, confirm, continue, no, cancel, back, start over
- select option 1–5
- cheapest, fastest, recommended
- direct only, available only
- read results, repeat, stop speaking
- open/close assistant
- standard RAC, waitlist, quota, and class explanations from localized content

The local parser must be conservative. If confidence is low or a correction contains multiple natural-language fields, send one compact request to the OpenAI parser.

## 12. Cost-control requirements

1. Use browser speech recognition and browser speech synthesis in version one; do not send audio to OpenAI.
2. Default to a cost-sensitive text model supporting the required schema.
3. Make at most one model request per completed substantive utterance.
4. Never call the model for interim speech transcripts, keystrokes, render events, search execution, result loading, availability warnings, or quota computation.
5. Handle acknowledgments, result ordinals, filtering, sorting, and standard help locally.
6. Cap user input at 500 characters and send compact structured state rather than chat history.
7. Cap result context to five minimal summaries containing only index, journey ID, times, fare, transfers, class, and status.
8. Keep model output to strict fields and one short assistant sentence.
9. Abort superseded requests and prevent double submission.
10. Retry no more than once, and only for retryable upstream errors.
11. Add per-session and per-IP throttling suitable for the deployment platform; return the deterministic fallback when exceeded.
12. Cache only safe standard explanations locally. Do not cache or persist raw personal utterances.
13. Record request count, latency, model identifier, success/failure category, and token usage when returned; do not record transcript text.
14. Configure an OpenAI project spend limit/alert before public deployment.
15. Keep the model name server-configurable so a future lower-cost compatible model can be adopted without UI changes.

No fixed rupee/dollar estimate belongs in the application because API pricing can change. Verify current pricing and account availability before launch.

## 13. Security and privacy requirements

- `OPENAI_API_KEY` exists only in `.env.local`/deployment secrets and server runtime.
- `.env*` remains ignored except `.env.example`.
- `/api/assistant/parse` validates content type, size, origin/session policy, and schema.
- Never echo provider error bodies to the client.
- Never include secrets in source maps, browser bundles, analytics, or test snapshots.
- Microphone recording starts only after a user gesture and visibly indicates listening.
- Stop recognition on close, navigation into payment, inactivity, or permission loss.
- Do not persist audio. Clear transient transcript text after the action is resolved or the user cancels.
- Passenger and payment screens disable auto-listen; voice activation remains explicit.
- The assistant must state that RailEase is a prototype and not claim an IRCTC booking.
- Use `aria-live`, visible transcript editing, keyboard controls, and a typed fallback for accessibility.

## 14. Files to add

```text
app/api/assistant/parse/route.ts

components/assistant/assistant.tsx
components/assistant/assistant-messages.tsx
components/assistant/assistant-results.tsx
components/assistant/journey-review.tsx
components/assistant/microphone-button.tsx

hooks/use-speech-recognition.ts
hooks/use-speech-synthesis.ts

lib/assistant/schema.ts
lib/assistant/reducer.ts
lib/assistant/local-command-parser.ts
lib/assistant/station-resolver.ts
lib/assistant/action-executor.ts
lib/assistant/openai-client.ts

lib/booking-advisories.ts
lib/checkout-selection.ts
lib/search-navigation.ts

tests/assistant-schema.test.ts
tests/assistant-reducer.test.ts
tests/local-command-parser.test.ts
tests/station-resolver.test.ts
tests/booking-advisories.test.ts
tests/checkout-selection.test.ts
```

## 15. Files to modify

- `package.json`: add the official OpenAI SDK.
- `.env.example`: document `OPENAI_API_KEY` and optional `OPENAI_ASSISTANT_MODEL` without values.
- `components/shell.tsx`: replace current assistant internals with the new component.
- `components/providers.tsx`: add assistant state/page context or mount a dedicated provider.
- `components/search-card.tsx`: use shared search validation/navigation.
- `app/search/page.tsx`: publish raw and displayed journeys, search input, active filters, and sorting; accept assistant actions.
- `components/journey-card.tsx`: use shared selection builder and advisories.
- `components/checkout.tsx`: render final quota/fallback/verification advisories and disable implicit voice activation on payment.
- `lib/types.ts`: add assistant and advisory types if they are not kept in feature-specific modules.
- `lib/storage.ts`: add a non-sensitive assistant draft key only if persistence is required.
- `locales/*.json`: add assistant state, permission, error, warning, and confirmation strings. English/Hindi must be authored and tested; other languages may initially use the existing translation fallback policy.
- `README.md`: document setup, browser support, privacy, API billing, and prototype boundaries.

## 16. Implementation phases

### Phase 1: Shared deterministic foundation

- Extract search validation and URL construction.
- Extract checkout-context creation from `JourneyCard`.
- Implement the shared advisory engine.
- Add comprehensive unit tests before connecting voice or OpenAI.
- Update existing journey and checkout UI to use the shared helpers with no behavior regression.

### Phase 2: Assistant state and existing-page integration

- Replace the one-reply keyword assistant with reducer-based messages and phases.
- Add provider/page context.
- Publish visible results and active filters from `/search`.
- Implement local filter, sort, result description, and selection actions.
- Add selection-review panel and explicit confirmation gates.

### Phase 3: Voice layer

- Implement browser speech recognition with feature detection and typed fallback.
- Add transcript preview/editing, listening indicator, stop/cancel behavior, and permission errors.
- Implement optional browser speech synthesis with stop/repeat controls.
- Disable passive listening and sensitive-screen listening.

### Phase 4: OpenAI structured parser

- Add the SDK and server-only client.
- Implement strict Zod/Structured Output contracts.
- Write compact extraction instructions and fixtures.
- Add route validation, timeout, throttling, safe errors, and no-key fallback.
- Connect only free-form/ambiguous requests to the route.

### Phase 5: Multilingual and edge cases

- Test English, Hindi, and Hinglish utterances.
- Test relative dates, corrections, station aliases/codes, and ambiguous cities.
- Verify Tatkal date restrictions and passenger limits.
- Test multi-leg weakest-link advisories and class combinations.
- Verify quota pending, recommended, fallback, and verification states.

### Phase 6: Verification and launch readiness

- Run `npm run typecheck`, `npm test`, `npm run lint`, and `npm run build`.
- Test Chrome/Edge microphone flows and unsupported-browser fallback.
- Verify the API key is absent from client bundles and repository history.
- Test missing/invalid key, provider timeout, rate limit, malformed output, offline state, and aborted requests.
- Confirm existing typed search, authentication, checkout, Razorpay test mode, and synthetic booking flows still work.
- Update documentation and complete the acceptance checklist.

## 17. Test matrix

### Parser and conversation

- Complete search request in English, Hindi, and Hinglish.
- Missing origin, destination, date, or passenger count.
- “Tomorrow,” “day after tomorrow,” weekday, and explicit-date interpretation in `Asia/Kolkata`.
- Correction of one field and several fields.
- Same origin/destination rejection.
- Past date rejection and Tatkal-date enforcement.
- Unknown and ambiguous station names.
- Irrelevant, unsafe, very long, and prompt-injection-like utterances.
- Invalid model JSON and schema-valid but semantically invalid values.

### Results and warnings

- Available seats greater than/equal to/below passenger count.
- RAC and waitlist positions and likelihoods.
- REGRET blocking.
- Multi-leg combinations where one leg is worse.
- Direct/transfer, availability, budget, time, cheapest, and fastest commands.
- User-facing ordinal stays aligned with currently displayed results.
- Results change after date/filter modification.

### Quotas and checkout

- No passengers yet produces only `QUOTA_PENDING`.
- Eligible preferred quota with sufficient seats.
- Preferred quota with insufficient seats falls back deterministically.
- Verification-required quota.
- Mixed passenger eligibility.
- Fare/availability changes require reconfirmation.
- Voice selection and button selection create identical checkout context.

### Security and resilience

- Key never appears in `NEXT_PUBLIC_*`, rendered HTML, client JS, logs, or error responses.
- No-key mode returns a usable fallback.
- Duplicate submits make one OpenAI request.
- Timeout/retry/rate-limit behavior is bounded.
- Microphone stops on close and payment navigation.
- No transcript/audio is persisted.

## 18. Acceptance criteria

The feature is complete when:

- A user can search by microphone or text using natural language.
- Missing/ambiguous information is clarified instead of guessed.
- A confirmed voice search opens the existing `/search` page with correct parameters.
- The assistant operates on exactly the results visible on that page.
- Every journey and selection uses the same deterministic advisory engine.
- Search-time quota guidance is clearly provisional.
- Final quota selection uses actual passenger eligibility and current deterministic availability.
- RAC, waitlist, insufficient seats, unavailable classes, multi-leg risk, fallback, verification, and changed-data warnings behave as specified.
- Voice and button selection generate identical checkout data.
- The user must confirm before search, checkout, and payment handoff.
- Payment and sensitive passenger values are never sent to OpenAI.
- OpenAI failures never break ordinary RailEase search or booking.
- API requests are bounded by the cost-control requirements.
- All type checks, tests, lint, and production build pass.
- Repository and client bundles contain no API key.
- After implementation, the only required secret setup is adding `OPENAI_API_KEY` to `.env.local` or deployment secrets and restarting/redeploying the app.

## 19. Final operator setup

After all phases are implemented:

1. Create an API project with billing enabled and a conservative spend limit/alert.
2. Create a project-scoped API key.
3. Add it locally without sharing it in chat:

   ```env
   OPENAI_API_KEY=sk-...
   ```

4. Optionally override the default only when required:

   ```env
   OPENAI_ASSISTANT_MODEL=gpt-5.6-luna
   ```

5. Restart the development server or redeploy.
6. Run the assistant health/configuration check and one sample voice search.

## 20. OpenAI references

Verified against official OpenAI documentation on 2026-09-05:

- API overview, Responses versus Realtime, authentication, and secret handling: <https://developers.openai.com/api/reference/overview>
- Developer quickstart and server-side SDK setup: <https://platform.openai.com/docs/quickstart/make-your-first-api-request>
- Current model selection and pricing: <https://platform.openai.com/docs/models>

The implementation must re-check current model availability and pricing when work begins or before production launch.
