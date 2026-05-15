# Repository Guidelines

## Project Structure & Module Organization
This is a NestJS backend. Application code lives in `src/`, with feature modules under `src/modules/` and shared code under `src/infrastructure/` and `src/common/`. Typical module files use `*.module.ts`, `*.controller.ts`, `*.service.ts`, `*.provider.ts`, `dto/`, and `entities/`.

Tests are split between colocated specs in `src/**` and E2E specs in `test/`. E2E helpers live in `test/common/`, `test/utils/`, and `test/setup_e2e.ts`. Migrations are in `migrations/`, seeds in `src/infrastructure/database/seeds/`, assets in `assets/`, and Bruno API collections in `bruno/Event Management API/`.

## Documentation & Domain Context
Use `docs/business_model.md` for domain rules, actors, entities, and system responsibilities before changing events, tickets, orders, payments, notifications, RBAC, queues, storage, or tickets. Use `docs/order_ticket_purchase_flow.md` for the user purchase journey: discovery, `POST /orders/buy-ticket`, payment state, order polling, and ticket retrieval.

When behavior changes, update the matching `docs/` file and affected Bruno examples. Document observable behavior, business rules, endpoint order, environment settings such as `PAYMENT_PROVIDER=mock`, and important response fields.

## Build, Test, and Development Commands
Use `pnpm` (`packageManager` is `pnpm@10.14.0`).

- `pnpm dev`: run Nest in watch mode.
- `pnpm build`: compile into `dist/`.
- `pnpm start:prod`: run the compiled app from `dist/main`.
- `pnpm lint` / `pnpm format`: run ESLint and Prettier.
- `pnpm test`: run `.spec.ts` tests with Jest.
- `pnpm test:e2e`: run `.e2e-spec.ts` tests serially.
- `pnpm test:cov`: run tests with coverage.
- `pnpm migrate:generate|run|revert`: manage TypeORM migrations.
- `pnpm seed:run`: run seeds.

Use `docker-compose.yaml` when Postgres, Redis, MinIO, or mail tooling is needed.

## Coding Style & Naming Conventions
Use TypeScript with 2-space indentation, UTF-8, LF line endings, and final newlines. Prettier enforces single quotes, trailing commas, `printWidth: 150`, and parenthesized arrow parameters. ESLint uses type-checked `typescript-eslint` rules; avoid unsafe arguments and keep `any` exceptional.

Name classes by NestJS role (`UserService`, `PaymentController`) and keep file names lowercase domain style, for example `event-category.service.ts`.

## Testing Guidelines
Unit and integration tests use `<domain>.<service|controller>.spec.ts` inside `src/modules/**`. E2E tests use `test/<domain>/<domain>.e2e-spec.ts`. New E2E flows should follow `test/feature/template.e2e-spec.ts`.

Run targeted tests during development, then `pnpm test` or `pnpm test:e2e` before a PR.

## Commit & Pull Request Guidelines
Recent history uses Conventional Commit prefixes such as `fix:`, `feat:`, and `chore:`. Keep subjects imperative and scoped to one change, for example `fix: refresh token response structure`.

PRs should include a summary, linked issue or task, test evidence, migration/seed notes if applicable, and API screenshots or Bruno examples for endpoint changes. Never commit `.env`; update `.env.example` when configuration changes.
_Last Update at 2026-05-15 19:55:20_
