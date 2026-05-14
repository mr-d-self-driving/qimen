# Qimen Dunjia · AI Decision Engine

> **Ancient Chinese metaphysics, rebuilt as a modern AI reasoning system.**  
> Qimen Dunjia turning-board calculations × Bazi chart analysis × deterministic fortune scoring × Gemini × Vue

<p align="center">
  <img src="https://i.imgur.com/8MVTjsS.jpeg" width="200" alt="Qimen result card"/>
  &nbsp;&nbsp;
  <img src="https://i.imgur.com/Dr5tEar.jpeg" width="200" alt="Daily fortune score"/>
  &nbsp;&nbsp;
  <img src="https://i.imgur.com/503GVir.jpeg" width="200" alt="Bazi interpretation"/>
</p>

<p align="center">
  <a href="../../README.md">简体中文</a> |
  English |
  <a href="./README.zh-TW.md">繁體中文</a>
</p>

---

## Overview

Most Qimen tools either stop at chart generation or repeat terminology without reasoning. This project aims for something different: **AI interpretation built on top of deterministic metaphysics rules, not free-form fortune telling.**

The user asks a question, and the system automatically decides whether it should be answered with Qimen Dunjia, Bazi, or a combined reading. The routing layer identifies the type of question, injects the right rule set and chart context, and passes the structured context into the reasoning engine.

The Qimen module handles concrete events, short-term decisions, timing, direction, and action windows. The Bazi module handles natal structure, long-term cycles, industry fit, and life-pattern analysis. The fortune module handles daily, weekly, monthly, and yearly scoring with actionable guidance. Deterministic code produces the objective calculations; the language model turns those conclusions into readable advice.

This is not a template generator. It is a **rules-first metaphysics reasoning system with AI as the expression layer**.

---

## Core Features

### Divination Routing Engine

- Automatically decides whether a question should use Qimen, Bazi, or a combined reading
- Covers common domains such as career, finance, relationships, health, lost items, exams, legal matters, feng shui, pregnancy, and miscellaneous decisions
- Injects domain-specific rules, chart context, and real-world background into the interpretation flow
- Asks for missing information before attempting a reading when the question is underspecified

### Qimen Dunjia Reading

- Implements the Shi Jia Qimen turning-board method, including Jiazi hiding, Fu Tou positioning, nine stars, eight gates, and eight spirits
- Handles key chart signals such as Tian Rui, Tian Qin lodging in Kun, emptiness, and traveling-horse indicators
- Switches useful-god rules by question domain instead of applying one generic interpretation to every case
- Produces auspiciousness scores, risk signals, timing windows, favorable directions, favorable time ranges, and concrete suggestions
- Supports reading history and validation feedback for later calibration

### Bazi System

- Supports Gregorian input, lunar input, and direct Four Pillars input
- Supports birthplace longitude, mean solar time, and true solar time correction
- Expands stems, branches, ten gods, hidden stems, twelve growth phases, Na Yin, emptiness, spirits, and special patterns
- Uses a local rule engine for day-master strength, favorable elements, pattern judgment, and generation-control relationships
- Provides five-element power visualization, scoring details, Bazi Q&A, and feedback-based recalibration
- Supports linked luck pillars, annual cycles, and monthly cycles to show how the natal chart interacts with current time

### Fortune Scoring

| Range | What It Does |
| --- | --- |
| Daily | Computes the daily score and shows insight cards, timeline, favorable hours, and mitigation advice |
| Weekly | Produces weekly trends and action reminders |
| Monthly | Uses solar terms for month boundaries and shows monthly curves, high-score days, low-score days, and difficult periods |
| Yearly | Generates a ten-year range with luck-cycle context, annual ten-god signals, natal interactions, and spirit indicators |

Monthly detailed readings support four dimensions: general, career, wealth, and relationships. Users can provide long-term context and current-month background, which are then injected into the reading.

### Metaphysics Engineering Dashboard

- Breaks complex metaphysics reasoning workflows into clear roles and steps
- Provides a centralized view of rules, cache state, engine status, and interpretation flow
- Helps advanced users or administrators inspect the reasoning pipeline

### Guest, Auth, and Commercial Flow

- Supports email login, Google login, and password reset
- Guest mode allows one Qimen question, one local Bazi profile, and today's fortune score
- Guest events filter sensitive fields such as names, birth dates, and question text
- Bottom navigation adapts to signed-in and guest states; password reset hides the main navigation

---

## Reasoning Architecture

```text
User question
  │
  └─► Divination routing engine
        │
        ├─► Qimen Dunjia: concrete events, short-term decisions, timing
        ├─► Bazi: natal structure, long-term cycles, industry fit
        ├─► Combined reading: natal background × current event
        └─► Clarification: collect missing context before reading
              │
              └─► Domain rule injection
                    │
                    └─► Main reasoning engine
                          │
                          └─► Structured decision card
```

---

## Tech Stack

```text
Frontend       Vue 3, Composition API, Pinia, Vue Router, vue-i18n
Backend        Cloudflare Workers
Database       Supabase Auth, Postgres, row-level security
AI             Gemini-compatible API
Calendar       lunar-javascript
Build Tool     Vite
Tests          Node.js Test Runner
Production     Cloudflare Pages + Cloudflare Workers
```

### Engineering Notes

- **Deterministic scoring**: daily, monthly, and yearly scores are produced by local rule engines; the model cannot overwrite them
- **Layered caching**: fortune results are stored in the database and cached on the frontend
- **Warmup flow**: signed-in users can preload the next seven daily readings
- **Fallback behavior**: Bazi readings fall back to local rules when model generation fails; fortune pages can still show scores before prose is ready
- **Test coverage**: covers CORS, Bazi APIs, guest mode, caching, warmup, monthly fortune, yearly fortune, and core UI constraints
- **Single backend entry point**: backend routes are centralized in `worker/src/index.js` for easier maintenance and review

---

## Local Development

```bash
npm install
npm run dev
npm test
npm run build
```

### Backend Local Debugging

```bash
cd worker
npx wrangler dev
```

The backend starts at `http://localhost:8787`, and the frontend proxy forwards `/api/*` requests to that address.

---

## Operations

This is a personal website maintained by the author. The live service runs on Cloudflare Workers, Cloudflare Pages, Supabase, and a Gemini-compatible model endpoint. This document describes the project shape and local development flow only; it does not provide public deployment instructions, secret configuration, or self-hosting steps.

Database migration scripts are kept in `docs/sql/` for the author's own maintenance and feature evolution.

---

## Project Structure

```text
/
├── worker/          # Backend API entry point and Cloudflare Workers config
├── lib/             # Qimen, Bazi, fortune scoring, and prompt-building core logic
├── src/             # Vue frontend app
├── docs/sql/        # Database migration scripts
├── mock/            # Guest-mode and test mock data
├── public/          # Static assets and SPA fallback config
├── archive/         # Historical APIs and old prototypes
└── package.json
```

---

## Screenshots

<p align="center">
  <img src="https://i.imgur.com/8MVTjsS.jpeg" width="220" alt="Qimen result card"/>
  &nbsp;
  <img src="https://i.imgur.com/wI8vWzc.jpeg" width="220" alt="Decision notes"/>
</p>

**Qimen result cards include:**

- Auspiciousness score, five-part interpretation, scoring rationale, and risk tags
- Nine-palace chart visualization with chief star, chief gate, emptiness, and traveling-horse markers
- Timing windows, favorable directions, favorable time ranges, and action notes
- Validation feedback entry on the result page

<p align="center">
  <img src="https://i.imgur.com/M0O7GR3.png" width="220" alt="Add Bazi profile"/>
  &nbsp;
  <img src="https://i.imgur.com/RP92YQs.png" width="220" alt="Professional Bazi chart"/>
  <br/>
  <img src="https://i.imgur.com/503GVir.jpeg" width="220" alt="Bazi interpretation"/>
</p>

**Bazi panels include:**

- Gregorian, lunar, and Four Pillars input, with birthplace and true solar time correction
- Ten gods, hidden stems, growth phases, emptiness, Na Yin, spirits, and detailed chart view
- Linked luck pillar, annual, and monthly timelines
- Generation-control visualization and recalibrated interpretations

<p align="center">
  <img src="https://i.imgur.com/Dr5tEar.jpeg" width="220" alt="Daily fortune score"/>
  &nbsp;
  <img src="https://i.imgur.com/lnU5q6I.png" width="220" alt="Monthly score curve"/>
  &nbsp;
  <img src="https://i.imgur.com/397MAVl.jpeg" width="220" alt="Monthly reading"/>
</p>

**Fortune panels include:**

- Daily: seven-day switching, score-first rendering, asynchronous prose, favorable hours, and guidance
- Monthly: solar-term month boundaries, monthly score curve, high and low days, difficult periods, and detailed readings
- Yearly: ten-year range, luck-cycle context, annual ten-god signals, natal interactions, and yearly indicators
- Profile switching and frontend cache replay

---

## Design Principles

**Honest readings**

The prompts explicitly forbid raising the score just because a question sounds positive. Difficult signals must be shown honestly; favorable signals only matter when the structure supports them.

**Algorithmic authority**

Day-master strength, favorable elements, and daily, monthly, and yearly scores are generated by deterministic local engines. The language model is the expression layer, not the scoring authority.

**Context shapes meaning**

The same chart signal can mean different things in career, relationships, health, competitions, or transactions. The system uses question domains, Bazi profiles, and real-world context to ground each interpretation.

---

## Credits

- [lunar-javascript](https://github.com/6tail/lunar-javascript) — sexagenary calendar calculations
- [Google Gemini](https://deepmind.google/technologies/gemini/) — AI reasoning engine
- [Supabase](https://supabase.com) — database and authentication
- [Vue 3](https://vuejs.org) — frontend framework
- [Vite](https://vitejs.dev) — build tooling
- [Cloudflare Workers](https://workers.cloudflare.com) — serverless backend runtime

---

## License

MIT License. You may use, modify, and distribute the code while preserving the original author notice.

> Metaphysics readings are for reference only. Please make real decisions rationally.
