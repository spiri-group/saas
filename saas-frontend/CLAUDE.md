# Testing Guidelines

## Playwright Test Patterns for Parallel Execution

**CRITICAL**: When writing Playwright tests, always follow the patterns in `tests/TESTING_GUIDELINES.md` to ensure tests work correctly when run in parallel.

### Quick Reference

**The Golden Rule**: Avoid module-level shared state - Playwright cannot isolate it across workers!

#### ✅ CORRECT - Per-Test Cleanup (Preferred)
```typescript
test('should create user', async ({ page }) => {
  const email = `test-${Date.now()}@example.com`; // Unique data

  // Test logic...

  // Cleanup inline or in afterEach
  await deleteUser(email);
});
```

#### ✅ CORRECT - Per-Worker State (Only When Necessary)
```typescript
// In utilities
const statePerWorker = new Map<number, State>();

export function register(entity: Entity, workerId: number) {
  if (!statePerWorker.has(workerId)) {
    statePerWorker.set(workerId, new Set());
  }
  statePerWorker.get(workerId)!.add(entity);
}

// In tests
test('my test', async ({ page }, testInfo) => {
  register(entity, testInfo.parallelIndex); // Always pass workerId
});

test.beforeAll(async ({}, testInfo) => {
  clearState(testInfo.parallelIndex); // Clear per-worker
});
```

#### ❌ INCORRECT - Global Shared State
```typescript
// DON'T DO THIS - Race condition!
let capturedCookies: string;
const globalRegistry = new Set();

test('test', async ({ page }) => {
  capturedCookies = await getCookies(page); // ❌ Shared across workers!
});
```

### Required Pattern for All New Tests

1. **Always add `testInfo` parameter** to access `testInfo.parallelIndex`
2. **Pass `workerId` to all state management functions**
3. **Use `Map<number, State>` for shared state**, never global variables
4. **Prefer inline cleanup** over complex state tracking

**For complete details, see `tests/TESTING_GUIDELINES.md`**

---

# GraphQL Hook Patterns

## Correct Pattern for GraphQL Hooks

When creating React Query hooks that use GraphQL, follow these patterns:

## Query Key Naming Convention

**IMPORTANT**: Always use kebab-case for React Query keys to maintain consistency.

### ✅ CORRECT - Use kebab-case for query keys
```tsx
// Good examples:
queryKey: ['vendor-events', vendorId]
queryKey: ['catalogue-events', merchantId] 
queryKey: ['user-profile', userId]
queryKey: ['merchant-branding', merchantId]
```

### ❌ INCORRECT - Don't mix camelCase with kebab-case
```tsx  
// Bad examples - inconsistent naming:
queryKey: ['vendorEvents', vendorId]  // ❌ camelCase mixed with kebab-case
queryKey: ['catalogue-events', merchantId] // This part is fine, but inconsistent with above
```

**Rule**: All query keys should use kebab-case for the first element. Parameters can remain as-is.

### ✅ CORRECT - Function Call Pattern

```tsx
import { useQuery, useMutation } from '@tanstack/react-query';
import { gql } from '@/lib/services/gql';

// For useQuery
export const useExample = (id: string) => {
  return useQuery({
    queryKey: ['user-example', id],
    queryFn: async () => {
      const response = await gql<{
        example: {
          id: string;
          name: string;
        };
      }>(`
        query GetExample($id: ID!) {
          example(id: $id) {
            id
            name
          }
        }
      `, { id });
      return response.example;
    },
    enabled: !!id,
  });
};

// For useMutation
export const useCreateExample = () => {
  return useMutation({
    mutationFn: async (data: any) => {
      const response = await gql<{
        createExample: {
          success: boolean;
          example: {
            id: string;
            name: string;
          };
        };
      }>(`
        mutation CreateExample($input: ExampleInput!) {
          createExample(input: $input) {
            success
            example {
              id
              name
            }
          }
        }
      `, { input: data });
      return response.createExample;
    },
  });
};
```

### ❌ INCORRECT - Template Literal Pattern (DO NOT USE)

```tsx
// DON'T DO THIS:
const QUERY = gql`
  query GetExample($id: ID!) {
    example(id: $id) {
      id
      name
    }
  }
`;

export const useExample = (id: string) => {
  return useQuery({
    queryKey: ['user-example', id],
    queryFn: async () => {
      const response = await gql.request(QUERY, { id }); // ❌ WRONG
      return response.example;
    },
  });
};
```

## Key Points

1. **Use `gql<ResponseType>(queryString, variables)` as a function call**
2. **Define TypeScript types inline with the generic `<ResponseType>`**
3. **Pass query/mutation as template string directly to gql function**
4. **Pass variables as second parameter to gql function**
5. **Never use `gql.request()` method**
6. **Never define queries/mutations as separate `gql` template literals**
7. **Always use kebab-case for query keys** - e.g., `['vendor-events', id]` not `['vendorEvents', id]`

## Examples from Working Hooks

- ✅ `UseCatalogueEvents.tsx` - Correct pattern with `['catalogue-events', merchantId]`
- ✅ `UseVendorEvents.tsx` - Correct pattern with `['vendor-events', vendorId]`
- ✅ `UseEditVendorBranding.tsx` - Correct pattern

## Testing Your Hooks

When creating new hooks, verify they follow this pattern by checking:
1. No separate `gql` template literal declarations
2. No `gql.request()` calls
3. Direct `gql<ResponseType>(queryString, variables)` function calls
4. Proper TypeScript typing with generics
5. Query keys use kebab-case formatting

# Loading States and User Feedback

## Always Use Loading States for Better UX

**IMPORTANT**: Always provide visual feedback for user actions, especially mutations that take time.

### ✅ CORRECT - Use React Query Loading States

```tsx
const MyComponent = () => {
  const deleteMutation = useDeleteItem();
  
  return (
    <Button 
      onClick={() => deleteMutation.mutate({ id: itemId })}
      disabled={deleteMutation.isPending}
    >
      {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
    </Button>
  );
};
```

### ✅ BETTER - Use useFormStatus for Form Actions

```tsx
import { useFormStatus } from 'react-dom';

const SubmitButton = () => {
  const { pending } = useFormStatus();
  
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Saving...' : 'Save'}
    </Button>
  );
};
```

### ✅ BEST - Combine with Visual Indicators

```tsx
const ActionButton = ({ onAction, children }) => {
  const [isLoading, setIsLoading] = useState(false);
  
  const handleClick = async () => {
    setIsLoading(true);
    try {
      await onAction();
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Button onClick={handleClick} disabled={isLoading}>
      {isLoading && <Spinner className="w-4 h-4 mr-2" />}
      {isLoading ? 'Processing...' : children}
    </Button>
  );
};
```

## Guidelines for Loading States

1. **Always disable buttons during loading** to prevent double-clicks
2. **Show loading text** that describes what's happening ("Deleting...", "Saving...", etc.)
3. **Use spinners/icons** for visual indication when space allows
4. **Provide immediate feedback** - don't leave users wondering if their click registered
5. **Handle error states** with proper error messages and recovery options

## Common Patterns to Use

- ✅ `mutation.isPending` for React Query mutations
- ✅ `useFormStatus()` for form submissions
- ✅ Custom loading states for complex async operations
- ✅ Toast notifications for success/error feedback
- ✅ Optimistic updates where appropriate

# Object References and ChatControl

## Always Use Backend-Provided Refs

**CRITICAL**: When integrating ChatControl or any component that needs object references, NEVER hardcode container names or create refs manually on the client side.

### ✅ CORRECT - Use Backend-Provided Refs

```tsx
// Backend provides the ref field in GraphQL response
const MyComponent = ({ item }) => {
  return (
    <ChatControl
      forObject={item.ref}  // ✅ Use the ref from backend
      title="Discussion"
      defaultMode={CommunicationModeType.PLATFORM}
      // ... other props
    />
  );
};
```

### ❌ INCORRECT - Client-Side Container Creation

```tsx
// DON'T DO THIS:
const MyComponent = ({ item }) => {
  return (
    <ChatControl
      forObject={{
        id: item.id,
        partition: [item.id],
        container: "Main-SomeContainer"  // ❌ WRONG - hardcoded container
      }}
      title="Discussion"
      // ... other props
    />
  );
};
```

## GraphQL Types Must Include Refs

When adding ChatControl support to any entity, ensure the GraphQL type includes a `ref` field:

### ✅ CORRECT - GraphQL Type with Ref

```graphql
type MyEntity {
  id: ID!
  name: String!
  # ... other fields
  ref: RecordRef!  # ✅ REQUIRED for ChatControl
  createdAt: String!
  updatedAt: String!
}
```

### Backend Implementation

The backend resolver must populate the `ref` field:

```typescript
// In your manager/resolver
async getMyEntities(merchantId: string): Promise<MyEntity[]> {
  const results = await this.cosmos.run_query<MyEntity>(this.containerName, querySpec);
  
  // Add refs for each entity
  for (const entity of results) {
    entity.ref = {
      id: entity.id,
      partition: [entity.id], // or appropriate partition
      container: this.containerName
    };
  }
  
  return results;
}
```

### Frontend Query Must Fetch Ref

```tsx
// Always include ref in your GraphQL queries
const query = `
  query GetMyEntities($merchantId: ID!) {
    myEntities(merchantId: $merchantId) {
      id
      name
      # ... other fields
      ref {         # ✅ REQUIRED - fetch the ref
        id
        partition
        container
      }
      createdAt
      updatedAt
    }
  }
`;
```

## Why This Matters

1. **Backend Authority** - The backend determines the correct container and partition scheme
2. **Consistency** - Ensures all refs follow the same pattern across the application
3. **Maintainability** - Container changes only need to happen in one place (backend)
4. **Security** - Prevents client-side manipulation of container references

## Examples in Codebase

- ✅ `GalleryItem` - Has `ref: RecordRef!` field, ChatControl works correctly
- ✅ `GalleryAlbum` - Recently added `ref: RecordRef!` field for album discussions
- ❌ Any component manually creating `forObject` with hardcoded containers

## Checklist for Adding ChatControl

1. ✅ Does the GraphQL type have `ref: RecordRef!`?
2. ✅ Does the backend populate the ref field correctly?
3. ✅ Does the frontend query fetch the ref field?
4. ✅ Does the component use `forObject={entity.ref}`?
5. ✅ Never hardcode container names on the client

**Remember**: The client should never dictate the container - always use refs from the backend!

# Merchant Theming

## Use Shared Theming Hook

**IMPORTANT**: For any component that needs merchant theming, use the shared `useMerchantTheme` hook instead of duplicating theming logic.

### ✅ CORRECT - Use Shared Hook

```tsx
import useMerchantTheme from '../../_hooks/UseMerchantTheme';

const MyComponent = ({ merchantId }) => {
  // This automatically applies all CSS variables for merchant theming
  const vendorBranding = useMerchantTheme(merchantId);
  
  // Don't render until branding data is available
  if (!vendorBranding.data) return null;
  
  return (
    <div>
      <h1 className="text-merchant-headings-foreground">Title</h1>
      <p className="text-merchant-default-foreground/70">Description</p>
      <div className="border-merchant-primary/20">Content</div>
    </div>
  );
};
```

### ❌ INCORRECT - Duplicating Theming Logic

```tsx
// DON'T DO THIS:
const MyComponent = ({ merchantId }) => {
  const vendorBranding = UseVendorBranding(merchantId);
  
  // ❌ WRONG - duplicating theming logic
  useEffect(() => {
    if (vendorBranding.data?.vendor.colors) {
      // Setting CSS variables manually...
      document.documentElement.style.setProperty('--merchant-primary', ...);
      // ... lots of duplicated code
    }
  }, [vendorBranding.data]);
  
  // ... rest of component
};
```

## Available CSS Variables

The `useMerchantTheme` hook automatically sets these CSS custom properties:

### Colors
- `--merchant-primary` - Primary brand color (RGB)
- `--merchant-primary-foreground` - Primary text color (RGB)
- `--merchant-links` - Link color (RGB)
- `--merchant-brand` - Legacy brand color (RGB)

### Typography
- `--merchant-brand-foreground` - Brand text color
- `--merchant-default-foreground` - Default text color  
- `--merchant-headings-foreground` - Headings text color
- `--merchant-accent-foreground` - Accent text color

### Layout
- `--merchant-background` - Background color
- `--merchant-background-image` - Background image/gradient
- `--merchant-panel` - Panel background color
- `--merchant-panel-transparency` - Panel transparency
- `--merchant-panel-primary-foreground` - Panel primary text
- `--merchant-panel-accent-foreground` - Panel accent text
- `--merchant-box-shadow-color` - Shadow colors

## Tailwind Classes

Use these Tailwind classes to apply merchant theming:

```tsx
// Text colors
<h1 className="text-merchant-headings-foreground">Heading</h1>
<p className="text-merchant-default-foreground">Body text</p>
<a className="text-merchant-links hover:underline">Link</a>

// Backgrounds and borders
<div className="bg-merchant-primary text-merchant-primary-foreground">Button</div>
<div className="border-merchant-primary/20 focus:border-merchant-primary">Input</div>
<div className="text-merchant-primary/50">Muted element</div>

// Use opacity modifiers for variations
<p className="text-merchant-default-foreground/70">Muted text</p>
<div className="border-merchant-primary/20">Subtle border</div>
```

## Font Loading

For proper font support, also include `MerchantFontLoader`:

```tsx
import MerchantFontLoader from '../MerchantFontLoader';

const MyComponent = ({ merchantId }) => {
  const vendorBranding = useMerchantTheme(merchantId);
  
  if (!vendorBranding.data) return null;
  
  const fontConfig = vendorBranding.data.vendor.font ? {
    brand: vendorBranding.data.vendor.font.brand?.family || 'clean',
    default: vendorBranding.data.vendor.font.default?.family || 'clean',
    headings: vendorBranding.data.vendor.font.headings?.family || 'clean',
    accent: vendorBranding.data.vendor.font.accent?.family || 'clean'
  } : undefined;
  
  return (
    <div>
      <MerchantFontLoader fonts={fontConfig} />
      {/* Your themed content */}
    </div>
  );
};
```

## Examples in Codebase

- ✅ `Gallery UI` - Uses `useMerchantTheme` for consistent theming
- ✅ `VendorProfile` - Updated to use shared theming hook
- ❌ Any component manually setting `document.documentElement.style.setProperty`

**Remember**: Always use the shared theming hook to avoid code duplication and ensure consistency!

# Keyboard Shortcuts

## Implementing Keyboard Shortcuts That Don't Interfere with Inputs

**IMPORTANT**: When adding keyboard shortcuts to components, always ensure they don't trigger when the user is typing in input fields.

### ✅ CORRECT - Input-Safe Keyboard Shortcuts

```tsx
import { useEffect } from 'react';

interface KeyboardShortcut {
  key: string;
  action: () => void;
  description: string;
}

interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
}

/**
 * Hook for handling keyboard shortcuts that don't trigger when focused on inputs
 */
export const useKeyboardShortcuts = ({ shortcuts, enabled = true }: UseKeyboardShortcutsOptions) => {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyPress = (event: KeyboardEvent) => {
      // Don't trigger shortcuts when user is typing in inputs, textareas, or contenteditable elements
      const target = event.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('[contenteditable="true"]');

      if (isInput) return;

      // Find matching shortcut
      const shortcut = shortcuts.find(s => s.key.toLowerCase() === event.key.toLowerCase());
      if (shortcut) {
        event.preventDefault();
        shortcut.action();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [shortcuts, enabled]);
};
```

### Usage Example

```tsx
export default function MyComponent() {
  const [showDialog, setShowDialog] = useState(false);
  const [currentTab, setCurrentTab] = useState("templates");

  // Keyboard shortcuts
  useKeyboardShortcuts({
    shortcuts: [
      { key: 'n', action: handleCreate, description: 'Create new item' },
      { key: 'c', action: () => clearFilter(), description: 'Clear filter' },
      { key: 't', action: () => setCurrentTab('templates'), description: 'Switch to Templates tab' },
      { key: 'h', action: () => setCurrentTab('headers'), description: 'Switch to Headers tab' },
      { key: '?', action: () => setShowDialog(true), description: 'Show shortcuts' },
      { key: 'Escape', action: handleClose, description: 'Close dialog' },
    ],
    enabled: !showDialog // Disable when help dialog is open
  });

  // ... rest of component
}
```

### Shortcuts Help Dialog

```tsx
<Dialog open={showShortcutsDialog} onOpenChange={setShowShortcutsDialog}>
  <DialogContent className="sm:max-w-md">
    <DialogHeader>
      <DialogTitle className="flex items-center space-x-2">
        <Keyboard className="h-5 w-5 text-purple-400" />
        <span>Keyboard Shortcuts</span>
      </DialogTitle>
      <DialogDescription>
        Use these keyboard shortcuts to navigate quickly. Shortcuts don&apos;t work when typing in text fields.
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-4">
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-white">Navigation</h4>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">Switch to Templates tab</span>
            <kbd className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300 font-mono text-xs">T</kbd>
          </div>
          {/* More shortcuts... */}
        </div>
      </div>
    </div>
  </DialogContent>
</Dialog>
```

## Key Principles

1. **Single Letter Keys**: Use single letters (no Ctrl/Cmd required) for quick access
2. **Input Protection**: Always check if user is in an input field before triggering
3. **Visual Indicator**: Add a keyboard icon button and `?` shortcut to show available shortcuts
4. **Escape Key**: Use Escape to close dialogs/editors
5. **Conditional Enabling**: Disable shortcuts when dialogs are open to prevent conflicts
6. **Clear Descriptions**: Provide descriptions for each shortcut in the help dialog

## Common Shortcuts Pattern

- `n` - New/Create
- `c` - Clear/Cancel
- `e` - Edit
- `d` - Delete
- `s` - Save
- `?` - Show help
- `Escape` - Close/Cancel
- Letter keys for tab switching (`t`, `h`, `f`, etc.)

## Examples in Codebase

- ✅ `EmailTemplatesManager` - Complete keyboard shortcuts with help dialog
- ✅ Input-safe implementation that doesn't interfere with typing

**Remember**: Always protect keyboard shortcuts from triggering when users are typing in input fields!