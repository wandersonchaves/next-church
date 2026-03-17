# NextChurch - Instructional Context

## Project Overview
The **NextChurch** is a specialized Church Management System (CMS) built on the **G12 Discipleship Model** (1-12-144 hierarchy). It manages spiritual lineages, journey progress (7 steps), and children's ministries (Kids track).

### Core Stack
- **Framework**: Next.js 15+ (App Router, Server Actions, RSC).
- **ORM/DB**: Drizzle ORM with PostgreSQL (Real Postgres via Docker/Railway).
- **Auth/Multitenancy**: Clerk (Organizations-based isolation).
- **Background Tasks**: Inngest (Event-driven workflows for notifications and cron jobs).
- **Messaging**: Evolution API (WhatsApp integration).
- **Security**: Arcjet (Bot protection & Shield).
- **UI**: Tailwind CSS 4 + Lucide Icons (High-density BI design).

---

## Architectural Principles

### 1. Data Modeling (Hierarchy & Lineage)
- **Hybrid Strategy**: Uses both **Adjacency List** (`leader_id`) and **Materialized Path** (`lineage` column as string `id.id.id`).
- **DFS Ordering**: Hierarchical queries MUST use the `sort_path` array (generated via Recursive CTE) to ensure disciples appear immediately below their leaders in UI and Selects.
- **Generation Slots**: Members are assigned to a specific "Slot" (**F1 to F12**), which is an immutable identity within their leader's team.

### 2. Multi-tenancy
- **Strict Isolation**: Every table MUST include an `organization_id` column.
- **Query Scoping**: All Server Actions and Services must extract the `orgId` from Clerk's `auth()` and apply it to every database operation.

### 3. Communication Engine
- **Fire-and-Forget**: All messaging (WhatsApp) must be triggered via `inngest.send()` to avoid blocking the main UI thread.
- **Resilience**: WhatsApp messages are processed by Inngest with built-in retries and throttling (2s delay) to prevent number banning.
- **Drip Marketing**: Automations (Welcome, Step Promotion) should include a `step.sleep` (human touch delay).

---

## Key Commands

| Task                   | Command                                                           |
| :--------------------- | :---------------------------------------------------------------- |
| **Development**        | `npm run dev`                                                     |
| **Production Build**   | `npm run build`                                                   |
| **Database Sync**      | `npm run db:push` (Preferred over migrate in dev)                 |
| **Inngest Dev Server** | `npx inngest-cli@latest dev -u http://localhost:3000/api/inngest` |
| **Linting & A11y**     | `npm run lint:fix`                                                |

---

## Development Conventions

### Coding Style
- **Server Actions**: Preferred for all mutations. Use Zod for strict validation.
- **Type Safety**: Avoid `any` where possible. Use Type Narrowing (`'success' in result`) for Server Action returns.
- **Naming**: Use `camelCase` for TypeScript/React and `snake_case` for database columns. Always map manually in `MemberService.ts`.

### Visual Guidelines
- **Density**: The dashboard is a management tool; use compact layouts (`p-3`, `text-sm`, `font-black`).
- **Accessibility**: Every interactive element must support keyboard navigation (`onKeyDown`, `role="button"`, `tabIndex={0}`).
- **Colors**:
  - **Pastor**: Amber (Authority)
  - **F1-F12**: Blue/Indigo (Growth)
  - **Pending**: Slate/Dashed (Consolidation)

### Testing
- **Vitest**: Run unit tests for tree transformation and domain logic via `npm run test`.
- **Logic Location**: Business rules (Age calculation, Step transitions) MUST reside in `src/utils/MemberDomain.ts`, never inside components.

---

## Domain Step Order
1. `DECISION` (Start)
2. `CELL`
3. `UNIVERSITY_OF_LIFE`
4. `ENCOUNTER`
5. `LEADERSHIP_TRAINING`
6. `RE_ENCOUNTER`
7. `SENDING` (End)
