# eco-agents - EcoSphere AI Services

Python FastAPI microservice for two LangGraph-based AI workflows:
1. Proposal evaluation (`/evaluate`)
2. Autonomous impact verification (`/verify-impact`)

## What's New

- Added a second workflow for impact verification (vision/fraud + geospatial + final decision).
- Added new endpoint: `POST /verify-impact`.
- Vision/fraud provider path now uses `ChatGoogleGenerativeAI`.
- Proposal-review path still uses Groq (`ChatGroq`).
- Added fallback behavior for vision provider errors (for example quota/rate issues):
  - Uses deterministic checks instead of forcing `manual_review`.
- Added reverse-geocode-aware geospatial reasoning and clearer reason messages when OpenCage is unavailable.
- Added callback delivery to Next.js after impact verification completes.

## Architecture

```text
Next.js
  |- POST /api/project-proposals            -> triggers FastAPI /evaluate
  |- Verification callback endpoint         <- receives AI decision payload

FastAPI (port 8000)
  |- POST /evaluate
  |    LangGraph: fact_checker -> financial_analyst -> sdg_aligner -> synthesizer
  |    Output: aiReviewReport, aiConfidenceScore, status
  |
  |- POST /verify-impact
  |    LangGraph: vision_fraud -> geospatial -> decision
  |    Output: decision, confidence, reasons, fraudSignals, agentReport
  |    Then POST callback to Next.js endpoint
  |
  |- GET /health
```

## Detailed Agent Report

### `/evaluate` workflow (Proposal Evaluator)

Execution order: `fact_checker -> financial_analyst -> sdg_aligner -> synthesizer`

1. `fact_checker`
- What it does: evaluates feasibility and realism of the project idea.
- How it does it: sends title, location, project type, description, and expected impact to Groq with an auditor-style system prompt.
- Output field: `fact_checker_feedback`.
- Prompt style constraints: critical but constructive, under 200 words.

2. `financial_analyst`
- What it does: evaluates whether requested funding and timeline are proportional.
- How it does it: sends title, funding requested, duration, and description to Groq with a finance-focused system prompt.
- Output field: `financial_analyst_feedback`.
- Prompt style constraints: budget and timeline realism, under 200 words.

3. `sdg_aligner`
- What it does: validates SDG alignment and highlights mismatches.
- How it does it: sends title, primary SDG focus, SDG goals list, and description to Groq with a UN SDG expert prompt.
- Output field: `sdg_aligner_feedback`.
- Prompt style constraints: validate current goals and suggest up to 3 additional SDGs.

4. `synthesizer`
- What it does: merges all previous agent reviews into a final markdown decision report.
- How it does it: composes one consolidated prompt containing the three feedback blocks and asks Groq for:
  - `Confidence Score` in range 0-100
  - `Recommended Status` as `under_review` or `rejected`
- Output fields: `ai_review_report`, `ai_confidence_score`, `suggested_status`.
- Parsing logic: extracts score and status from returned markdown lines; if missing, defaults are score `50` and status `under_review`.

5. Persistence behavior after graph completion
- Endpoint: `POST /evaluate` in `main.py`.
- MongoDB update target: `projectproposals` collection.
- Updated document fields: `aiReviewReport`, `aiConfidenceScore`, `status`, `updatedAt`.

### `/verify-impact` workflow (Impact Verifier)

Execution order: `vision_fraud -> geospatial -> decision`

1. Request normalization and state construction (before agents run)
- Submission types accepted: `environmental_issue`, `attendance`, `daily_report` plus aliases like `issue`, `daily-report`, `attendance-record`.
- Document loading: reads the matching MongoDB collection by submission type.
- Duplicate pre-check: counts likely duplicate evidence in last 30 days using up to 3 image values.
- State builder: extracts claim text, action label, image evidence, coordinates, user id, project center/radius, and area name.
- Radius safety rule: minimum radius is clamped to `50m`.

2. `vision_fraud`
- What it does: evaluates whether submission evidence supports the claimed action and flags likely fraud/synthetic signals.
- How it does it:
  - Uses `ChatGoogleGenerativeAI` with `GOOGLE_VISION_MODEL` and `GOOGLE_API_KEY`.
  - Sends metadata prompt including claim text, submission type, image URL samples, and duplicate count.
  - Expects strict JSON keys: `action_supported`, `ai_generated_likely`, `confidence`, `reasons`, `fraud_signals`.
- Core pass rule:
  - Pass only if `action_supported` is true.
  - Fail if `ai_generated_likely` is true.
  - Fail if duplicate candidates count is greater than 0.
- Provider fallback behavior:
  - If Google call fails (for example quota/provider error), deterministic fallback is used.
  - Fallback heuristic: claim text length must be at least 15 and duplicates must be zero.
  - Fallback confidence: `0.45` for pass, `0.35` for fail.
- Output fields: `vision_passed`, `vision_confidence`, `vision_reasons`, `fraud_signals`, `vision_technical_error`.

3. `geospatial`
- What it does: validates whether claimed coordinates are plausible for the project area.
- How it does it:
  - If coordinates are missing, immediate fail with low confidence.
  - Computes haversine distance from claimed point to project center when center coordinates are provided.
  - Distance rule: pass distance check when `distance_m <= max(50, radius_meters)`.
  - Optional OpenCage reverse geocoding when `OPENCAGE_API_KEY` is set.
  - Area-text rule: if project area name is available and OpenCage succeeds, checks substring match against reverse-geocoded address/components text.
- Confidence scoring:
  - Starts at `0.5`.
  - `+0.25` if distance check passes, else `-0.25`.
  - If area check is active: `+0.2` for match, `-0.2` for mismatch.
  - Final value is clamped to `0..1`.
- Output fields: `geo_passed`, `geo_confidence`, `geo_reasons`, `geo_check_summary`, `geo_technical_error`.

4. `decision` (`impact_decision_agent`)
- What it does: combines vision/fraud and geospatial outcomes into a final action.
- How it does it:
  - Aggregates reasons from both previous agents.
  - If any technical uncertainty flag is true, returns `manual_review` and `review_required=true`.
  - Otherwise returns:
    - `approved` when both vision and geospatial pass
    - `rejected` for all other non-technical outcomes
  - Final confidence is average of vision and geo confidence, clamped to `0..1`.
  - Builds markdown `agent_report` containing pass/fail status and reason list.
- Output fields: `final_decision`, `final_confidence`, `final_reasons`, `review_required`, `agent_report`.

5. Callback behavior after graph completion
- Endpoint: `POST /verify-impact` in `main.py`.
- Callback payload includes:
  - `decision`, `confidence`, `reasons`, `reviewRequired`
  - `fraudSignals`, `geoCheckSummary`, `agentReport`
  - `idempotencyKey` format: `<submissionType>:<submissionId>:<decision>`
- Callback URL source:
  - request body `callbackUrl` if provided
  - else `AI_IMPACT_CALLBACK_URL`
- Failure behavior: callback failures are logged and are non-fatal for API response.

## Quick Start

### 1. Install dependencies

```bash
cd eco-agents
python3 -m venv .venv

# Windows
.venv\Scripts\activate

# macOS / Linux
source .venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env and fill in keys/URIs listed below
```

### 3. Run the service

```bash
uvicorn main:app --reload --port 8000
```

- Health: <http://localhost:8000/health>
- Docs: <http://localhost:8000/docs>

## API Examples

### Evaluate a proposal

```bash
curl -X POST http://localhost:8000/evaluate \
  -H "Content-Type: application/json" \
  -d '{"proposalId":"<existing_mongo_id>"}'
```

### Verify impact submission

```bash
curl -X POST http://localhost:8000/verify-impact \
  -H "Content-Type: application/json" \
  -d '{
    "submissionType": "daily_report",
    "submissionId": "<existing_mongo_id>",
    "radiusMeters": 1000,
    "projectAreaName": "Kolkata",
    "projectCenterLatitude": 22.5726,
    "projectCenterLongitude": 88.3639
  }'
```

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MONGODB_URI` | Yes | `mongodb://localhost:27017` | MongoDB connection string |
| `MONGODB_DB_NAME` | No | `ecosphere` | Database name |
| `GROQ_API_KEY` | Yes (proposal flow) | - | Groq API key for proposal evaluator |
| `GROQ_MODEL` | No | `llama-3.3-70b-versatile` | Proposal evaluator model |
| `GOOGLE_API_KEY` | Yes (vision AI) | - | Google GenAI key for vision/fraud agent |
| `GOOGLE_VISION_MODEL` | No | `gemini-3-flash-preview` | Preferred Google vision model |
| `OPENCAGE_API_KEY` | No | - | Enables reverse geocoding in geospatial checks |
| `AI_IMPACT_CALLBACK_URL` | No | `http://localhost:3000/api/verification/impact-callback` | Callback URL for impact results |
| `AI_VERIFICATION_CALLBACK_SECRET` | No | - | Optional shared secret sent as `x-ai-verification-secret` |

## Integration Notes

- In Next.js, set `AI_EVALUATOR_URL=http://localhost:8000` in `.env.local`.
- Impact verification callbacks are non-fatal for the caller: if callback delivery fails, FastAPI logs the error but still returns success for the verification request.

## Confidence Score Calculation (Exact)

This section is a direct reference for how every confidence value is computed in code.

### A) Proposal evaluator confidence (`/evaluate`)

- Field: `ai_confidence_score`
- Range: `0..100` (integer)
- Where computed: `synthesizer` node

Rules:
1. Start with default `confidence_score = 50`.
2. Ask LLM to include a line like `Confidence Score: <number>`.
3. Parse first integer from that line using regex `re.findall(r"\\d+", line)`.
4. Clamp parsed value to `0..100`.
5. If missing/unparseable, keep default `50`.

Formula:
`ai_confidence_score = clamp_0_100(parsed_integer_or_50)`

### B) Vision/Fraud confidence (`/verify-impact`)

- Field: `vision_confidence`
- Range: `0..1` (float)
- Where computed: `vision_fraud_agent`

Normal path:
1. Vision model returns JSON key `confidence`.
2. Use default `0.55` when the key is missing.
3. Clamp to `0..1`.

Fallback path (provider error):
1. Use deterministic heuristic (`len(claim_text.strip()) >= 15` and no duplicates).
2. If heuristic passes: `vision_confidence = 0.45`.
3. If heuristic fails: `vision_confidence = 0.35`.

Formulas:
- Normal: `vision_confidence = clamp_0_1(model_confidence_or_0.55)`
- Fallback: `vision_confidence = 0.45 if heuristic_pass else 0.35`

### C) Geospatial confidence (`/verify-impact`)

- Field: `geo_confidence`
- Range: `0..1` (float)
- Where computed: `geospatial_agent`

Base score:
`geo_confidence = 0.5`

Distance contribution:
- `+0.25` if within radius
- `-0.25` if outside radius

Area-text match contribution (only when project area text check is active):
- `+0.2` if match
- `-0.2` if mismatch

Then clamp to `0..1`.

Special case:
- If coordinates are missing: immediate `geo_confidence = 0.1` and fail.

Formula:
`geo_confidence = clamp_0_1(0.5 + distance_term + area_term)`

### D) Final impact confidence (`/verify-impact`)

- Field: `final_confidence`
- Range: `0..1` (float)
- Where computed: `impact_decision_agent`

Formula:
`final_confidence = clamp_0_1((vision_confidence + geo_confidence) / 2)`

Notes:
- It is an equal-weight average (50/50 vision and geo).
- Decision logic (`approved`/`rejected`/`manual_review`) is separate from this average.

### E) Scale difference reminder

- Proposal confidence (`ai_confidence_score`) uses `0..100` integer scale.
- Impact confidence (`vision_confidence`, `geo_confidence`, `final_confidence`) uses `0..1` float scale.
