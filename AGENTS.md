# Repository Guidelines

## Project Structure & Module Organization

This repository is a Next.js full-stack app for Lumio image generation. Main source code lives in `src/`.

- `src/app/`: App Router pages, layout, global CSS, and API route handlers.
- `src/components/`: Client UI components, including the image studio workspace.
- `src/server/`: Server-only code for auth, config, database access, quota logic, providers, storage, and generation orchestration.
- `src/server/domain/*.test.ts`: Vitest unit tests for core business rules.
- `src/server/db/schema.sql`: PostgreSQL schema used by the migration script.
- `scripts/`: Operational scripts such as `migrate.mjs`.
- `devDoc/`: Planning and implementation documentation.

Generated output such as `.next/`, `node_modules/`, coverage, and local env files must stay untracked.

## Build, Test, and Development Commands

- `npm install`: Install project dependencies.
- `npm run dev`: Start the local Next.js development server.
- `npm run build`: Build and type-check the production app.
- `npm start`: Run the production build locally.
- `npm test`: Run the Vitest test suite once.
- `npm run test:watch`: Run Vitest in watch mode.
- `npm run db:migrate`: Apply `src/server/db/schema.sql` to `DATABASE_URL`.

## Coding Style & Naming Conventions

Use TypeScript with strict types. Keep server-only logic under `src/server/` and UI logic under `src/components/` or `src/app/`. Use two-space indentation, named exports for shared utilities, and descriptive file names such as `quota.ts`, `repositories.ts`, or `ImageStudio.tsx`.

Keep business rules small and testable. Prefer Zod schemas for request validation and typed return objects for API-facing functions.

## Testing Guidelines

Vitest is the test framework. Place unit tests beside the code they cover using `*.test.ts`. Focus tests on quota calculation, invite rewards, model input normalization, provider adapters, and API edge cases. Run `npm test` before handing off changes, and run `npm run build` when touching routes, React components, or shared types.

## Commit & Pull Request Guidelines

This repository currently has no commit history, so use clear Conventional Commit-style messages going forward, for example `feat: add upload presign route` or `fix: prevent duplicate invite rewards`.

Pull requests should include a short summary, test results, linked issues when available, and screenshots or short recordings for UI changes. Mention required environment variables when a change affects deployment.

## Security & Configuration Tips

Never commit `.env` or real API keys. Use `.env.example` as the template. Keep OpenAI, Gemini, JWT, PostgreSQL, and S3/R2 secrets server-side only. Validate anonymous and logged-in generation paths because they affect cost control.
