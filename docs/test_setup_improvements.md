## 🔴 Critical — Likely Causing Hangs & Timeouts

### 1. `forceExit: true` is masking the real problem

This is the biggest red flag. `forceExit` forcibly kills the process when tests finish — it's a band-aid hiding that something isn't closing cleanly. Combined with your `closeWithTimeout`, you have two competing "give up" mechanisms. The root causes to investigate:

- **DB connection pool not closing** — `DataSource` from TypeORM keeps a pool alive. Verify `dataSource.destroy()` is called, not just `app.close()`.
- **MinIO client** — `Minio.Client` may hold open HTTP keep-alive connections. You need to explicitly destroy its underlying agent.
- **Cron jobs** — `clearScheduledJobs` is only called once during `setupApplication`, but if a job fires _during_ the test run, it may respawn.

**Fix:** Remove `forceExit`, fix the actual leaks, then add `detectOpenHandles: true` temporarily to expose what's hanging:

```ts
detectOpenHandles: true, // remove after debugging
// forceExit: true,      // remove this
```

---

### 2. Module/App caching breaks test isolation

```ts
let cachedApp: NestExpressApplication | null = null;
let cachedModule: TestingModule | null = null;
```

Sharing one app instance across all test suites means:

- A failed `beforeAll` in suite A leaves dirty state for suite B
- `resetTestDatabase` only runs _once_ at startup — not between suites
- If Jest runs suites in parallel (multiple workers), they race on the same DB

**Fix:** Either reset DB between each suite, or enforce `--runInBand` in your Jest config:

```ts
// jest.config.ts
runInBand: true, // for e2e, always run serially
```

And call `resetTestDatabase` + `seedTestData` in a `beforeEach` / `beforeAll` per suite, not just at app init.

---

### 3. `closeWithTimeout` silently swallows errors

```ts
.catch((error) => {
  console.warn('E2E close failed:', error);
  finish(); // resolves undefined — Jest never knows something broke
});
```

A close failure resolves successfully, so Jest moves on without cleaning up. This is a direct cause of hanging handles in subsequent suites.

**Fix:** At minimum, re-throw or track the failure so the test suite is marked as failed.

---

## 🟡 Reliability Issues

### 4. `seedTestData` uses `execSync` inside an async function

```ts
execSync('pnpm seed:run', { stdio: 'inherit' });
```

`execSync` is synchronous and blocks the event loop. In an `async` function this is fine functionally, but it can block the Node.js event loop for the full seed duration, starving timers — contributing to apparent timeouts.

**Fix:** Use `execFileSync` with a timeout, or better, import and call the seed function directly rather than spawning a child process.

---

### 5. `waitForMinIO` is defined but never called in `setupApplication`

There's no retry loop or readiness gate for MinIO before tests run. If MinIO is slow to start (common in CI), file upload tests will fail non-deterministically.

**Fix:** Add a poll-with-retry before app init:

```ts
const ready = await retryWithBackoff(() => waitForMinIO(endpoint, port), 10, 1000);
if (!ready) throw new Error('MinIO not ready');
```

---

### 6. `testTimeout: 60000` is too coarse

60s per test hides slow tests. Hanging tests will only be detected after a full minute, causing the whole suite to stall.

**Fix:** Keep `60000` for the config default but add a global `afterAll` watchdog, and consider `--testTimeout` overrides per slow test file rather than globally.

---

## 🟢 Structure / Maintainability

### 7. Jest config is missing e2e-specific settings

```ts
export const jestConfig: Config = {
  // missing:
  testMatch: ['**/*.e2e-spec.ts'], // be explicit
  runInBand: true, // e2e must be serial
  globalSetup: './test/global-setup.ts', // for DB/MinIO readiness
  globalTeardown: './test/global-teardown.ts',
};
```

Without `runInBand`, Jest may spawn multiple workers sharing your one cached app — this is almost certainly contributing to your hangs.

### 8. `CONFIG_PROVIDER.PSQL_CONNECTION` with `strict: false`

```ts
const dataSource = moduleFixture.get<DataSource>(CONFIG_PROVIDER.PSQL_CONNECTION, { strict: false });
if (!dataSource) return; // silently skips DB reset
```

Silently skipping DB reset if the token isn't found means tests can run against a dirty database with no warning. This should throw instead of silently returning.

---

## Summary Table

| #   | Severity | Issue                                                            | Fix                                      |
| --- | -------- | ---------------------------------------------------------------- | ---------------------------------------- |
| 1   | 🔴       | `forceExit` hides open handles                                   | Use `detectOpenHandles`, fix leaks       |
| 2   | 🔴       | App cache + single DB reset causes dirty state & race conditions | `runInBand`, reset per suite             |
| 3   | 🔴       | Close errors swallowed silently                                  | Propagate or mark suite failed           |
| 4   | 🟡       | `execSync` blocks event loop during seed                         | Use async child process or direct import |
| 5   | 🟡       | MinIO readiness not awaited                                      | Add retry loop before app init           |
| 6   | 🟡       | 60s timeout too coarse                                           | Add `runInBand`, per-file overrides      |
| 7   | 🟢       | Jest config missing `runInBand`, `testMatch`, global setup       | Add missing options                      |
| 8   | 🟢       | Silent skip on missing DB token                                  | Throw instead of `return`                |

**Start with #1 (`detectOpenHandles`) and #7 (`runInBand`) — those two alone will likely resolve the hanging and most timeouts.**
