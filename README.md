# SATQuery

**The agentic analyst for Earth observation.**

> We didn't build an AI that looks at satellite images. We built an AI that knows what analysis needs to be done before it answers.

**Smart India Hackathon 2026 · Problem Statement SIH26167**

*Problem statement:* SatQuery AI - An Interactive Vision-Language Assistant for Multimodal Remote Sensing Image Analysis through Text Queries
*Organisation:* Indian Space Research Organisation (ISRO)

> **Project status:** Core backend and orchestration pipeline built and tested end-to-end, including the safety-critical refusal behavior. The model-serving layer currently uses a mock service that proves the full contract; a real pretrained change-detection model is the next integration step. See [Status and roadmap](#status-and-roadmap).

---

## Table of contents

- [Overview](#overview)
- [The problem](#the-problem)
- [Key features](#key-features)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [API reference](#api-reference)
- [Dataset layout](#dataset-layout)
- [MVP target metrics](#mvp-target-metrics)
- [Demo scenarios](#demo-scenarios)
- [Status and roadmap](#status-and-roadmap)
- [Getting started](#getting-started)
- [Vision](#vision)
- [Team](#team)
- [License](#license)
- [Acknowledgements](#acknowledgements)

---

## Overview

SATQuery lets a user ask a natural-language question about one or two satellite images. Instead of guessing an answer, it:

1. works out what kind of remote-sensing analysis the question actually requires,
2. validates that the imagery is suitable for that analysis,
3. routes the task to specialist models and tools, and
4. returns a spatially grounded answer with visual evidence, a confidence score and an observable execution trace.

The core design principle: **the LLM is not the remote-sensing expert.** It acts as a dispatcher that orchestrates specialist models, which do the actual analysis.

```
Intent → Analysis → Evidence → Answer
```

---

## The problem

Querying satellite imagery is hard, but the deeper problem is that turning heterogeneous Earth-observation data into **trustworthy, auditable answers** usually requires remote-sensing, GIS and model-selection expertise.

| Traditional workflow | SATQuery workflow |
| --- | --- |
| Find imagery | Ask a question |
| Understand metadata | Understand intent |
| Preprocess | Validate imagery |
| Determine sensor / modality | Select analysis |
| Choose and configure model | Run specialist models |
| Run inference | Check evidence |
| GIS analysis and comparison | Answer + evidence |
| Validate and produce report | |

Specific pain points SATQuery targets:

- **Tool fragmentation:** users must know which dataset, model and GIS operation to use. SATQuery determines the workflow.
- **Modality blindness:** optical and SAR measure reality differently. The system should know which evidence source is useful.
- **Temporal reasoning:** one image answers *what exists*; two images answer *what changed*. These are different tasks.
- **Natural-language ambiguity:** questions like "Has the city expanded?" are underspecified and must be translated into an explicit analysis.
- **Hallucination:** an LLM can confidently claim change without proving it. Conclusions must be grounded in spatial evidence.
- **Trust:** users need answer → evidence → location → model → confidence → execution trace, not just a generated sentence.

---

## Key features

### MVP capabilities

| Capability | Example question | Status |
| --- | --- | --- |
| Bi-temporal change analysis | "What changed?" | **Built and tested end-to-end** (via mock model service; real model integration pending) |
| Input validation / refusal | Incompatible image pair | **Built and tested end-to-end** — genuine refusal behavior confirmed live |
| Single-image VQA | "What do you see?" | Not yet built |
| Optical / SAR analysis | "Can SAR provide additional evidence?" | Not yet built (planned after core pipeline, per original design) |

### Supporting features

- **Automatic analysis selection:** the user does not specify the analysis; SATQuery determines it. *(Routing logic currently lives in the frontend's LLM chat layer; not yet a backend-owned decision.)*
- **Input validation:** checks imagery compatibility before running any analysis. **Built** — checks content type and modality alignment.
- **Evidence map:** before / after / detected-change views with highlighted regions, backed by real stored GeoJSON. **Built** — `GET /analysis/{id}/geojson` returns a standard `FeatureCollection`.
- **Execution trace:** a step-by-step log of what the system did, stored per analysis. **Built.**
- **Refusal when evidence is insufficient:** SATQuery declines to answer rather than manufacture a result. **Built and verified live** — this is the strongest-tested part of the system.

### Trust principles

> Don't make SATQuery smarter than the evidence.

- If evidence is weak, it says *"Insufficient evidence."*
- If images are incompatible, it refuses to run an unreliable comparison.
- If models disagree, it surfaces the disagreement and recommends verification.
- If independent evidence sources agree, confidence can increase.
- Confidence is tied to evidence, not invented by the LLM.

---

## Architecture

```
                    SATQuery
                       │
              ┌────────▼────────┐
              │   Query Router  │
              │      LLM        │
              └────────┬────────┘
                       │
          ┌────────────┼─────────────┐
          ▼            ▼             ▼
       VQA Tool    Change Tool   SAR Tool
          │            │             │
          └────────────┼─────────────┘
                       ▼
               Evidence Engine
                       │
                       ▼
                Answer + Map
```

### Core components

| Component | Purpose | Status |
| --- | --- | --- |
| **GeoDoctor** | Validates whether imagery is suitable for the requested analysis: content type and modality alignment today; geographic bounds, resolution and date compatibility planned. | Built (basic version) |
| **AskMap / Intent Compiler** | Converts a natural-language question into an executable geospatial workflow. | Not yet built |
| **ChangeRadar** | Temporal-analysis engine that turns before/after imagery into semantic change regions, area estimates and evidence. | Built via a mock model service returning question-aware, realistic results; real trained model pending |
| **EvidenceChain** | Turns every conclusion into an auditable record: claims, evidence regions, source images, confidence and execution steps, all persisted in the database. | Built |

### Agent design

The agent is deliberately constrained. The LLM chooses from a small, controlled toolbox, and the backend executes deterministic operations. The LLM never executes arbitrary code.

```
validate_images()      ✅ built
analyze_single_image() ⬜ not built
compare_images()       ✅ built
analyze_sar()          ⬜ not built (planned after core pipeline is stable)
```

Example routing for *"Has construction increased?"*:

```json
{
  "task": "change_detection",
  "tools": ["validate_images", "compare_images"]
}
```

### Change detection pipeline

```
Image A + Image B
  ↓
Preprocessing
  ↓
Change detection model     ← currently a mock service; real pretrained model pending
  ↓
Binary change mask
  ↓
Connected components / regions
  ↓
Semantic classification
  ↓
Evidence + area + confidence
```

The MVP will use a **pretrained** remote-sensing change-detection model rather than training one from scratch. Candidate model families include ChangeFormer, BIT and suitable segmentation pipelines (final choice TBD). A mock service implementing the exact same request/response contract is live today, so the full pipeline is provably wired correctly ahead of the real model being connected.

SAR is designed as a specialist capability. One real SAR workflow, using an appropriate pretrained model or tool, will be added after the core pipeline is stable.

---

## Tech stack

| Layer | Technology | Notes |
| --- | --- | --- |
| Frontend | React + TypeScript + Vite | Served via a custom Express server |
| UI | Tailwind CSS | |
| Backend | FastAPI + Python 3.12 | |
| Package management | `uv` | |
| Database | PostgreSQL (production/Docker) with SQLite fallback (local dev) | Schema managed via Alembic migrations |
| LLM (chat assistant) | Google Gemini | Wired into the frontend's own server |
| Orbital mechanics | `sgp4` + `skyfield` | Real satellite position calculation from live TLE data |
| Satellite data source | Celestrak | Live, scheduled sync every 24h |
| Auth | API key (`X-API-Key` header) | Enforced on every backend endpoint |
| Rate limiting | `slowapi` | 60 requests/minute per client |
| Containerization | Docker + Docker Compose | Backend + Postgres |
| CI | GitHub Actions | Runs the automated test suite on every push |
| Testing | `pytest` | 58 automated backend tests |

---

## API reference

Actual, implemented, tested endpoints (all require an `X-API-Key` header):

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | Health check |
| `POST` | `/satellites/` | Create a satellite record |
| `GET` | `/satellites/` | List/search satellites (paginated) |
| `GET` | `/satellites/{id}/position` | Real-time lat/lon/altitude from live orbital data |
| `POST` | `/satellites/sync` | Pull live satellite data from Celestrak |
| `POST` | `/images/` | Upload a satellite image |
| `GET` | `/images/` | List images (filterable by satellite) |
| `GET` | `/images/{id}/file` | Download an uploaded image |
| `POST` | `/image-pairs/` | Link a before/after image pair |
| `POST` | `/validate` | GeoDoctor compatibility check on an image pair |
| `POST` | `/analyze` | Run analysis for a natural-language question on an image pair |
| `GET` | `/analysis/{id}` | Retrieve a completed analysis |
| `GET` | `/analysis/{id}/geojson` | Export detected regions as a GeoJSON `FeatureCollection` |
| `POST` | `/sessions/` | Create a chat session |
| `POST` | `/sessions/{id}/messages` | Add a message to a session |

### Example: `POST /analyze`

Request:

```json
{
  "image_pair_id": 3,
  "question": "Has construction increased?"
}
```

Response (real output from the current system, using the mock model service):

```json
{
  "task": "change_detection",
  "execution_trace": [
    "validate_images",
    "change_detection",
    "semantic_classification"
  ],
  "answer": "Built-up area increased by 14.8% across the observed region, consistent with new construction activity.",
  "confidence": 0.91,
  "regions": [
    { "type": "construction", "area": 1240, "confidence": 0.91 }
  ]
}
```

If the image pair is incompatible, the same endpoint returns a genuine refusal instead:

```json
{
  "task": "refused",
  "confidence": 0.0,
  "answer": "Analysis refused: images are not compatible for comparison. File type mismatch: before is 'image/tiff', after is 'image/png'. Modality mismatch: before is 'SAR', after is 'Optical'.",
  "execution_trace": ["validate_images"],
  "regions": []
}
```

---

## Dataset layout

<!-- TODO: list the specific public datasets used, with links and licenses, once selected -->

Development will use a small, curated set of public remote-sensing datasets and known examples, organised by scenario, plus roughly 20–50 test questions for repeatable benchmarking.

```
/data
  /urban
    before.tif
    after.tif
  /construction
    before.tif
    after.tif
  /flood
    before.tif
    after.tif
  /vegetation
    before.tif
    after.tif
```

---

## MVP target metrics

> **These are development targets, not measured results**, since the real model has not been integrated yet.

| Metric | Target | Measured |
| --- | --- | --- |
| Query routing accuracy | > 90% | TBD |
| Change detection IoU | > 70% | TBD |
| Semantic classification accuracy | > 85% | TBD |
| Evidence coverage | > 90% | TBD |
| Average response time | < 15 s | TBD |
| Invalid-input detection | > 90% | **Confirmed working** — refusal path tested live |

---

## Demo scenarios

1. **Hero change demo:** upload two compatible images and ask *"What changed?"* — returns a real, question-aware answer with evidence regions and GeoJSON. *(Currently backed by a mock model service that proves the pipeline; not yet a trained model.)*
2. **Failure demo:** upload incompatible images (e.g. mismatched modality) and SATQuery genuinely refuses to make an unreliable claim. **This path is fully real and verified**, not scripted.
3. **Easy VQA:** upload one image and ask what is visible. *(Not yet built.)*
4. **Agentic routing demo:** ask whether urban development increased, and SATQuery selects change detection on its own. *(Routing currently lives in the frontend's LLM layer, not yet a backend-owned decision.)*

### Example execution trace (hero demo, real output)

```
SATQuery Execution

✓ validate_images
✓ change_detection
✓ semantic_classification

Result:
2 regions of new construction
Estimated new built-up area: 1,880 m²
Confidence: 91%
```

### Example refusal (real output)

```
Analysis refused: images are not compatible for comparison.
File type mismatch: before is 'image/tiff', after is 'image/png'.
Modality mismatch: before is 'SAR', after is 'Optical'.
```

---

## Status and roadmap

| # | Milestone | Status |
| --- | --- | --- |
| 1 | Backend API, database, and orchestration pipeline (validate → analyze → store → retrieve → export) | **Done** |
| 2 | Refusal / trust behavior for incompatible imagery | **Done, verified live** |
| 3 | Mock model service proving the full `/analyze` contract end-to-end | **Done** |
| 4 | Real satellite tracking (live Celestrak sync, orbital position) | **Done** |
| 5 | Image upload/storage and bi-temporal pairing | **Done** |
| 6 | Chat session persistence | **Done** |
| 7 | Frontend UI, connected to backend for image upload | **Done** |
| 8 | Auth, rate limiting, CI, Docker, Postgres-ready | **Done** |
| 9 | Real pretrained change-detection model (replacing the mock service) | Planned — next priority |
| 10 | LLM-based query routing owned by the backend | Planned |
| 11 | Single-image VQA (`analyze_single_image`) | Planned |
| 12 | SAR workflow (`analyze_sar`) | Planned, after core pipeline with a real model is stable |

---

## Getting started

### Prerequisites

- Python 3.12
- [`uv`](https://docs.astral.sh/uv/) for Python dependency management
- Node.js (LTS) and npm, for the frontend
- Docker (optional, for running with PostgreSQL instead of local SQLite)

### Installation

```bash
# Clone the repository
git clone https://github.com/hammadkhan5426/SATQuery.git
cd SATQuery

# Backend setup
cd backend
uv sync
cp .env.example .env
# edit .env and set a real API_KEY
uv run alembic upgrade head

# Frontend setup
cd ../SIH-UI-main/SIH-UI-main
npm install
# create a .env file with VITE_API_BASE_URL and VITE_API_KEY matching the backend
```

### Environment variables

**Backend (`backend/.env`):**
```
APP_TITLE="SATQuery API"
APP_DESCRIPTION="Backend API for SATQuery"
APP_VERSION="0.1.0"
API_KEY="your-secret-api-key-here"
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
# DATABASE_URL=postgresql://user:password@localhost:5432/satquery
```

**Frontend (`SIH-UI-main/SIH-UI-main/.env`):**
```
VITE_API_BASE_URL=http://127.0.0.1:8000
VITE_API_KEY=your-secret-api-key-here
GEMINI_API_KEY=your-gemini-key-here
```

### Running locally

```bash
# Terminal 1 — backend
cd backend
uv run fastapi dev app/main.py

# Terminal 2 — frontend
cd SIH-UI-main/SIH-UI-main
npm run dev
```

Backend runs at `http://localhost:8000` (interactive docs at `/docs`). Frontend runs at `http://localhost:3000`.

### Running tests

```bash
cd backend
uv run pytest -v
```

### Running with Docker

```bash
docker compose up
```

---

## Vision

```
SATQuery today:     Ask → Analyze → Explain
SATQuery tomorrow:  Monitor → Detect → Alert → Act
```

Long term, SATQuery aims to become a reasoning and orchestration layer above satellite data, optical imagery, SAR, specialist VQA / segmentation / change-detection models, GIS and external Earth-observation APIs. It would continuously turn Earth-observation data into decisions. Potential application areas include construction, infrastructure, mining, agriculture, disaster response and environmental monitoring.

---

## Team

**Team name:** Logic Forge · **Institution:** NSUT (Netaji Subhas University of Technology)

| Name | Role |
| --- | --- |
| Hammad Khan | Frontend |
| Karan Buriya | Frontend UI |
| Abdul Rehman | Backend |
| Dhruv Sharma | Backend |
| Kavya Garg | Presentation, Testing |
| Vanshika | Presentation, Testing |

---

## License

Not yet licensed.

---

## Acknowledgements

- Smart India Hackathon 2026
- Indian Space Research Organisation (ISRO)
- Celestrak, for live satellite tracking data
- `[Pretrained model authors, e.g. change-detection model repositories used]`
