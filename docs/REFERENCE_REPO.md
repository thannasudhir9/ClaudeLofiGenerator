# 📚 300-Item AI Reference Database & Media Catalog

> **Document Version**: 2.0.0  
> **Date & Time**: October 13, 2026 — 15:08:05 CEST (UTC+2)  
> **Project**: Claude LoFi, Anime & Pixar Multimedia Production Studio  
> **Author**: Sudhir Thanna (`thannasudhir9`)  

---

## 1. Catalog Overview

The Claude LoFi Generator includes a curated reference database containing **300 high-resolution visual artwork assets** stored in `public/reference_repo/`. The repository is indexed through `public/reference_repo/catalog.json` and split across three primary aesthetic genres:

| Aesthetic Category | Folder | Asset Count | Filename Pattern | Visual Characteristics |
|---|---|---|---|---|
| **LoFi Beats** | `public/reference_repo/lofi/` | 100 | `lofi_001.png` - `lofi_100.png` | Rainy windows, cozy study desks, sleeping pets, warm desk lamps, coffee mugs, cassette decks |
| **Anime** | `public/reference_repo/anime/` | 100 | `anime_001.png` - `anime_100.png` | Makoto Shinkai twilight clouds, Tokyo railway stations, Studio Ghibli country porches, cherry blossom shrines |
| **Pixar 3D** | `public/reference_repo/pixar/` | 100 | `pixar_001.png` - `pixar_100.png` | Cozy cabin fireplaces, glowing embers, rooftop stargazing telescopes, soft studio lighting bloom |

---

## 2. Catalog Schema (`catalog.json`)

The database is structured as a JSON array of objects with the following schema:

```json
[
  {
    "id": "lofi_001",
    "filename": "lofi_001.png",
    "title": "Study Girl with Headphones and Cat",
    "category": "lofi",
    "tags": ["desk", "headphones", "rain", "cat", "lamp", "books"],
    "prompt": "Warm cozy study room, girl with over-ear headphones studying at wooden desk, sleeping orange cat on books, soft rain on windowpane, ambient warm desk lamp, lofi aesthetic art",
    "url": "/reference_repo/lofi/lofi_001.png"
  },
  {
    "id": "anime_001",
    "filename": "anime_001.png",
    "title": "Shinkai Twilight Railway Station",
    "category": "anime",
    "tags": ["train", "sunset", "clouds", "shinkai", "tokyo", "sky"],
    "prompt": "Makoto Shinkai style twilight railway platform, dramatic purple and orange cumulus clouds, setting sun reflecting on train tracks, distant Tokyo cityscape, cinematic anime art",
    "url": "/reference_repo/anime/anime_001.png"
  },
  {
    "id": "pixar_001",
    "filename": "pixar_001.png",
    "title": "Cozy Winter Cabin Fireplace",
    "category": "pixar",
    "tags": ["fireplace", "cabin", "cozy", "cocoa", "wood", "warmth"],
    "prompt": "Pixar style 3D animation render of a cozy rustic cabin, roaring brick fireplace with glowing embers, wooden rocking chair, steaming mug of hot cocoa, warm golden studio lighting",
    "url": "/reference_repo/pixar/pixar_001.png"
  }
]
```

---

## 3. Aesthetic Profiles & Prompt Engineering

### 3.1 LoFi Aesthetic (100 Assets)
- **Palette**: Muted pastels, warm amber, midnight teal, soft lavender.
- **Atmosphere**: Intimate, nocturnal, contemplative, rainy.
- **Key Motifs**:
  - Classic study desks with laptops, textbooks, and steaming mugs.
  - Tokyo alleyways under neon light and light drizzle.
  - Vintage analog cassette decks, vinyl turntables, and CRT monitors.
  - Cozy bedroom window sills with indoor plants and resting cats.

### 3.2 Anime Aesthetic (100 Assets)
- **Palette**: Hyper-saturated cobalt blues, golden yellows, magenta pinks, and lush jade greens.
- **Influences**:
  - **Makoto Shinkai**: Towering cumulus clouds, dramatic golden hour lens flares, cinematic train tracks, starry meteor twilight skies.
  - **Studio Ghibli**: Hand-painted watercolor countryside cottages, summer gardens, wind blowing through tall grass, sunlit porches.

### 3.3 Pixar 3D Aesthetic (100 Assets)
- **Palette**: Warm honey amber, velvety midnight blues, soft pastel highlights.
- **Rendering Style**:
  - Stylized 3D character proportions and whimsical architecture.
  - Soft global illumination, volumetric light shafts, and realistic specular bloom.
  - Warm fireplace hearths, hot cocoa, fluffy blankets, and rooftop observatories.

---

## 4. UI & API Integration

### 4.1 REST API Endpoint (`GET /api/references`)
Clients retrieve the full indexed catalog via:
```http
GET /api/references HTTP/1.1
Host: localhost:3000
```
Response:
```json
{
  "total": 300,
  "categories": { "lofi": 100, "anime": 100, "pixar": 100 },
  "items": [ /* 300 asset objects */ ]
}
```

### 4.2 Interactive Modal in Next.js Frontend
In `web/app/page.tsx`, the **300 Reference Library Modal** provides:
- Category filter buttons: `All (300)`, `LoFi (100)`, `Anime (100)`, `Pixar (100)`.
- Real-time keyword search by title or tags (`rain`, `coffee`, `train`, `stars`).
- Responsive image grid with lazy-loading thumbnails.
- Single-click action: Clicking any card sets it as the active scene in the Studio Monitor and injects its path into the generation payload (`reference_repo/{category}/{filename}`).
