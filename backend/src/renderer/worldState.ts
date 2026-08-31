// KittyBox — World Environment System
// Cat Cafe: 300 sq ft, 6 zones, 4 walls
// ============================================

export interface WorldZone {
  id: string;
  name: string;
  area_sqft: number;
  max_items: number;
  items: WorldItem[];
}

export interface WorldItem {
  id: string;
  name: string;
  type: string;
  color: string;
  material: string;
  size: 'small' | 'medium' | 'large';
  added_by: string; // cat code
}

export interface WorldWall {
  id: string;
  name: string;
  color: string;
  material: string;
}

export interface WorldState {
  world_type: string;
  size_sqft: number;
  max_items: number;
  ceiling_height_ft: number;
  max_item_height_ft: number;
  zones: WorldZone[];
  walls: WorldWall[];
}

export interface WorldAction {
  type: 'add_item' | 'remove_item' | 'paint_wall' | 'replace_item' | 'rearrange';
  target: string; // zone id or wall id
  item?: Partial<WorldItem>;
  item_id?: string; // for remove/replace
  new_zone?: string; // for rearrange
  new_color?: string; // for paint_wall
}

export interface WorldActionResult {
  applied: boolean;
  message: string;
  reason?: string;
}

// --- Initial World State ---

export function getInitialWorldState(): WorldState {
  return {
    world_type: 'cat_cafe',
    size_sqft: 300,
    max_items: 30,
    ceiling_height_ft: 10,
    max_item_height_ft: 8,
    zones: [
      {
        id: 'cushion_zone', name: 'Cushion Zone', area_sqft: 40, max_items: 3,
        items: [
          { id: 'item-001', name: 'grey cushion', type: 'cushion', color: 'grey', material: 'cotton', size: 'small', added_by: 'SYSTEM' },
          { id: 'item-002', name: 'grey cushion', type: 'cushion', color: 'grey', material: 'cotton', size: 'small', added_by: 'SYSTEM' },
        ],
      },
      {
        id: 'counter_area', name: 'Counter Area', area_sqft: 30, max_items: 2,
        items: [
          { id: 'item-003', name: 'L-counter', type: 'counter', color: 'brown', material: 'wood', size: 'large', added_by: 'SYSTEM' },
        ],
      },
      {
        id: 'open_floor', name: 'Open Floor', area_sqft: 100, max_items: 5,
        items: [
          { id: 'item-004', name: 'beige rug', type: 'rug', color: 'beige', material: 'cotton', size: 'medium', added_by: 'SYSTEM' },
        ],
      },
      {
        id: 'window_seat', name: 'Window Seat', area_sqft: 35, max_items: 2,
        items: [
          { id: 'item-005', name: 'window bench', type: 'bench', color: 'white', material: 'wood', size: 'medium', added_by: 'SYSTEM' },
          { id: 'item-006', name: 'window bench', type: 'bench', color: 'white', material: 'wood', size: 'medium', added_by: 'SYSTEM' },
          { id: 'item-007', name: 'window bench', type: 'bench', color: 'white', material: 'wood', size: 'medium', added_by: 'SYSTEM' },
          { id: 'item-008', name: 'window bench', type: 'bench', color: 'white', material: 'wood', size: 'medium', added_by: 'SYSTEM' },
        ],
      },
      {
        id: 'cat_tower', name: 'Cat Tower', area_sqft: 15, max_items: 1,
        items: [
          { id: 'item-009', name: 'cat tower', type: 'tower', color: 'brown', material: 'wood', size: 'large', added_by: 'SYSTEM' },
        ],
      },
      {
        id: 'corner_nook', name: 'Corner Nook', area_sqft: 80, max_items: 4,
        items: [],
      },
    ],
    walls: [
      { id: 'north', name: 'North Wall', color: 'off_white', material: 'painted_plaster' },
      { id: 'south', name: 'South Wall', color: 'off_white', material: 'painted_plaster' },
      { id: 'east', name: 'East Wall', color: 'off_white', material: 'painted_plaster' },
      { id: 'west', name: 'West Wall', color: 'off_white', material: 'painted_plaster' },
    ],
  };
}

// --- Action Validation & Application ---

export function applyWorldAction(state: WorldState, action: WorldAction, catCode: string): { result: WorldActionResult; newState: WorldState } {
  const stateCopy: WorldState = JSON.parse(JSON.stringify(state));

  // Count total items
  const totalItems = stateCopy.zones.reduce((sum, z) => sum + z.items.length, 0);

  switch (action.type) {
    case 'add_item': {
      // Find target zone
      const zone = stateCopy.zones.find(z => z.id === action.target);
      if (!zone) {
        return { result: { applied: false, message: `Zone "${action.target}" not found`, reason: 'invalid_zone' }, newState: state };
      }
      // Check zone capacity
      if (zone.items.length >= zone.max_items) {
        return { result: { applied: false, message: `${zone.name} is at capacity (${zone.max_items} items max)`, reason: 'zone_full' }, newState: state };
      }
      // Check global capacity
      if (totalItems >= stateCopy.max_items) {
        return { result: { applied: false, message: `Cafe is at capacity (${stateCopy.max_items} items max)`, reason: 'world_full' }, newState: state };
      }
      // Validate item
      if (!action.item || !action.item.name) {
        return { result: { applied: false, message: 'Item name is required', reason: 'invalid_item' }, newState: state };
      }
      // Check for duplicate in same zone
      const dup = zone.items.find(i => i.name === action.item!.name);
      if (dup) {
        return { result: { applied: false, message: `"${action.item.name}" already exists in ${zone.name}`, reason: 'duplicate' }, newState: state };
      }
      // Add item
      const newItem: WorldItem = {
        id: `item-${Date.now()}`,
        name: action.item.name,
        type: action.item.type || 'misc',
        color: action.item.color || 'unknown',
        material: action.item.material || 'unknown',
        size: action.item.size || 'small',
        added_by: catCode,
      };
      zone.items.push(newItem);
      return { result: { applied: true, message: `Added ${newItem.name} to ${zone.name}` }, newState: stateCopy };
    }

    case 'remove_item': {
      for (const zone of stateCopy.zones) {
        const idx = zone.items.findIndex(i => i.id === action.item_id || i.name === action.item?.name);
        if (idx >= 0) {
          // Don't remove system items
          if (zone.items[idx].added_by === 'SYSTEM') {
            return { result: { applied: false, message: `Cannot remove system item "${zone.items[idx].name}"`, reason: 'system_item' }, newState: state };
          }
          const removed = zone.items.splice(idx, 1)[0];
          return { result: { applied: true, message: `Removed ${removed.name} from ${zone.name}` }, newState: stateCopy };
        }
      }
      return { result: { applied: false, message: `Item not found`, reason: 'not_found' }, newState: state };
    }

    case 'paint_wall': {
      const wall = stateCopy.walls.find(w => w.id === action.target);
      if (!wall) {
        return { result: { applied: false, message: `Wall "${action.target}" not found`, reason: 'invalid_wall' }, newState: state };
      }
      if (!action.new_color) {
        return { result: { applied: false, message: 'New color is required', reason: 'invalid_action' }, newState: state };
      }
      const oldColor = wall.color;
      wall.color = action.new_color;
      return { result: { applied: true, message: `Painted ${wall.name} from ${oldColor} to ${action.new_color}` }, newState: stateCopy };
    }

    case 'replace_item': {
      for (const zone of stateCopy.zones) {
        const idx = zone.items.findIndex(i => i.id === action.item_id || i.name === action.item?.name);
        if (idx >= 0) {
          if (!action.item || !action.item.name) {
            return { result: { applied: false, message: 'Replacement item name is required', reason: 'invalid_item' }, newState: state };
          }
          zone.items[idx] = {
            ...zone.items[idx],
            name: action.item.name,
            type: action.item.type || zone.items[idx].type,
            color: action.item.color || zone.items[idx].color,
            material: action.item.material || zone.items[idx].material,
            size: action.item.size || zone.items[idx].size,
            added_by: catCode,
          };
          return { result: { applied: true, message: `Replaced with ${action.item.name} in ${zone.name}` }, newState: stateCopy };
        }
      }
      return { result: { applied: false, message: `Item not found`, reason: 'not_found' }, newState: state };
    }

    case 'rearrange': {
      // Find item in source zone
      let sourceZone: WorldZone | undefined;
      let itemIdx = -1;
      for (const zone of stateCopy.zones) {
        const idx = zone.items.findIndex(i => i.id === action.item_id || i.name === action.item?.name);
        if (idx >= 0) {
          sourceZone = zone;
          itemIdx = idx;
          break;
        }
      }
      if (!sourceZone || itemIdx < 0) {
        return { result: { applied: false, message: `Item not found`, reason: 'not_found' }, newState: state };
      }
      // Find target zone
      const targetZone = stateCopy.zones.find(z => z.id === action.new_zone);
      if (!targetZone) {
        return { result: { applied: false, message: `Target zone "${action.new_zone}" not found`, reason: 'invalid_zone' }, newState: state };
      }
      if (targetZone.items.length >= targetZone.max_items) {
        return { result: { applied: false, message: `${targetZone.name} is at capacity`, reason: 'zone_full' }, newState: state };
      }
      // Move item
      const [moved] = sourceZone.items.splice(itemIdx, 1);
      targetZone.items.push(moved);
      return { result: { applied: true, message: `Moved ${moved.name} from ${sourceZone.name} to ${targetZone.name}` }, newState: stateCopy };
    }

    default:
      return { result: { applied: false, message: `Unknown action type: ${action.type}`, reason: 'invalid_type' }, newState: state };
  }
}

// --- ASCII World Map Renderer ---

export function renderWorldAscii(state: WorldState): string {
  const totalItems = state.zones.reduce((sum, z) => sum + z.items.length, 0);
  const wallColors = state.walls.map(w => `${w.id[0].toUpperCase()}=${w.color}`).join('  ');

  let map = `┌───────────────────────────────────────────────────┐\n`;
  map += `│  CAT CAFE — ${state.size_sqft} sq ft — ${totalItems}/${state.max_items} items              │\n`;
  map += `├───────────────────────────────────────────────────┤\n`;

  for (const zone of state.zones) {
    if (zone.items.length === 0) {
      map += `│ [${zone.name}] (${zone.area_sqft}sqft, ${zone.max_items} max) — empty     │\n`;
    } else {
      const itemsList = zone.items.map(i => {
        const icon = i.type === 'cushion' ? '○' :
                     i.type === 'counter' ? '□' :
                     i.type === 'rug' ? '▭' :
                     i.type === 'bench' ? '□' :
                     i.type === 'tower' ? '┃' :
                     i.type === 'toy' ? '*' :
                     '●';
        return `${icon} ${i.color} ${i.name}`;
      }).join('  ');
      map += `│ [${zone.name}] ${itemsList}`.padEnd(54) + '│\n';
    }
  }

  map += `├───────────────────────────────────────────────────┤\n`;
  map += `│ Walls: ${wallColors}`.padEnd(54) + '│\n';
  map += `└───────────────────────────────────────────────────┘`;

  return map;
}
