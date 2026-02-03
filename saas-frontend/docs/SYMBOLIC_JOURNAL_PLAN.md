# Symbolic Journal - Implementation Plan

> "We're not the deck. We're the training log."
> Like a workout app - we don't lift the weights, we track what they lifted and reveal patterns over time.

## Vision

A unified journaling system for mediumship development that tracks **symbolic experiences** across multiple input types (dreams, card readings, synchronicities, etc.) and surfaces patterns the user couldn't see on their own.

**Core Value Propositions:**
1. Remember what they experienced (they'd forget otherwise)
2. Surface patterns they can't see ("water has appeared 9 times this month across dreams and readings")
3. Prompt reflection that deepens the practice
4. Build their personal relationship with symbols over time

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SYMBOLIC JOURNAL                         │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Dreams    │  │  Readings   │  │   Future Types      │  │
│  │   Entry     │  │   Entry     │  │   (Sync, Visions)   │  │
│  └──────┬──────┘  └──────┬──────┘  └──────────┬──────────┘  │
│         │                │                     │            │
│         └────────────────┼─────────────────────┘            │
│                          ▼                                  │
│              ┌───────────────────────┐                      │
│              │   SYMBOL LAYER        │                      │
│              │   SymbolOccurrence    │                      │
│              │   (links entries to   │                      │
│              │    symbols)           │                      │
│              └───────────┬───────────┘                      │
│                          ▼                                  │
│              ┌───────────────────────┐                      │
│              │   PATTERN ENGINE      │                      │
│              │   - Frequency         │                      │
│              │   - Cross-type        │                      │
│              │   - Timeline          │                      │
│              └───────────┬───────────┘                      │
│                          ▼                                  │
│              ┌───────────────────────┐                      │
│              │   INSIGHTS DASHBOARD  │                      │
│              └───────────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Models

### ReadingEntry (Enhanced from DailyCardPull)

```typescript
interface ReadingEntry {
  id: string;
  docType: 'READING_ENTRY';
  userId: string;
  date: string;

  // SOURCE - Where did this reading come from?
  sourceType: 'SELF' | 'SPIRIVERSE' | 'EXTERNAL';
  sourceDetails: {
    // SELF - pulled cards myself
    deck?: string;

    // SPIRIVERSE - reading from a practitioner on platform
    spiriReadingId?: string;
    practitionerName?: string;

    // EXTERNAL - TikTok, YouTube, in-person reader, etc.
    platform?: 'TIKTOK' | 'YOUTUBE' | 'IN_PERSON' | 'OTHER';
    readerName?: string;
    sourceUrl?: string;
  };

  // CARDS
  cards: Card[];
  spreadType?: string; // "3-card", "Celtic Cross", "Single pull", etc.

  // REFLECTION
  question?: string;
  firstImpression: string;
  reflection?: string;
  resonanceScore?: 1 | 2 | 3 | 4 | 5;

  // SYMBOLS (extracted + manual)
  symbols: SymbolTag[];
  themes: string[];

  // TRACKING OVER TIME
  followUpDate?: string;
  outcome?: string;

  // MEDIA
  photoUrl?: string;

  createdAt: string;
  updatedAt: string;
}

interface Card {
  name: string;
  reversed: boolean;
  position?: string;        // Position in spread
  interpretation?: string;  // Their interpretation
}

interface SymbolTag {
  symbolId: string;         // Reference to Symbol
  name: string;             // Denormalized for display
  context?: string;         // "drowning in water" vs "calm lake"
  autoExtracted: boolean;   // true if from card mapping, false if manual
}
```

### DreamEntry (Enhanced from existing)

```typescript
interface DreamEntry {
  id: string;
  docType: 'DREAM_ENTRY';
  userId: string;
  date: string;

  // CONTENT
  title?: string;
  content: string;

  // DREAM ATTRIBUTES
  dreamType: 'NORMAL' | 'LUCID' | 'RECURRING' | 'NIGHTMARE' | 'PROPHETIC' | 'VISITATION' | 'FLYING' | 'SPIRITUAL';
  clarity: 'VIVID' | 'CLEAR' | 'MODERATE' | 'HAZY' | 'MINIMAL';
  lucid: boolean;

  // EMOTIONAL
  mood: string;
  emotions: string[];

  // SYMBOLS
  symbols: SymbolTag[];
  themes: string[];

  // REFLECTION
  interpretation?: string;
  resonanceScore?: 1 | 2 | 3 | 4 | 5;

  // TRACKING
  followUpDate?: string;
  outcome?: string;

  // CONTEXT
  sleepQuality?: string;
  wakeTime?: string;
  photoUrl?: string;

  createdAt: string;
  updatedAt: string;
}
```

### Symbol (Master Symbol Library)

```typescript
interface Symbol {
  id: string;
  docType: 'SYMBOL';

  // IDENTITY
  name: string;             // "water", "snake", "moon"
  normalizedName: string;   // lowercase, trimmed for matching
  category: 'ELEMENT' | 'ANIMAL' | 'ARCHETYPE' | 'OBJECT' | 'PLACE' | 'PERSON' | 'ACTION' | 'CELESTIAL';

  // SYSTEM MEANINGS (general reference)
  systemMeanings: string[];  // ["emotions", "subconscious", "cleansing"]

  // TAROT ASSOCIATIONS
  associatedCards: string[]; // ["The Moon", "Ace of Cups", "Queen of Cups"]

  isSystemSymbol: boolean;   // true = provided by us, false = user-created

  createdAt: string;
}
```

### UserSymbolMeaning (Personal Symbol Dictionary)

```typescript
interface UserSymbolMeaning {
  id: string;
  docType: 'USER_SYMBOL_MEANING';
  userId: string;
  symbolId: string;
  symbolName: string;       // Denormalized

  // PERSONAL MEANING
  personalMeaning: string;  // "Always shows up when I'm about to shed something"

  // STATS (computed/cached)
  totalOccurrences: number;
  dreamOccurrences: number;
  readingOccurrences: number;
  firstSeen: string;
  lastSeen: string;

  // CONTEXTS WHERE IT APPEARS
  commonContexts: string[]; // ["career transitions", "healing journey"]

  createdAt: string;
  updatedAt: string;
}
```

### SymbolOccurrence (Junction/Analytics)

```typescript
interface SymbolOccurrence {
  id: string;
  docType: 'SYMBOL_OCCURRENCE';
  userId: string;
  symbolId: string;
  symbolName: string;       // Denormalized

  // WHAT ENTRY IT APPEARED IN
  entryType: 'READING' | 'DREAM' | 'SYNCHRONICITY' | 'MEDITATION';
  entryId: string;
  entryDate: string;        // For time-based queries

  // CONTEXT
  context?: string;

  createdAt: string;
}
```

---

## Tarot Symbol Mappings

Auto-extract symbols from cards:

```typescript
const TAROT_SYMBOL_MAP: Record<string, string[]> = {
  // MAJOR ARCANA
  'The Fool': ['journey', 'new beginnings', 'leap of faith', 'innocence'],
  'The Magician': ['manifestation', 'power', 'skill', 'willpower'],
  'The High Priestess': ['intuition', 'mystery', 'subconscious', 'moon'],
  'The Empress': ['abundance', 'fertility', 'nurturing', 'nature'],
  'The Emperor': ['authority', 'structure', 'father', 'control'],
  'The Hierophant': ['tradition', 'teaching', 'institution', 'conformity'],
  'The Lovers': ['love', 'choice', 'union', 'partnership'],
  'The Chariot': ['willpower', 'victory', 'determination', 'journey'],
  'Strength': ['courage', 'patience', 'inner strength', 'lion'],
  'The Hermit': ['solitude', 'introspection', 'guidance', 'light'],
  'Wheel of Fortune': ['cycles', 'fate', 'change', 'luck'],
  'Justice': ['truth', 'fairness', 'law', 'balance'],
  'The Hanged Man': ['surrender', 'sacrifice', 'new perspective', 'waiting'],
  'Death': ['transformation', 'endings', 'change', 'rebirth'],
  'Temperance': ['balance', 'patience', 'moderation', 'alchemy'],
  'The Devil': ['shadow', 'bondage', 'materialism', 'addiction'],
  'The Tower': ['destruction', 'sudden change', 'revelation', 'lightning'],
  'The Star': ['hope', 'inspiration', 'healing', 'stars'],
  'The Moon': ['moon', 'illusion', 'intuition', 'subconscious', 'water'],
  'The Sun': ['sun', 'joy', 'success', 'vitality', 'clarity'],
  'Judgement': ['rebirth', 'calling', 'reckoning', 'awakening'],
  'The World': ['completion', 'integration', 'accomplishment', 'wholeness'],

  // SUITS - CUPS (Water/Emotions)
  'Ace of Cups': ['water', 'new emotions', 'love', 'intuition'],
  'Two of Cups': ['partnership', 'union', 'connection', 'water'],
  'Three of Cups': ['celebration', 'friendship', 'community', 'water'],
  // ... etc

  // SUITS - SWORDS (Air/Mind)
  'Ace of Swords': ['clarity', 'truth', 'breakthrough', 'air'],
  // ... etc

  // SUITS - WANDS (Fire/Action)
  'Ace of Wands': ['inspiration', 'new venture', 'fire', 'creativity'],
  // ... etc

  // SUITS - PENTACLES (Earth/Material)
  'Ace of Pentacles': ['opportunity', 'prosperity', 'earth', 'manifestation'],
  // ... etc
};

const SUIT_ELEMENTS = {
  'Cups': { element: 'water', domain: 'emotions' },
  'Swords': { element: 'air', domain: 'mind' },
  'Wands': { element: 'fire', domain: 'action' },
  'Pentacles': { element: 'earth', domain: 'material' },
};
```

---

## Dream Symbol Suggestions

Common dream symbols for auto-suggest:

```typescript
const DREAM_SYMBOL_SUGGESTIONS: Record<string, string[]> = {
  'water': ['emotions', 'subconscious', 'cleansing', 'depth', 'flow'],
  'ocean': ['vastness', 'emotions', 'subconscious', 'mother'],
  'river': ['flow', 'journey', 'time', 'emotions'],
  'rain': ['cleansing', 'renewal', 'emotions', 'release'],

  'snake': ['transformation', 'healing', 'hidden fears', 'kundalini', 'wisdom'],
  'spider': ['creativity', 'patience', 'fate', 'feminine power'],
  'wolf': ['instinct', 'freedom', 'social connection', 'loyalty'],
  'owl': ['wisdom', 'death', 'transition', 'seeing truth'],
  'crow/raven': ['magic', 'transformation', 'messages', 'death'],
  'cat': ['independence', 'intuition', 'mystery', 'feminine'],
  'dog': ['loyalty', 'protection', 'friendship', 'instinct'],

  'house': ['self', 'psyche', 'family', 'security'],
  'room': ['aspect of self', 'hidden parts', 'potential'],
  'door': ['opportunity', 'transition', 'choice', 'new phase'],
  'stairs': ['transition', 'progress', 'levels of consciousness'],
  'bridge': ['transition', 'connection', 'crossing over'],

  'flying': ['freedom', 'transcendence', 'ambition', 'perspective'],
  'falling': ['loss of control', 'anxiety', 'letting go', 'failure fears'],
  'being chased': ['avoidance', 'fear', 'running from self'],
  'teeth falling out': ['anxiety', 'loss', 'powerlessness', 'change'],
  'death': ['transformation', 'ending', 'change', 'rebirth'],

  'moon': ['intuition', 'feminine', 'cycles', 'subconscious'],
  'sun': ['consciousness', 'vitality', 'clarity', 'masculine'],
  'stars': ['hope', 'guidance', 'destiny', 'aspiration'],
  'fire': ['transformation', 'passion', 'destruction', 'purification'],
  'earth': ['grounding', 'stability', 'material', 'body'],
  'air/wind': ['mind', 'communication', 'change', 'spirit'],
};
```

---

## Implementation Phases

### Phase 1: Enhanced Reading Entry Model
**Goal**: Expand card pull to track source (self/SpiriVerse/external)

1. Update GraphQL schema with new ReadingEntry fields
2. Update backend resolver + Cosmos model
3. Update frontend form with source selection flow
4. Migrate existing DailyCardPull records (sourceType: 'SELF')

### Phase 2: Symbol Layer Foundation
**Goal**: Create symbol infrastructure

1. Create Symbol collection with system symbols
2. Create SymbolOccurrence collection
3. Create UserSymbolMeaning collection
4. Add symbol extraction on reading save (from card mappings)
5. Add manual symbol tagging UI

### Phase 3: Enhanced Dream Entry
**Goal**: Add symbols to dreams

1. Update Dream model with symbols field
2. Add symbol tagging UI to dream form
3. Add symbol suggestions based on content keywords
4. Create SymbolOccurrences on dream save

### Phase 4: Pattern Dashboard - Cards
**Goal**: Show card patterns

1. Card frequency chart (most pulled cards)
2. Suit distribution chart
3. Major vs Minor breakdown
4. Reversed frequency
5. "Cards you haven't seen" list

### Phase 5: Pattern Dashboard - Symbols
**Goal**: Cross-entry symbol patterns

1. Symbol frequency across all entry types
2. Symbol timeline view
3. "Your relationship with [Symbol]" detail view
4. Cross-reference: "Water appeared in 5 dreams and 8 readings this month"

### Phase 6: Personal Symbol Dictionary
**Goal**: Build personal meanings

1. Symbol detail page with all occurrences
2. Personal meaning editor
3. Context tracking
4. "Your interpretation of [Symbol] over time"

### Phase 7: Reflection Prompts
**Goal**: Deepen practice with gentle nudges

1. Repeated symbol prompts
2. Follow-up reminders
3. Suit energy observations
4. Streak/pattern notifications

### Phase 8: Practice Tracking
**Goal**: Workout app feel

1. Daily/weekly streaks
2. Entry counts by type
3. Consistency calendar
4. Monthly summaries

---

## Future Entry Types

Once the symbol layer is solid, we can add:

| Entry Type | Description | Symbols From |
|------------|-------------|--------------|
| Synchronicity | "Saw three owls today" | Manual tags |
| Meditation Vision | Imagery during practice | Manual tags |
| Spirit Communication | Messages received | Manual tags |
| Oracle Message | Non-tarot oracle pulls | Card + manual |
| Astrology Transit | Notable transits | Planet/sign symbols |

All feed the same symbol layer. All reveal patterns together.

---

## UI/UX Notes

### Source Selection (Readings)
```
┌─────────────────────────────────────────┐
│  How did you receive this reading?      │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 🃏 I pulled the cards myself    │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ ✨ SpiriVerse practitioner      │    │
│  └─────────────────────────────────┘    │
│  ┌─────────────────────────────────┐    │
│  │ 📱 External (TikTok, YouTube...)│    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Symbol Tagging
```
┌─────────────────────────────────────────┐
│  Symbols in this entry:                 │
│                                         │
│  Auto-detected from cards:              │
│  [moon ✓] [water ✓] [transformation ✓]  │
│                                         │
│  Add more symbols:                      │
│  [_________________] [+ Add]            │
│  Suggestions: journey, intuition, depth │
└─────────────────────────────────────────┘
```

### Pattern Insight Card
```
┌─────────────────────────────────────────┐
│  💧 Water Energy This Month             │
│                                         │
│  Dreams: ████████ 8                     │
│  Readings: ██████ 6                     │
│                                         │
│  "A lot of emotional processing.        │
│   What feelings are flowing through?"   │
│                                         │
│  [View all water entries →]             │
└─────────────────────────────────────────┘
```

---

## Migration Strategy

### Existing DailyCardPull Records
- Add `sourceType: 'SELF'`
- Add `sourceDetails: { deck: existingDeck }`
- Add empty `symbols: []` (can backfill later)
- No data loss

### Existing Dream Records
- Add empty `symbols: []`
- Can offer "tag your past dreams" feature later

---

## Success Metrics

1. **Engagement**: Daily/weekly active journaling
2. **Pattern Discovery**: Users viewing symbol patterns
3. **Personal Dictionary**: Users adding personal meanings
4. **Retention**: Return rate for pattern insights
5. **Cross-pollination**: Users logging multiple entry types

---

## Technical Considerations

### Cosmos DB Partitioning
- ReadingEntry: partition by userId
- DreamEntry: partition by userId
- SymbolOccurrence: partition by userId
- Symbol: partition by id (small collection, system-wide)
- UserSymbolMeaning: partition by userId

### Queries to Optimize
- "All symbols for user in date range" (for dashboard)
- "All occurrences of symbol X for user" (for symbol detail)
- "Entry count by type for user" (for stats)

### Caching
- Symbol master list (rarely changes)
- User's symbol frequency (update on write)
- Pattern calculations (cache with TTL)
