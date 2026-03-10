# Gemini CLI Project Context: Next.js Boilerplate

This project is a high-performance Next.js 16+ boilerplate with Tailwind CSS 4, TypeScript, and a comprehensive suite of tools for authentication, database, internationalization, testing, and monitoring.

## Project Overview

- **Framework**: Next.js 16+ (App Router)
- **Styling**: Tailwind CSS 4
- **Language**: TypeScript (Strict Mode)
- **Authentication**: [Clerk](https://clerk.com/)
- **Database**: [Drizzle ORM](https://orm.drizzle.team/) with [PGlite](https://pglite.dev/) (local development) and PostgreSQL (remote/production)
- **Internationalization (i18n)**: [next-intl](https://next-intl-docs.vercel.app/) and [Crowdin](https://crowdin.com/)
- **Testing**: [Vitest](https://vitest.dev/) (Unit), [Playwright](https://playwright.dev/) (E2E & Integration)
- **Security**: [Arcjet](https://arcjet.com/) (Bot detection, Rate limiting, WAF)
- **Monitoring & Logging**: [Sentry](https://sentry.io/), [Checkly](https://www.checklyhq.com/), [LogTape](https://logtape.org/), [Better Stack](https://betterstack.com/)
- **Analytics**: [PostHog](https://posthog.com/)

## Core Development Principles

- **Clarity and Consistency**: Prioritize readability over cleverness. Maintain existing patterns.
- **TypeScript**: Use TypeScript everywhere; avoid `any`. Let the compiler infer return types unless clarity is needed.
- **Named Exports**: Only use named exports (except for Next.js pages/layouts/etc. where Next.js requires default exports).
- **Absolute Imports**: Use the `@/` prefix for imports from `src/`.
- **Environment Variables**: Always read and validate via `src/libs/Env.ts`; never use `process.env` directly.
- **React**:
  - No `useMemo` or `useCallback` (rely on React Compiler).
  - Use a single `props` parameter with inline types; access as `props.foo` (no destructuring).
  - Use `React.ReactNode` for node types.
- **Internationalization**: Never hard-code user-visible strings. Use `next-intl` namespaces.
- **Commit Messages**: Follow [Conventional Commits](https://www.conventionalcommits.org/).

## Key Commands

### Development
- `npm run dev`: Starts the local development server with PGlite.
- `npm run db:studio`: Opens Drizzle Studio to explore the database.
- `npm run storybook`: Starts Storybook for UI development.

### Testing
- `npm run test`: Runs unit tests with Vitest.
- `npm run test:e2e`: Runs E2E tests with Playwright.
- `npm run storybook:test`: Runs Storybook tests.

### Code Quality
- `npm run lint`: Checks for linting errors.
- `npm run lint:fix`: Automatically fixes linting issues.
- `npm run check:types`: Verifies type safety.
- `npm run check:deps`: Identifies unused dependencies with Knip.
- `npm run check:i18n`: Validates translations.

### Database
- `npm run db:generate`: Generates a new migration from schema changes.
- `npm run db:migrate`: Applies migrations to the database.

### Build
- `npm run build`: Generates an optimized production build.
- `npm run build-local`: Builds locally using a temporary in-memory database.

## Project Structure

- `src/app/`: Next.js App Router pages and layouts.
- `src/components/`: Reusable React components.
- `src/libs/`: Third-party library configurations (Arcjet, DB, Env, Clerk, etc.).
- `src/locales/`: Translation files (JSON).
- `src/models/`: Database schema definitions (Drizzle).
- `src/utils/`: Shared utilities and constants.
- `src/validations/`: Zod schemas for validation.
- `tests/`: Integration (`*.spec.ts`) and E2E (`*.e2e.ts`) tests. Unit tests (`*.test.ts`) are co-located with implementation.

## Instructions for Gemini CLI

When performing tasks in this codebase:
1. **Always verify imports**: Use `@/` for absolute imports.
2. **Strict Typing**: Ensure all new code is strictly typed.
3. **i18n**: If adding new UI text, add it to `src/locales/en.json` and use `useTranslations`.
4. **Environment Variables**: If a new environment variable is needed, add it to `src/libs/Env.ts`.
5. **Testing**: Add unit tests in `*.test.ts` files co-located with the source or integration tests in `tests/integration`.
6. **Named Exports**: Prefer named exports for all utility functions and components.
