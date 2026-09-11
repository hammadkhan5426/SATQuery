# SATQuery

**The agentic analyst for Earth observation.**

> We didn't build an AI that looks at satellite images. We built an AI that knows what analysis needs to be done before it answers.

**Smart India Hackathon 2026 · Problem Statement SIH26167**
<!-- TODO: add official problem statement title and nodal organisation -->
*Problem statement:* `[PS TITLE]` · *Organisation:* `[ORGANISATION]`

> **Project status:** MVP in planning / early development. Features, metrics and stack choices below describe the intended system, not a finished product. See [Status and roadmap](#status-and-roadmap).

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

| Capability | Example question | Role |
| --- | --- | --- |
| Single-image VQA | "What do you see?" | Basic image understanding |
| Bi-temporal change analysis | "What changed?" | Hero capability |
| Optical / SAR analysis | "Can SAR provide additional evidence?" | Multimodal remote sensing |

### Supporting features

- **Automatic analysis selection:** the user does not specify the analysis; SATQuery determines it.
- **Input validation:** checks imagery compatibility before running any analysis.
- **Evidence map:** before / after / detected-change views with highlighted regions. Clicking a region shows its semantic class, estimated area and confidence.
- **Execution trace:** a step-by-step log of what the system did. Every step corresponds to a real backend operation, not a simulated "thinking" animation.
- **Refusal when evidence is insufficient:** SATQuery declines to answer rather than manufacture a result.

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

| Component | Purpose |
| --- | --- |
| **GeoDoctor** | Validates whether imagery is suitable for the requested analysis: dimensions, geographic compatibility, resolution, dates, modality, alignment and metadata. |
| **AskMap / Intent Compiler** | Converts a natural-language question into an executable geospatial workflow (e.g. buffer a road, detect built-up regions, compare dates, intersect results). |
| **ChangeRadar** | Temporal-analysis engine that turns before/after imagery into semantic change regions, area estimates and evidence. |
| **EvidenceChain** | Turns every conclusion into an auditable record: claims, evidence regions, source images, models, confidence and execution steps. |

### Agent design

The agent is deliberately constrained. The LLM chooses from a small, controlled toolbox, and the backend executes deterministic operations. The LLM never executes arbitrary code.

```
validate_images()
analyze_single_image()
compare_images()
analyze_sar()
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
Change detection model
  ↓
Binary change mask
  ↓
Connected components / regions
  ↓
Semantic classification
  ↓
Evidence + area + confidence
```

The MVP will use a **pretrained** remote-sensing change-detection model rather than training one from scratch. Candidate model families include ChangeFormer, BIT and suitable segmentation pipelines (final choice TBD).

SAR is designed as a specialist capability. One real SAR workflow, using an appropriate pretrained model or tool, will be added after the core pipeline is stable.

---

## Tech stack

Planned stack. Items marked *(candidate)* are not yet final.

| Layer | Technology |
| --- | --- |
| Frontend | Next.js + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Mapping | MapLibre GL |
| Backend | FastAPI + Python |
| LLM orchestration | Fast, tool-calling-capable LLM, e.g. a Groq-hosted model *(candidate)* |
| Remote sensing | PyTorch + pretrained remote-sensing models |
| Geospatial processing | Rasterio + GDAL + GeoPandas |
| Database | Supabase / PostgreSQL |
| File storage | Supabase Storage |
| Frontend deployment | Vercel |
| Backend deployment | Python host such as Render or Railway *(candidate)* |

---

## API reference

Planned minimal API:

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/upload` | Upload satellite imagery |
| `POST` | `/validate` | Validate imagery for a requested analysis |
| `POST` | `/analyze` | Run analysis for a natural-language question |
| `GET` | `/analysis/{id}` | Retrieve a completed analysis |

### Example: `POST /analyze`

Request:

```json
{
  "question": "Has construction increased?",
  "image_a": "...",
  "image_b": "..."
}
```

Response (illustrative values):

```json
{
  "task": "change_detection",
  "execution": [
    "validate_images",
    "change_detection",
    "semantic_classification",
    "evidence_generation"
  ],
  "answer": "Built-up area increased by 14.8%.",
  "confidence": 0.91,
  "regions": [
    {
      "type": "construction",
      "area": 1240,
      "confidence": 0.91
    }
  ]
}
```

---

## Dataset layout

Development will start with a small, curated set of public remote-sensing datasets and known examples, organised by scenario, plus roughly 20–50 test questions for repeatable benchmarking.
<!-- TODO: list the specific public datasets used, with links and licenses -->

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

> **These are development targets, not measured results.** Actual results will be measured and reported here as they become available.

| Metric | Target | Measured |
| --- | --- | --- |
| Query routing accuracy | > 90% | TBD |
| Change detection IoU | > 70% | TBD |
| Semantic classification accuracy | > 85% | TBD |
| Evidence coverage | > 90% | TBD |
| Average response time | < 15 s | TBD |
| Invalid-input detection | > 90% | TBD |

---

## Demo scenarios

1. **Easy VQA:** upload one image and ask what is visible.
2. **Hero change demo:** upload two images and ask *"What changed?"*
3. **Agentic routing demo:** ask whether urban development increased, and SATQuery selects change detection + segmentation on its own.
4. **Failure demo:** upload incompatible images and SATQuery refuses to make an unreliable claim.

### Example execution trace (hero demo, illustrative)

```
SATQuery Execution

✓ Understanding question
✓ Validating satellite imagery
  └─ Images geographically compatible
✓ Selecting analysis
  └─ Bi-temporal change detection
✓ Running change detector
✓ Semantic classification
✓ Generating spatial evidence
✓ Answer verified

Result:
3 high-confidence regions of new construction
Estimated new built-up area: 4,820 m²
Confidence: 91%
```

### Example refusal (failure demo)

```
⚠ Cannot reliably perform change detection.
The images have incompatible spatial resolution/alignment.
Running the analysis could produce false changes.
```

---

## Status and roadmap

Development follows this order. Update the status column as work progresses.

| # | Milestone | Status |
| --- | --- | --- |
| 1 | Remote-sensing inference working in Python (image pair → change mask) | Planned |
| 2 | Wrap inference in FastAPI | Planned |
| 3 | LLM query routing | Planned |
| 4 | Before / after / change visualisation | Planned |
| 5 | Execution trace | Planned |
| 6 | Uncertainty and evidence | Planned |
| 7 | SAR workflow (after core pipeline is stable) | Planned |

---

## Getting started

> Setup instructions will be added once the codebase is available.

<!-- TODO: fill in once code exists -->

### Prerequisites

- Node.js `[VERSION]`
- Python `[VERSION]`
- GDAL `[VERSION]`
- `[OTHER REQUIREMENTS]`

### Installation

```bash
# Clone the repository
git clone [REPO_URL]
cd [REPO_NAME]

# Backend setup
# [TODO]

# Frontend setup
# [TODO]
```

### Environment variables

```
# [TODO: list required variables, e.g. LLM API key, Supabase URL/key]
```

### Running locally

```bash
# [TODO]
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

<!-- TODO: fill in team details -->

**Team name:** `[TEAM NAME]` · **Team ID:** `[TEAM ID]` · **Institution:** `[INSTITUTION]`

| Name | Role | GitHub |
| --- | --- | --- |
| `[NAME]` | `[ROLE]` | `[@handle]` |
| `[NAME]` | `[ROLE]` | `[@handle]` |

**Mentor:** `[MENTOR NAME]`

---

## License

`[LICENSE]`. See [LICENSE](LICENSE) for details.
<!-- TODO: choose a license and add a LICENSE file -->

---

## Acknowledgements

- Smart India Hackathon 2026
- `[Dataset providers]`
- `[Pretrained model authors, e.g. change-detection model repositories used]`
