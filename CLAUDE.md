# SpiriVerse Development Guidelines

## Quick Reference

- **Testing Guidelines**: See `/saas-frontend/tests/TESTING_GUIDELINES.md`
- **System Architecture**: See `/docs/` folder for detailed implementation docs
- **Database Migrations**: See `/graphql-backend/src/db/migrations/`

---

## CRITICAL: Testing in Parallel

When writing Playwright tests, follow the patterns in `/saas-frontend/tests/TESTING_GUIDELINES.md`.

### Quick Rules

1. **NEVER use module-level shared state** (e.g., `let capturedCookies: string`)
2. **ALWAYS use `Map<number, State>`** keyed by `testInfo.parallelIndex`
3. **ALWAYS pass `testInfo` parameter** to access `testInfo.parallelIndex`
4. **PREFER inline cleanup** over complex state tracking

---

## CRITICAL: Avoid Using `status` as a Field Name

**NEVER** use `status` as a field name for business logic in Cosmos DB documents.

### Why

The database layer automatically adds `status` for soft-delete (`ACTIVE`, `INACTIVE`, `DELETED`). Queries add `AND c.status = "ACTIVE"` by default. If your document uses `status` for business logic, queries will silently filter out all records.

### Rule

Use descriptive field names instead:

| ❌ BAD | ✅ GOOD |
|--------|---------|
| `status: 'PENDING'` | `requestStatus: 'PENDING'` |
| `status: 'APPROVED'` | `orderStatus: 'APPROVED'` |
| `status: 'FULFILLED'` | `fulfillmentStatus: 'FULFILLED'` |

---

## CRITICAL: Cosmos DB Migrations

**ALWAYS** use the migration system when making database changes. **NEVER** manually create containers or modify schemas.

### Location

Migrations are in `/graphql-backend/src/db/migrations/`

### Commands

```bash
# Check migration status
npm run db:migrate:status -- --env=dev
npm run db:migrate:status -- --env=prd

# Run pending migrations
npm run db:migrate -- --env=dev
npm run db:migrate -- --env=prd

# Preview changes without applying
npm run db:migrate:dry-run -- --env=dev
```

### Creating New Migrations

1. Create a new file in `/graphql-backend/src/db/migrations/migrations/`
2. Use sequential numbering: `003_description.ts`, `004_another.ts`
3. Export a `migration` object implementing the `Migration` interface
4. Register it in `migrations/index.ts`

### Example Migration

```typescript
import { Migration } from "../types";

export const migration: Migration = {
    id: "003_add_new_container",
    description: "Adds Main-NewFeature container for XYZ",

    async up(context) {
        await context.createContainer({
            name: "Main-NewFeature",
            partitionKeyPath: "/userId",
        });
    },
};
```

### Rules

- Migrations are **idempotent** - safe to run multiple times (containers use createIfNotExists)
- Migrations are **tracked** in `System-Migrations` container - they won't run twice
- **Never** delete containers in migrations (data safety)
- Test migrations in dev before running in prd
- Include seed data in migrations if needed via `context.seedData()`

---

## CRITICAL: No "Coming Soon" Placeholders

**NEVER** create placeholder UI visible to users.

### Rule

If unsure whether you can complete a feature fully, **ASK FIRST**.

- ✅ Ask about scope before implementing
- ✅ Complete features fully before exposing in UI
- ✅ Hide incomplete features entirely
- ❌ "Coming Soon" dialogs
- ❌ Menu items linking to non-functional pages
- ❌ Stub components with TODO comments

---

## Code Quality Guidelines

### Before Committing

- Remove unused imports
- Remove unused variables
- Remove unused function parameters
- Escape special characters in JSX (`&apos;` for apostrophes, `&quot;` for quotes)

### Example

```tsx
// ❌ Bad
import { Edit, Trash } from "lucide-react"; // Edit not used
function Component({ id, name, onSave }) { // onSave not used
  return <p>Don't forget</p>; // Unescaped apostrophe
}

// ✅ Good
import { Trash } from "lucide-react";
function Component({ id, name }) {
  return <p>Don&apos;t forget</p>;
}
```

---

## CRITICAL: Use Test IDs in Playwright Tests

**ALWAYS** use `data-testid` attributes for element selection. **NEVER** rely on text content, labels, or CSS classes.

### Rule

```tsx
// ❌ Bad - breaks when copy changes
await page.getByText('Submit Order').click();
await page.getByRole('button', { name: 'Save' }).click();

// ✅ Good - stable selectors
await page.getByTestId('submit-order-btn').click();
await page.getByTestId('save-btn').click();
```

### When Writing Tests

1. Add `data-testid` to components if missing
2. Use descriptive, kebab-case IDs: `user-profile-card`, `order-summary-total`
3. For lists, include identifiers: `order-row-${orderId}`

---

## Changelog

Maintain a `CHANGELOG.md` in the project root. After completing work, ask if you should add it to the changelog. This includes new features, bug fixes, and configuration changes - anything billable.

### Format

```markdown
## Month Year

- Brief description of what was delivered
```
