# NoReScan — Monetization, Business Model & Cloud Architecture

**Product:** NoReScan  
**Organization:** LostGit Solutions  
**Repository:** [https://github.com/th3karn/NoReScan](https://github.com/th3karn/NoReScan)  
**Licensing Model:** Open Core (Apache-2.0 Local Engine + Commercial Hosted Cloud)  
**Target Market:** Global & Indian AI-assisted Software Developers, Agencies, and Engineering Teams  

---

## 1. Executive Summary & Core Philosophy

NoReScan follows an **Open Core + Cloud SaaS + Enterprise** business model.

### The Foundational Golden Rule:
> **The developer owns their local codebase memory.**  
> **The business pays for managed infrastructure, cross-device sync, team collaboration, governance, and operational convenience.**

Developers using tools like Google Antigravity, Cursor, Claude Code, Windsurf, and OpenAI Codex will never be charged to parse, index, or query their own repositories locally. Monetization starts when repository memory becomes shared team infrastructure.

---

## 2. Strategic Positioning Decisions

### Decision 1: Openness Boundary
* **Choice:** **Fully open-source core + paid cloud control plane & enterprise features.**
* **Open Source (Apache-2.0):** CLI executable, SQLite database, recursive scanner, SHA-256 fingerprinting, polyglot AST analyzers, dependency graph, blast-radius calculator, local MCP server, and agent adapters.
* **Commercial Hosted Plane:** PostgreSQL database, authentication, encrypted sync relay, team workspaces, seat billing, web dashboard, audit logging, and SSO.

### Decision 2: Primary Paying Customers
* **Choice:** **Both Individuals and Businesses (Dual-Engine Growth).**
  1. **Individuals (Bottom-up adoption):** Freelancers and power users upgrading to Pro (₹499 / $8/mo) for cloud backup and multi-device sync.
  2. **Software Teams & Agencies (Primary ARR Engine):** Development agencies and startups subscribing to Team (₹799 / $15/seat/mo) to eliminate developer onboarding lag and unify agent memory across engineers.

---

## 3. Pricing Matrix & Tiers

| Tier | India Price | Global Price | Billing Interval | Target Audience | Key Capabilities |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Community** | **₹0 Free** | **$0 Free** | Lifetime | OSS contributors, students, solo devs | Unlimited local projects, local SQLite, AST analysis, local MCP server, CLI, agent adapters. |
| **Pro** | **₹499 / mo** (₹4,990 / yr) | **$8 / mo** ($80 / yr) | Monthly / Annual | Freelancers, power users, solo pros | Everything in Community + Encrypted cloud backup, multi-device sync (up to 3 devices), web dashboard, personal project history, priority support. |
| **Team** *(Recommended)* | **₹799 / user / mo** (₹7,990 / user / yr) | **$15 / user / mo** ($150 / user / yr) | Monthly / Annual | Startups, dev agencies, engineering teams | Everything in Pro + Shared team memory, shared ADRs, team-wide context, RBAC roles, centralized agent config, 20 GB pooled storage, team analytics. |
| **Enterprise** | **Custom** (Starts ₹1,00,000+ / yr) | **Custom** ($5,000–$20,000+ / yr) | Annual Contract | Large enterprises, regulated industries | Everything in Team + Self-hosted VPC deployment, SAML SSO, audit log export, custom retention policies, dedicated SLA, custom language/ecosystem adapters. |

---

## 4. Profit Margin Protection: BYOK & Zero Source Code Storage

To protect gross margins and ensure long-term SaaS profitability:

1. **Bring Your Own Key (BYOK):**
   * NoReScan SaaS **never** subsidizes arbitrary LLM inference costs.
   * If an agent workflow requires external LLM completion, the developer or organization supplies their own API credentials (OpenAI, Anthropic, Gemini, OpenRouter).
2. **Zero Source Code Upload Guarantee:**
   * Raw source code and proprietary file contents **never leave the local filesystem**.
   * Only cryptographic SHA-256 hashes, language tags, relative path references, structural AST symbol manifests, dependency graph edges, and Architectural Decision Records (ADRs) are synchronized.
3. **Client-Side Envelope Encryption (AES-256-GCM):**
   * Cloud sync payloads are encrypted on the developer's workstation using per-user or per-organization keys before transmission over TLS. The server cannot inspect private codebase metadata.

---

## 5. Architectural Separation

The system is decoupled into three isolated layers:

```
┌──────────────────────────────────────────────────────────┐
│             Layer 1: Open-Source Client Engine           │
│   - CLI (`norescan`)                                     │
│   - Local SQLite WAL Database (`.norescan/norescan.db`)  │
│   - Local Scanner, AST Analyzers, Dependency Graph       │
│   - Local Context Engine & Fast RememberFile (<5ms)      │
│   - Stdio Model Context Protocol (MCP) Server            │
│   - Agent Adapters (Antigravity, Cursor, Claude Code)    │
└────────────────────────────┬─────────────────────────────┘
                             │ Signed JWT + Encrypted Blobs
                             ▼
┌──────────────────────────────────────────────────────────┐
│             Layer 2: Cloud Control Plane (Commercial)    │
│   - Fastify / Node.js API Gateway                        │
│   - PostgreSQL Database + Supabase Auth                  │
│   - Encrypted S3-Compatible Blob Storage                 │
│   - Centralized Entitlement Engine                       │
│   - Team Workspaces, RBAC, and Member Invitations        │
│   - Next.js Web Dashboard & Usage Metering               │
└────────────────────────────┬─────────────────────────────┘
                             │ Webhook Events & Sessions
                             ▼
┌──────────────────────────────────────────────────────────┐
│             Layer 3: Payment Provider Abstraction        │
│   - `BillingProvider` Interface                          │
│   ├── RazorpayProvider (Domestic India: UPI, Cards)      │
│   ├── PaddleProvider (International Merchant of Record)   │
│   └── StripeProvider (Global Direct Checkout Adapter)    │
└──────────────────────────────────────────────────────────┘
```

### The Critical Architectural Rule:
> **The local client must function at 100% capacity with zero internet connection, no account, or an expired subscription.** The entitlement engine governs cloud sync, backup, team features, and dashboard access only.

---

## 6. PostgreSQL Commercial Billing Schema

The cloud backend maintains an isolated billing and entitlement schema in PostgreSQL:

```sql
-- 1. Organizations
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Organization Members
CREATE TABLE organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'read_only')),
  status TEXT NOT NULL CHECK (status IN ('active', 'invited', 'suspended')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(org_id, user_id)
);

-- 3. Plans & Prices
CREATE TABLE plans (
  id TEXT PRIMARY KEY, -- 'community', 'pro', 'team', 'enterprise'
  name TEXT NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE plan_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id TEXT NOT NULL REFERENCES plans(id),
  currency TEXT NOT NULL, -- 'INR', 'USD'
  amount_cents BIGINT NOT NULL, -- in paise or cents
  interval TEXT NOT NULL CHECK (interval IN ('month', 'year')),
  provider TEXT NOT NULL, -- 'razorpay', 'paddle', 'stripe'
  provider_price_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true
);

-- 4. Subscriptions
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type TEXT NOT NULL CHECK (owner_type IN ('user', 'organization')),
  owner_id UUID NOT NULL,
  plan_id TEXT NOT NULL REFERENCES plans(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'trialing', 'active', 'past_due', 'paused', 'canceled', 'expired')),
  provider TEXT NOT NULL,
  provider_subscription_id TEXT UNIQUE,
  current_period_start TIMESTAMPTZ NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  grace_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Webhook Events (Idempotent processing)
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('received', 'processed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(provider, event_id)
);

-- 6. Devices (Multi-device tracking)
CREATE TABLE devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL,
  platform TEXT NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 7. Implementation Roadmap & Phases

```
┌────────────────────────────────────────────────────────────────────────┐
│ Phase 1: Open Source Engine & CLI (COMPLETED ✅ - v0.1.2 on npm)       │
│ - 13 published packages, SQLite WAL, AST, Blast Radius, MCP, Adapters  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 2: Cloud Auth & Device Pairing (Next Milestone)                  │
│ - Supabase Auth, Device pairing CLI (`norescan login`), Device tokens  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 3: Client-Side Encrypted Cloud Backup & Sync                     │
│ - AES-256-GCM envelope encryption, snapshot sync, conflict resolution  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 4: Billing & Entitlements Engine                                 │
│ - Razorpay (India) & Paddle (Global MoR), Webhooks, Signed Entitlements│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 5: Team & Agency Workspace Collaboration                         │
│ - Team shared memory, RBAC, Seat management, Centralized Agent configs │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│ Phase 6: Enterprise & Marketplace                                      │
│ - Self-hosted VPC, SAML SSO, Audit logging, Community extension store  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 8. Immediate Next Actions

1. **Complete Phase 1 Validation (Done):** All 13 `@norescan` packages verified on npm.
2. **Document Architecture Baseline:** Maintain this strategy as the official product specification.
3. **Begin Phase 2 Engineering:** Design the `norescan login` authentication flow and PostgreSQL schema migrations for the cloud control plane.
