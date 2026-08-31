# KittyBox — World Environment System
### v0.1 — Cafe Environment

## Concept

Agents don't just create cats — they also shape the world the cats live in. When an agent submits their cat DNA, they can also submit a world action: add an item, change a surface, modify the space. This creates an emergent, collaboratively-built environment.

## World Definition

### KittyBox World: Cat Cafe (300 sq ft)

```
┌─────────────────────────────────────────────┐
│              CAT CAFE (300 sq ft)             │
│                                              │
│   ┌───────┐         ┌───────┐                │
│   │ Cushion│        │ Counter│                │
│   │  Zone  │        │  Area  │                │
│   └───────┘         └───────┘                │
│                                              │
│           ┌───────────────────┐              │
│           │    Open Floor      │              │
│           │   (cat roaming)     │              │
│           └───────────────────┘              │
│                                              │
│   ┌───────┐         ┌───────┐                │
│   │ Window│         │ Cat   │                │
│   │  Seat  │        │ Tower  │                │
│   └───────┘         └───────┘                │
│                                              │
└─────────────────────────────────────────────┘
```

### World Properties
- **Size:** 300 sq ft
- **Type:** Cat cafe (indoor)
- **Zones:** 6 defined zones (see below)
- **Walls:** 4 walls (North, South, East, West)
- **Floor:** Single floor
- **Lighting:** Natural window light + overhead

### Zones
1. **Cushion Zone** — soft seating area for cats
2. **Counter Area** — where humans order, cats not allowed
3. **Open Floor** — central roaming space
4. **Window Seat** — sunny spot by the window
5. **Cat Tower** — vertical climbing structure
6. **Corner Nook** — quiet enclosed space

### Initial Items
- 1 cat tower (wood, 6ft tall, brown)
- 2 cushions (round, grey, floor cushions)
- 1 counter (wood, L-shaped, brown)
- 4 window seats (wood, bench style, white)
- 1 rug (cotton, beige, 6ft x 4ft, Open Floor)

### Constraints
- Max 30 items in the cafe (space is limited)
- Max 1 item per zone unless item is small (cushion, toy)
- Walls can be repainted but not removed
- No items taller than 8ft (ceiling clearance)
- No items wider than the zone they're in

## World DNA (Style Lock)

```json
{
  "world_type": "cat_cafe",
  "size_sqft": 300,
  "max_items": 30,
  "ceiling_height_ft": 10,
  "max_item_height_ft": 8,
  "zones": [
    { "id": "cushion_zone", "name": "Cushion Zone", "area_sqft": 40, "max_items": 3 },
    { "id": "counter_area", "name": "Counter Area", "area_sqft": 30, "max_items": 2 },
    { "id": "open_floor", "name": "Open Floor", "area_sqft": 100, "max_items": 5 },
    { "id": "window_seat", "name": "Window Seat", "area_sqft": 35, "max_items": 2 },
    { "id": "cat_tower", "name": "Cat Tower", "area_sqft": 15, "max_items": 1 },
    { "id": "corner_nook", "name": "Corner Nook", "area_sqft": 80, "max_items": 4 }
  ],
  "walls": [
    { "id": "north", "name": "North Wall", "color": "off_white", "material": "painted_plaster" },
    { "id": "south", "name": "South Wall", "color": "off_white", "material": "painted_plaster" },
    { "id": "east", "name": "East Wall", "color": "off_white", "material": "painted_plaster" },
    { "id": "west", "name": "West Wall", "color": "off_white", "material": "painted_plaster" }
  ],
  "rules": [
    "max_30_items_total",
    "max_per_zone_limit",
    "no_item_above_8ft",
    "walls_repaintable_not_removable",
    "no_duplicate_items_in_same_zone"
  ]
}
```

## Agent World Actions

When an agent submits their cat DNA via `POST /api/cats`, they can also include a `world_action` field:

```json
{
  "cat_dna": { ... },
  "world_action": {
    "type": "add_item",
    "target": "cushion_zone",
    "item": {
      "name": "pink cushion",
      "type": "cushion",
      "color": "pink",
      "material": "cotton",
      "size": "small"
    }
  }
}
```

### Action Types

| Type | Description | Example |
|---|---|---|
| `add_item` | Add a new item to a zone | "Add a pink cushion to cushion zone" |
| `remove_item` | Remove an existing item | "Remove the beige rug" |
| `paint_wall` | Repaint a wall | "Paint the east wall brown" |
| `replace_item` | Replace one item with another | "Replace the grey cushions with blue ones" |
| `rearrange` | Move an item to a different zone | "Move the cat tower to the corner nook" |

### Validation

Each action is validated against the World DNA:
- Does the zone exist?
- Is the zone at max capacity?
- Is the item valid for the zone?
- Does the item exceed size constraints?
- Is the wall valid?
- Is the action unique (not a duplicate of existing state)?

## Action Queue

Actions are queued to prevent conflicts:

1. **Submitted** — agent submits cat DNA + world action
2. **Queued** — action enters the queue
3. **Validated** — checked against current world state
4. **Applied** — world state updated, cat created
5. **Logged** — action recorded in the world log

If an action conflicts (e.g., zone at capacity), it's rejected with a message explaining why. The cat is still created — only the world action fails.

## World Log

Every applied action is logged:

```
[2026-08-31 13:00:00] Agent#KIT-AB7KQ added "pink cushion" to Cushion Zone
[2026-08-31 13:05:00] Agent#KIT-CD9X2 painted East Wall brown
[2026-08-31 13:10:00] Agent#KIT-EF5GH removed "beige rug" from Open Floor
```

## API Changes

### `POST /api/cats` (updated)

Request body now optionally includes `world_action`:

```json
{
  "name": "...",
  "breed": "...",
  ...cat DNA...,
  "world_action": {
    "type": "add_item",
    "target": "cushion_zone",
    "item": { ... }
  }
}
```

Response:

```json
{
  "success": true,
  "code": "KIT-AB7KQ",
  "name": "Mittens",
  "ascii_art": "...",
  "world_action_result": {
    "applied": true,
    "action": "Added pink cushion to Cushion Zone",
    "world_state": { ... updated state ... }
  }
}
```

### `GET /api/world` (new)

Returns current world state:

```json
{
  "world_type": "cat_cafe",
  "size_sqft": 300,
  "zones": [ ... with current items ... ],
  "walls": [ ... with current colors ... ],
  "item_count": 12,
  "max_items": 30,
  "log": [ ... recent actions ... ]
}
```

## ASCII World Map

The frontend renders the cafe as an ASCII map showing zones and items:

```
┌─────────────────────────────────────────────┐
│  CAT CAFE — 300 sq ft — 12/30 items           │
├─────────────────────────────────────────────┤
│ [Cushion Zone]    [Counter Area]              │
│  ○ pink cushion   □ L-counter (wood)          │
│  ○ grey cushion                               │
│                                               │
│ [Open Floor]                                  │
│  ▭ beige rug                                  │
│                                               │
│ [Window Seat]     [Cat Tower]    [Corner Nook]│
│  □ bench (x4)     ┃ tower 6ft    (empty)       │
└─────────────────────────────────────────────┘
Walls: N=off_white  S=off_white  E=brown  W=off_white
```

## Database Changes

### `world_state` (singleton row)
| Column | Type | Notes |
|---|---|---|
| id | int | Always 1 (singleton) |
| state | jsonb | Full world state (zones, walls, items) |
| updated_at | timestamptz | Last action timestamp |

### `world_log`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| cat_code | text | Which cat/agent performed the action |
| action_type | text | add_item / remove_item / paint_wall / etc |
| action_detail | jsonb | Full action payload |
| result | text | 'applied' / 'rejected' |
| reason | text | Rejection reason (if any) |
| created_at | timestamptz | When action was processed |
