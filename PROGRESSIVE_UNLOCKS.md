# Progressive Unlocks - Personal Space Features

This document maps all progressive unlock features across interest areas for future implementation.

## Overview

Progressive unlocks reward user engagement by revealing new features as they use the platform. This creates a sense of discovery and prevents overwhelming new users with too many options.

---

## CRYSTALS & STONES

### Core Features (Day One)
| Feature | Description |
|---------|-------------|
| Crystal Collection | Add crystals to your collection with properties, photos, meaning |
| Crystal Wishlist | Track crystals you want to acquire |
| Crystal Companion | Log which crystal is with you today |

### Progressive Unlocks
| Feature | Unlock Condition | Doc Type | Description |
|---------|-----------------|----------|-------------|
| **Cleansing Log** | 5 crystals in collection | `CRYSTAL_CLEANSING` | Log cleansing sessions (moonlight, smoke, sound, etc.) |
| **Charging Reminders** | Enable moon notifications in settings | `CHARGING_REMINDER` | Set reminders for full moon charging |
| **Crystal Grids** | 10 crystals in collection | `CRYSTAL_GRID` | Design and track crystal grid layouts |
| **Acquisition Journal** | Prompt after each new collection entry | `ACQUISITION_JOURNAL` | Tell the story of how you found each crystal |
| **Pairing Notes** | First grid logged | `CRYSTAL_PAIRING` | Document which crystals work well together |
| **Shop/Fair Log** | First acquisition with vendor tagged | `CRYSTAL_SHOP_LOG` | Track favorite vendors, shops, and fairs |

### Unlock Check Logic
```typescript
// Pseudo-code for crystal unlock checks
const crystalUnlocks = {
  cleansingLog: (stats) => stats.totalCrystals >= 5,
  chargingReminders: (settings) => settings.moonNotificationsEnabled,
  crystalGrids: (stats) => stats.totalCrystals >= 10,
  acquisitionJournal: true, // Prompt-based, always available after first crystal
  pairingNotes: (stats) => stats.totalGrids >= 1,
  shopFairLog: (stats) => stats.acquisitionsWithVendor >= 1,
};
```

---

## MEDIUMSHIP

### Core Features (Day One)
| Feature | Description |
|---------|-------------|
| Reading Reflection | Reflect on readings you've received from mediums/psychics |

### Progressive Unlocks
| Feature | Unlock Condition | Doc Type | Description |
|---------|-----------------|----------|-------------|
| **Synchronicity Log** | 7 days active on platform | `SYNCHRONICITY` | Track meaningful coincidences and signs |
| **Spirit Messages** | First Reading Reflection entry | `SPIRIT_MESSAGE` | Log messages received from spirit |
| **Symbol Dictionary** | 5 dream entries (patterns emerging) | `PERSONAL_SYMBOL` | Build your personal symbol meanings |
| **Loved Ones in Spirit** | Optional prompt around holidays/anniversaries | `LOVED_ONE_SPIRIT` | Honor and track signs from passed loved ones |
| **Development Exercises** | 30 days active (committed user) | `DEVELOPMENT_EXERCISE` | Log psychic/mediumship practice sessions |

### Unlock Check Logic
```typescript
// Pseudo-code for mediumship unlock checks
const mediumshipUnlocks = {
  synchronicityLog: (user) => daysSinceSignup(user) >= 7,
  spiritMessages: (stats) => stats.readingReflectionCount >= 1,
  symbolDictionary: (stats) => stats.dreamEntryCount >= 5,
  lovedOnesInSpirit: true, // Prompt-based around holidays
  developmentExercises: (user) => daysSinceSignup(user) >= 30,
};
```

---

## ENERGY HEALING

### Core Features (Day One)
| Feature | Description |
|---------|-------------|
| Energy Journal | Log energy work sessions (meditation, clearing, grounding, etc.) |
| Chakra Check-In | Daily chakra status assessment |
| Session Reflections | Reflect on healing sessions you've received |

### Progressive Unlocks
| Feature | Unlock Condition | Doc Type | Description |
|---------|-----------------|----------|-------------|
| **Attunement Tracker** | First "Session Given" entry in journal | `ATTUNEMENT_RECORD` | Track Reiki and other attunements received |
| **Protection Rituals** | 5 clearing entries in journal | `PROTECTION_RITUAL` | Log shielding, cord cutting, space clearing |
| **Aura Observations** | 10 journal entries total | `AURA_OBSERVATION` | Record aura readings (self and others) |

### Unlock Check Logic
```typescript
// Pseudo-code for energy healing unlock checks
const energyUnlocks = {
  attunementTracker: (stats) => stats.sessionsGiven >= 1,
  protectionRituals: (stats) => stats.clearingEntryCount >= 5,
  auraObservations: (stats) => stats.totalJournalEntries >= 10,
};
```

---

## TAROT & ORACLE (Future Reference)

### Core Features (Day One)
| Feature | Description |
|---------|-------------|
| Reading Entry | Log card pulls (self, SpiriVerse, external) |
| Dream Journal | Record and analyze dreams |
| Meditation Journal | Track meditation sessions |

### Progressive Unlocks (TBD)
| Feature | Unlock Condition | Description |
|---------|-----------------|-------------|
| **Card Pattern Stats** | 10 readings logged | See which cards appear most often |
| **Symbol Tracking** | 5 entries with symbols | Cross-reference symbols across dreams/readings |
| **Spread Builder** | 20 readings logged | Create custom spreads |

---

## Implementation Architecture

### 1. Unlock Status Service
Create a centralized service to check unlock status:

```typescript
// src/services/unlock-status.ts
interface UnlockStatus {
  featureId: string;
  isUnlocked: boolean;
  progress?: {
    current: number;
    required: number;
    label: string; // e.g., "3/5 crystals"
  };
  unlockedAt?: string;
}

interface UserUnlockState {
  crystals: {
    cleansingLog: UnlockStatus;
    chargingReminders: UnlockStatus;
    crystalGrids: UnlockStatus;
    // ...
  };
  mediumship: {
    synchronicityLog: UnlockStatus;
    spiritMessages: UnlockStatus;
    // ...
  };
  energy: {
    attunementTracker: UnlockStatus;
    protectionRituals: UnlockStatus;
    auraObservations: UnlockStatus;
  };
}
```

### 2. GraphQL Query
```graphql
type UnlockStatus {
  featureId: String!
  isUnlocked: Boolean!
  progress: UnlockProgress
  unlockedAt: String
}

type UnlockProgress {
  current: Int!
  required: Int!
  label: String!
}

type Query {
  getUserUnlockStatus(userId: ID!): UserUnlockState!
}
```

### 3. Frontend Hook
```typescript
// useUnlockStatus.ts
const useUnlockStatus = (interest: 'crystals' | 'mediumship' | 'energy') => {
  const { data } = useQuery(['unlock-status', interest], ...);
  return {
    isUnlocked: (feature: string) => data?.[feature]?.isUnlocked ?? false,
    getProgress: (feature: string) => data?.[feature]?.progress,
  };
};
```

### 4. Sidenav Integration
```tsx
// Locked feature in sidenav
<NavItem
  icon={<Lock className="w-4 h-4" />}
  label="Cleansing Log"
  locked={!isUnlocked('cleansingLog')}
  progress={getProgress('cleansingLog')} // "3/5 crystals"
  onClick={locked ? showUnlockHint : navigate}
/>
```

### 5. Unlock Celebration
When a feature unlocks, show a celebration modal:
- Confetti animation
- "New Feature Unlocked!" message
- Brief description of what they can now do
- CTA to try the new feature

---

## Database Considerations

### Storing Unlock State
Option A: Calculate on-the-fly from stats (simpler, always accurate)
Option B: Store unlock timestamps in user document (faster queries, historical data)

**Recommendation:** Hybrid approach
- Calculate unlock eligibility from stats
- Store `unlockedAt` timestamp when first unlocked (for analytics/celebration)
- Never re-lock a feature once unlocked

### User Document Addition
```typescript
interface UserDocument {
  // ... existing fields
  unlocks?: {
    [featureId: string]: {
      unlockedAt: string;
      celebrationShown: boolean;
    };
  };
}
```

---

## Priority Order for Implementation

### Phase 1: Energy Healing (Current Focus)
1. ✅ Types defined
2. ⏳ GraphQL schema & resolvers
3. ⏳ Frontend pages & components
4. ⏳ Sidenav with unlock states
5. ⏳ Playwright tests

### Phase 2: Crystals
1. ✅ Types defined (including new progressive features)
2. ⏳ Add manager methods for new features
3. ⏳ GraphQL schema & resolvers
4. ⏳ Frontend integration
5. ⏳ Update existing sidenav with lock states

### Phase 3: Mediumship
1. ✅ Types defined
2. ⏳ Manager methods
3. ⏳ GraphQL schema & resolvers
4. ⏳ Frontend pages & components
5. ⏳ Sidenav integration

### Phase 4: Centralized Unlock System
1. ⏳ Unlock status service
2. ⏳ GraphQL query for bulk unlock status
3. ⏳ Unlock celebration component
4. ⏳ Analytics tracking for unlocks

---

## File Locations

### Backend Types
- `graphql-backend/src/graphql/personal-space/types/crystal-types.ts`
- `graphql-backend/src/graphql/personal-space/types/mediumship-types.ts`
- `graphql-backend/src/graphql/personal-space/types/energy-types.ts`

### Backend Managers
- `graphql-backend/src/graphql/personal-space/managers/energy-manager.ts`
- `graphql-backend/src/graphql/personal-space/managers/crystal-manager.ts` (TBD)
- `graphql-backend/src/graphql/personal-space/managers/mediumship-manager.ts` (TBD)

### Frontend (TBD)
- `saas-frontend/src/app/u/[userId]/space/energy/`
- `saas-frontend/src/app/u/[userId]/space/crystals/`
- `saas-frontend/src/app/u/[userId]/space/mediumship/`

---

## Notes

- Progressive unlocks should feel rewarding, not frustrating
- Always show progress toward next unlock
- Consider "sneak peek" of locked features to build anticipation
- Unlock conditions should be achievable within reasonable timeframes
- Some features (like Acquisition Journal) are prompt-based rather than gated
