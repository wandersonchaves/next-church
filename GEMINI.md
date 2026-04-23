# NextChurch - Instructional Context

## Project Overview
**NextChurch** (technical: `next-church`) is an enterprise-grade Church Management System (CMS) tailored for the **G12 Discipleship Model** (1-12-144 hierarchy). It provides a white-label experience where each organization (Church) manages its own spiritual lineage, journey progress, ministries, and automated communications.

### Core Stack
- **Framework**: Next.js 15+ (App Router, Server Actions, RSC).
- **ORM/DB**: Drizzle ORM with PostgreSQL (Transactional & Resilient).
- **Auth/Multitenancy**: Clerk (Organizations-based isolation with Invitation Workflow).
- **Background Tasks**: Inngest (Event-driven workflows, Cron jobs, Throttling).
- **Messaging**: Evolution API (WhatsApp integration for automated reports and greetings).
- **Security**: Arcjet (Bot protection & Shield).
- **UI**: Tailwind CSS 4 + Lucide Icons (Enterprise SaaS "Clean" aesthetic).

---

## Architectural Principles

### 1. Data Modeling (Hierarchy & Lineage)
- **Hybrid Strategy**: Uses **Adjacency List** (`leader_id`) for immediate relations and **Materialized Path** (`lineage` column as `id.id.id`) for sub-tree lookups.
- **DFS Ordering**: Hierarchical queries MUST use Recursive CTEs with a `sort_path` array to ensure "Integrantes" appear immediately below their leaders in the G12 Tree.
- **Generation Slicing**: Members occupy immutable slots (**Geração 1 to 12**). The system supports horizontal slicing (seeing all members of a specific generation) and vertical slicing (network maps starting from a specific leader).

### 2. Multi-tenancy & Onboarding
- **Strict Isolation**: Every table MUST include an `organization_id`. All queries MUST be scoped using Clerk's `auth().orgId`.
- **Invitation Workflow**: Team members are added via **Official Clerk Invitations**. The system handles localized redirects (`/[locale]/dashboard`) using absolute URLs to avoid 404 errors during onboarding.
- **Automatic Seeding**: New organizations are automatically initialized with default ministries (e.g., "Louvor", "TelePaz Filadélfia Kids") via `SeedService` upon first dashboard access.

### 3. Resilience & Side-effects
- **Transaction Safety**: DB transactions (`db.transaction`) MUST contain only pure database operations.
- **Async Side-effects**: Actions like `inngest.send()` and `logActivity` (Audit) MUST be executed **outside** the main DB transaction to prevent external API failures from rolling back user data.
- **Error Handling**: Always use Type Guards for catch blocks (`error instanceof Error`) to safely access error messages.

---

## Feature Modules

### 1. Member CRUD
- **Mapeamento Explícito**: No `spread operator` in DB inserts. Every field from `MemberSchema` must be mapped manually to ensure type safety and DB compatibility.
- **Generation Logic**: Terminology is strictly **"Geração"** (replacing "Frente") and **"Integrante"** (replacing "Discípulo").

### 2. Ministries & Volunteers
- **Sectors**: Independent management of church areas (Louvor, Mídia, etc.).
- **Scaling**: Many-to-many relationship between members and ministries with specific `roles`.

### 3. Audit Engine
- **Audit Logs**: Every mutation (CREATE, UPDATE, DELETE, PROMOTE) is recorded in `audit_logs`, tracking the `userId`, `userName`, and the entity affected.
- **Transparency**: Dedicated "Registros" page for administrators.

### 4. Communication Engine
- **Weekly Report**: Automated Inngest Cron job that generates a weekly activity summary and sends it via WhatsApp to the Senior Pastor (`leaderId IS NULL`).
- **Dynamic Branding**: WhatsApp messages dynamically use the Organization Name from Clerk, falling back to "TelePaz Filadélfia" if not set.

---

## Key Commands

| Task                | Command                                                           |
| :------------------ | :---------------------------------------------------------------- |
| **Development**     | `npm run dev`                                                     |
| **Database Sync**   | `npm run db:push` (Preferred for schema changes)                  |
| **Inngest Dev**     | `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest` |
| **Audit Logs Sync** | `npx drizzle-kit push`                                            |

---

## Domain Step Order
1. `DECISION` (Start)
2. `CELL`
3. `UNIVERSITY_OF_LIFE`
4. `ENCOUNTER`
5. `LEADERSHIP_TRAINING`
6. `RE_ENCOUNTER`
7. `SENDING` (End)

## Coding Conventions
- **Visual Density**: Use compact layouts (`p-3`, `text-sm`, `font-black`) for the Management BI.
- **Naming**: `camelCase` for TS/React, `snake_case` for Database.
- **Server Components**: Prefer RSCs for data fetching; use Client Components only for interactivity (Forms, Modals).
- **Branding**: Friendly name is **NextChurch**, technical name is **next-church**.
