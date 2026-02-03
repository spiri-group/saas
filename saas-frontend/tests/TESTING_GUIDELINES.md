# Testing Guidelines for Parallel Test Execution

This document explains how to write tests that work correctly when run in parallel.

## The Golden Rule: Avoid Module-Level Shared State

Playwright automatically isolates:
- ✅ Browser contexts (cookies, localStorage)
- ✅ Test execution
- ✅ Page instances

But **cannot** isolate:
- ❌ Module-level variables (e.g., `const registry = new Set()`)
- ❌ Global state in Node.js

## Pattern 1: Per-Test Cleanup (Recommended)

**Use this for most tests:**

```typescript
test('should create and cleanup user', async ({ page }, testInfo) => {
  const workerId = testInfo.parallelIndex;
  const email = `test-${Date.now()}-${workerId}@example.com`;

  // Create test data
  await createUser(email);

  // Test logic...

  // Cleanup inline or in afterEach
  await deleteUser(email);
});
```

## Pattern 2: Per-Worker State (For Shared Utilities)

**Use this ONLY when you need shared state across tests in the same file:**

```typescript
// tests/utils/my-utility.ts
const statePerWorker = new Map<number, YourState>();

function getState(workerId: number) {
  if (!statePerWorker.has(workerId)) {
    statePerWorker.set(workerId, createInitialState());
  }
  return statePerWorker.get(workerId)!;
}

export function registerEntity(entity: Entity, workerId: number) {
  getState(workerId).entities.add(entity);
}
```

**In your tests:**

```typescript
test.beforeAll(async ({}, testInfo) => {
  clearState(testInfo.parallelIndex);
});

test('my test', async ({ page }, testInfo) => {
  registerEntity(entity, testInfo.parallelIndex);
});

test.afterAll(async ({}, testInfo) => {
  await cleanup(testInfo.parallelIndex);
});
```

## Common Pitfalls

### ❌ DON'T: Use Global Variables

```typescript
// BAD - Shared across all workers!
let capturedCookies: string;

test('test 1', async ({ page }) => {
  capturedCookies = await getCookies(page); // Race condition!
});
```

### ✅ DO: Use Maps Keyed by Worker ID

```typescript
// GOOD - Isolated per worker
const cookiesPerWorker = new Map<number, string>();

test('test 1', async ({ page }, testInfo) => {
  const cookies = await getCookies(page);
  cookiesPerWorker.set(testInfo.parallelIndex, cookies);
});
```

### ❌ DON'T: Clear Shared State in beforeAll/afterAll

```typescript
// BAD - Clears state for ALL workers!
test.beforeAll(() => {
  globalRegistry.clear(); // Other workers are still using this!
});
```

### ✅ DO: Clear Per-Worker State

```typescript
// GOOD - Only clears this worker's state
test.beforeAll(async ({}, testInfo) => {
  clearState(testInfo.parallelIndex);
});
```

## Test Isolation Checklist

Before writing a new test file, ask:

- [ ] Do I need to track state across tests? (Usually NO)
- [ ] If yes, am I using `Map<workerId, state>` instead of global variables?
- [ ] Are my cleanup functions accepting `workerId` parameter?
- [ ] Am I passing `testInfo.parallelIndex` to all state management functions?
- [ ] Can I simplify by doing cleanup in `afterEach` instead of shared state?

## Examples

### Good: Simple Test with Inline Cleanup

```typescript
test('should signup user', async ({ page }) => {
  const email = `user-${Date.now()}@test.com`;

  await signupUser(page, email);

  // Test assertions...

  // Cleanup
  const cookies = await getCookiesFromPage(page);
  await deleteUser(cookies);
});
```

### Good: Using afterEach for Cleanup

```typescript
let testData: { email: string; userId: string } | null = null;

test.afterEach(async ({ page }) => {
  if (testData) {
    const cookies = await getCookiesFromPage(page);
    await deleteUser(cookies, testData.userId);
    testData = null;
  }
});

test('should signup user', async ({ page }) => {
  const email = `user-${Date.now()}@test.com`;
  testData = await signupUser(page, email);

  // Test assertions...
});
```

### Good: Per-Worker State (Current Approach)

See `tests/e2e/merchant-signup.spec.ts` for the full example of how we handle per-worker cleanup registries.

## Running Tests

```bash
# Run all tests in parallel (default)
npm test

# Run single test file
npm test merchant-signup.spec.ts

# Run tests sequentially (useful for debugging)
npm test -- --workers=1

# Run specific test
npm test -- --grep "should validate slug"
```

## Debugging Parallel Test Failures

If tests pass individually but fail in parallel:

1. **Check for global state**: Search for module-level variables
2. **Check cleanup timing**: Ensure `afterAll` uses worker-specific state
3. **Check shared resources**: Database, files, ports, etc.
4. **Run with single worker**: `--workers=1` to verify test logic is correct
5. **Check test registry**: Ensure state is keyed by `testInfo.parallelIndex`

## Key Takeaway

**The simpler your tests, the better.** Prefer:
1. Inline cleanup over shared state
2. `afterEach` over `afterAll`
3. Unique test data (timestamps, UUIDs) over cleanup registries

Only use per-worker state when absolutely necessary!
