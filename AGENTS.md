# Repository Guidelines

## Project Context
This repository is the backend for an event management system built with NestJS.

## Tech Stack
- TypeScript
- Node.js 20+
- NestJS 11
- PostgreSQL
- TypeORM
- Redis
- BullMQ
- MinIO

## Product Scope
The system covers:
- Authentication with JWT
- Role-based access control
- User management
- Event management
- Order and ticket handling
- QR code and PDF ticket generation
- Notifications and background jobs
- Admin dashboard reporting

## Core Actors
- `ADMIN`: manages master data such as events, orders, tickets, and users.
- `USER`: browses events and purchases tickets.

## RBAC Rules
- Use permission keys in the form `resource.action` or `resource:action` depending on the module convention already in use.
- Permissions must be resolved through roles, not assigned directly to users.
- Keep role and permission mappings explicit and many-to-many.
- Avoid hardcoded role checks when a permission check is the correct abstraction.

## Entity Rules
- Every entity must include `createdAt`, `updatedAt`, and `deletedAt` audit fields.
- Use UUIDs for core domain entities such as `User`, `Order`, and `Event`.
- Use auto-increment integers for supporting entities such as `Role`, `Permission`, and `Category`.
- Prefer `import type` for relation typing to avoid circular dependencies.
- Define column names explicitly and use snake_case in the database.
- Define join tables explicitly for many-to-many relations.
- Use `nullable` explicitly and keep nullability clear in the TypeScript type.
- Index foreign keys and high-traffic lookup fields, but avoid over-indexing.

## Documentation References
- `docs/context.md` defines the project objective, feature scope, and external integrations.
- `docs/entity.md` defines TypeORM entity and indexing rules.
- `docs/rbac.md` defines the authorization model and permission flow.
- `docs/role-permissions.md` defines the initial seed roles and canonical permission list.
- `docs/guide.md` contains implementation notes and framework expectations.
- `docs/README.md` describes the API documentation collection and where to find request examples.

## Working Rules
- Follow the existing NestJS module structure.
- Keep shared logic in `src/common/` or `src/infrastructure/` instead of duplicating it.
- Add tests for new behavior and regressions.
- Prefer explicit, predictable schema and authorization design over shortcuts.
