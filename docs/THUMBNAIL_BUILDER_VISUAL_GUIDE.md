# Thumbnail Builder - Visual Guide

## 🎯 The Two-Layer System

```
┌─────────────────────────────────────────┐
│                                         │
│         DYNAMIC BACKGROUND              │
│       (Video or Collage - Optional)     │
│                                         │
│    ┌───────────────────────────┐       │
│    │                           │       │
│    │   COVER PHOTO (Required)  │       │
│    │   Sits on top, centered   │       │
│    │                           │       │
│    └───────────────────────────┘       │
│                                         │
└─────────────────────────────────────────┘
```

## 📋 Multi-Step Creation Flow

```
Step 1: Basic Info          Step 2: Thumbnail           Step 3: Review
┌─────────────────┐        ┌─────────────────┐        ┌─────────────────┐
│ • Service Name  │   →    │ ✨ Cover Photo  │   →    │ 📋 Summary      │
│ • Description   │        │                 │        │                 │
│ • Reading Type  │        │ 🎬 Dynamic Mode │        │ 🖼️  Preview     │
│ • Price         │        │   [ ] None      │        │                 │
│ • Turnaround    │        │   [ ] Video     │        │ ✅ Submit       │
│ • Inclusions    │        │   [ ] Collage   │        │                 │
└─────────────────┘        └─────────────────┘        └─────────────────┘
```

## 🎨 Dynamic Mode Options

### Option 1: None (Static Only)
```
┌─────────────────────────────┐
│                             │
│   ┌───────────────────┐     │
│   │                   │     │
│   │  COVER PHOTO      │     │
│   │  (only layer)     │     │
│   │                   │     │
│   └───────────────────┘     │
│                             │
└─────────────────────────────┘
```

### Option 2: Video Mode
```
┌─────────────────────────────┐
│  🎬 5s looping video        │
│  (muted, autoplay)          │
│                             │
│   ┌───────────────────┐     │
│   │  COVER PHOTO      │     │
│   │  (on top)         │     │
│   └───────────────────┘     │
│                             │
└─────────────────────────────┘
```
**Best for:** Mediums, psychics, guides, teachers

### Option 3: Collage Mode
```
┌─────────────────────────────┐
│  🖼️  Cross-fading images    │
│  (3-5 images, 3s each)      │
│                             │
│   ┌───────────────────┐     │
│   │  COVER PHOTO      │     │
│   │  (on top)         │     │
│   └───────────────────┘     │
│                             │
└─────────────────────────────┘
```
**Best for:** Crystal shops, candle makers, artists

## 🔄 User Interaction Flow

```
1. Upload Cover Photo (Required)
   ↓
2. Choose Dynamic Mode
   ↓
   ├─ None → Continue to Review
   │
   ├─ Video → Upload 5s video → Preview → Continue
   │
   └─ Collage → Upload 3-5 images → Preview → Continue
   ↓
3. Review Everything
   ↓
4. Submit
```

## 📦 Component Structure

```
CreateReading (Multi-step Form)
│
├─ Step 1: Basic Info Fields
│   ├─ Name
│   ├─ Description
│   ├─ Reading Type
│   ├─ Price & Currency
│   └─ Options
│
├─ Step 2: ThumbnailBuilder ⭐
│   │
│   ├─ Cover Photo Section
│   │   └─ Upload + Preview + Remove
│   │
│   ├─ Dynamic Mode Selector
│   │   ├─ [ ] None
│   │   ├─ [ ] Video
│   │   └─ [ ] Collage
│   │
│   ├─ Video Upload (if selected)
│   │   └─ Upload + Preview + Remove
│   │
│   ├─ Collage Upload (if selected)
│   │   └─ Multiple Upload + Grid + Remove
│   │
│   └─ Live Preview Box
│       └─ Shows combined result
│
└─ Step 3: Review & Submit
    ├─ All data summary
    ├─ Thumbnail preview
    └─ Submit button
```

## 🎯 Step Navigation

```
┌─────────────────────────────────────────────────────┐
│  [1] Basic Info  →  [2] Thumbnail  →  [3] Review    │
│   (purple)          (current)         (gray)        │
└─────────────────────────────────────────────────────┘

Navigation Rules:
• Can't skip steps
• Must complete required fields to proceed
• Can go back to previous steps
• Completed steps show checkmark ✓
```

## 💾 Data Structure

```typescript
thumbnailV2: {
  coverPhoto: {
    media: MediaFile,
    zoom: 1,
    objectFit: "cover"
  },
  dynamicMode?: {
    type: "VIDEO" | "COLLAGE",
    video?: {
      media: MediaFile,
      autoplay: true,
      muted: true
    },
    collage?: {
      images: MediaFile[],
      transitionDuration: 3,
      crossFade: true
    }
  }
}
```

## 📱 Preview Animation

```
Collage Mode Preview:
┌─────────────────┐
│ Image 1 (fade)  │  ← visible for 3s
└─────────────────┘
        ↓
┌─────────────────┐
│ Image 2 (fade)  │  ← cross-fades in
└─────────────────┘
        ↓
┌─────────────────┐
│ Image 3 (fade)  │  ← cross-fades in
└─────────────────┘
        ↓
      (loops)
```

## ✨ Key Features

1. **Drag & Drop** (or click to upload)
2. **Live Preview** - See result immediately
3. **Easy Removal** - X button on each uploaded item
4. **Progress Feedback** - Shows "Uploading..."
5. **Validation** - Can't proceed without cover photo
6. **Responsive** - Works on mobile and desktop

## 🎨 Color Scheme

- **Step 1 Icon**: Purple (`bg-purple-200`, `text-purple-600`)
- **Step 2 Icon**: Blue (`bg-blue-500`, `text-white`)
- **Step 3 Icon**: Green when complete (`bg-green-500`)
- **Active Step**: Purple ring
- **Completed Steps**: Green with checkmark

---

**Quick Start:** Just upload a cover photo to create a basic reading offer, or add Video/Collage mode for more visual impact!
