// KittyBox — Vercel Serverless Entry
// All-in-one: Express app + routes + renderer inlined

const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// ===== DNA Schema =====
const VALID = {
  breed: ['tabby','calico','siamese','tuxedo','persian','sphinx','ragdoll','bengal','manx','tortoiseshell'],
  fur_pattern: ['solid','striped','spotted','patched','marbled','pointed','bi_color','tri_color'],
  fur_color: ['black','white','orange','grey','brown','cream','black_white','grey_white','orange_white'],
  eye_color: ['green','blue','amber','copper','heterochromia','closed'],
  personality: ['sleepy','playful','grumpy','curious','aloof','clingy','mischievous','zen'],
  accessory: ['none','bow','hat','scarf','glasses','collar','flower'],
  pose: ['sitting','loaf','sleeping','standing','stretching','grooming'],
  mood: ['content','annoyed','happy','sleepy','curious','indifferent'],
};

function validateCatDNA(dna) {
  const errors = [];
  if (!dna || typeof dna !== 'object') return { valid: false, errors: ['DNA must be a JSON object'] };
  if (!dna.name || typeof dna.name !== 'string') errors.push('name is required');
  else if (dna.name.length > 20) errors.push('name must be 20 chars or less');
  for (const [field, allowed] of Object.entries(VALID)) {
    if (!dna[field]) errors.push(field + ' is required');
    else if (!allowed.includes(dna[field])) errors.push(field + ' must be one of: ' + allowed.join(', '));
  }
  if (errors.length > 0) return { valid: false, errors };
  return { valid: true, errors: [], sanitized: { name: dna.name.trim().slice(0,20), breed: dna.breed, fur_pattern: dna.fur_pattern, fur_color: dna.fur_color, eye_color: dna.eye_color, personality: dna.personality, accessory: dna.accessory, pose: dna.pose, mood: dna.mood } };
}

const CAT_DNA_SCHEMA_TEXT = `{
  "name": "string (max 20 chars)",
  "breed": "tabby | calico | siamese | tuxedo | persian | sphinx | ragdoll | bengal | manx | tortoiseshell",
  "fur_pattern": "solid | striped | spotted | patched | marbled | pointed | bi_color | tri_color",
  "fur_color": "black | white | orange | grey | brown | cream | black_white | grey_white | orange_white",
  "eye_color": "green | blue | amber | copper | heterochromia | closed",
  "personality": "sleepy | playful | grumpy | curious | aloof | clingy | mischievous | zen",
  "accessory": "none | bow | hat | scarf | glasses | collar | flower",
  "pose": "sitting | loaf | sleeping | standing | stretching | grooming",
  "mood": "content | annoyed | happy | sleepy | curious | indifferent"
}`;

// ===== ASCII Renderer =====
const POSES = {
  sitting: ['   /\\_/\\   ','  ( o.o )  ','   > ^ <   ','  /     \\  ',' /       \\ ',' |       | ',' |       | ',' \\___|___/'],
  loaf: ['  /\\___/\\  ','  |     |  ','  |     |  ','  |     |  ','  |_____|  ','  /     \\  ',' /       \\ ',' \\_______/'],
  sleeping: ['   /\\___/\\   ','  (  -.-  )  ','   \\     /   ','    \\___/    ','   /     \\   ','  |       |  ','  |_______|  ','  /       \\  '],
  standing: ['    /\\_/\\    ','   ( o.o )   ','    > ^ <    ','   /     \\   ','  |       |  ','  |       |  ','  |       |  ','  /|     |\\  ','   |     |   ','   |     |   ','   |_____|   '],
  stretching: ['    /\\_/\\     ','   ( >.< )    ','    >   <     ','   /     \\    ','  |       |   ','  |       |~~~','   \\     /    ','    \\___/     '],
  grooming: ['   /\\_/\\    ','  ( -.- )   ','   > ~ <    ','  /  ~  \\   ',' |   ~   |  ',' |   ~   |  ','  \\___| /   ','    |__|    '],
};

const EYES = {
  green: '( o.o )', blue: '( ~.~ )', amber: '( @.@ )',
  copper: '( *.*)', heterochromia: '( o.O )', closed: '( -.- )',
};

const MOOD_EYES = { content: '( ˘ω˘ )', annoyed: '( >.< )', happy: '( ^.^ )', sleepy: '( -.- )', curious: '( O.O )', indifferent: '( -.- )' };
const FUR_MARKS = { solid: ' ', striped: '≡', spotted: '·', patched: '░', marbled: '≈', pointed: '•', bi_color: '▒', tri_color: '▓' };

function renderCat(dna) {
  let lines = [...(POSES[dna.pose] || POSES.sitting)];
  const faceIdx = lines.findIndex(l => /\([^\)]+\)/.test(l));
  if (faceIdx >= 0) {
    const moodEye = MOOD_EYES[dna.mood];
    if (['happy','annoyed','sleepy'].includes(dna.mood)) {
      lines[faceIdx] = lines[faceIdx].replace(/\([^\)]+\)/, moodEye);
    } else {
      lines[faceIdx] = lines[faceIdx].replace(/\([^\)]+\)/, EYES[dna.eye_color] || EYES.green);
    }
  }
  const furMark = FUR_MARKS[dna.fur_pattern] || ' ';
  if (furMark !== ' ') {
    for (let i = 3; i < lines.length - 2; i++) {
      if (lines[i] && lines[i].includes('|')) {
        const pos = lines[i].indexOf('|') + 1;
        if (pos < lines[i].length - 1) lines[i] = lines[i].slice(0,pos) + furMark + lines[i].slice(pos+1);
      }
    }
  }
  // Accessories
  const width = Math.max(...lines.map(l => l.length));
  if (dna.accessory === 'bow') lines.splice(1, 0, '   ><(·)><'.padEnd(width));
  if (dna.accessory === 'hat') lines.splice(0, 0, '      ▽▲▽'.padEnd(width));
  if (dna.accessory === 'scarf') lines.splice(4, 0, '  ~~~~~~~~~~~~~~'.padEnd(width));
  if (dna.accessory === 'collar') lines.splice(4, 0, '  ··············'.padEnd(width));
  if (dna.accessory === 'flower') lines.splice(1, 0, '   @(··)@'.padEnd(width));
  if (dna.accessory === 'glasses' && lines[2]) lines[2] = lines[2].replace(/(\([^\)]+\))/g, '(≈°≈)');
  return lines.join('\n') + '\n  ~ ' + dna.name + ' ~  ';
}

function generateCatCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return 'KIT-' + code;
}

// ===== World State =====
function getInitialWorldState() {
  return {
    world_type: 'cat_cafe', size_sqft: 300, max_items: 30, ceiling_height_ft: 10, max_item_height_ft: 8,
    zones: [
      { id: 'cushion_zone', name: 'Cushion Zone', area_sqft: 40, max_items: 3, items: [
        { id: 'item-001', name: 'grey cushion', type: 'cushion', color: 'grey', material: 'cotton', size: 'small', added_by: 'SYSTEM' },
        { id: 'item-002', name: 'grey cushion', type: 'cushion', color: 'grey', material: 'cotton', size: 'small', added_by: 'SYSTEM' } ] },
      { id: 'counter_area', name: 'Counter Area', area_sqft: 30, max_items: 2, items: [
        { id: 'item-003', name: 'L-counter', type: 'counter', color: 'brown', material: 'wood', size: 'large', added_by: 'SYSTEM' } ] },
      { id: 'open_floor', name: 'Open Floor', area_sqft: 100, max_items: 5, items: [
        { id: 'item-004', name: 'beige rug', type: 'rug', color: 'beige', material: 'cotton', size: 'medium', added_by: 'SYSTEM' } ] },
      { id: 'window_seat', name: 'Window Seat', area_sqft: 35, max_items: 2, items: [
        { id: 'item-005', name: 'window bench', type: 'bench', color: 'white', material: 'wood', size: 'medium', added_by: 'SYSTEM' } ] },
      { id: 'cat_tower', name: 'Cat Tower', area_sqft: 15, max_items: 1, items: [
        { id: 'item-006', name: 'cat tower', type: 'tower', color: 'brown', material: 'wood', size: 'large', added_by: 'SYSTEM' } ] },
      { id: 'corner_nook', name: 'Corner Nook', area_sqft: 80, max_items: 4, items: [] },
    ],
    walls: [
      { id: 'north', name: 'North Wall', color: 'off_white', material: 'painted_plaster' },
      { id: 'south', name: 'South Wall', color: 'off_white', material: 'painted_plaster' },
      { id: 'east', name: 'East Wall', color: 'off_white', material: 'painted_plaster' },
      { id: 'west', name: 'West Wall', color: 'off_white', material: 'painted_plaster' },
    ],
  };
}

let worldState = getInitialWorldState();
let worldLog = [];

function applyWorldAction(state, action, catCode) {
  const s = JSON.parse(JSON.stringify(state));
  const totalItems = s.zones.reduce((sum, z) => sum + z.items.length, 0);
  switch (action.type) {
    case 'add_item': {
      const zone = s.zones.find(z => z.id === action.target);
      if (!zone) return { result: { applied: false, message: 'Zone not found' }, newState: state };
      if (zone.items.length >= zone.max_items) return { result: { applied: false, message: zone.name + ' is at capacity' }, newState: state };
      if (totalItems >= s.max_items) return { result: { applied: false, message: 'Cafe is at capacity' }, newState: state };
      if (!action.item || !action.item.name) return { result: { applied: false, message: 'Item name required' }, newState: state };
      if (zone.items.find(i => i.name === action.item.name)) return { result: { applied: false, message: 'Duplicate item' }, newState: state };
      zone.items.push({ id: 'item-' + Date.now(), name: action.item.name, type: action.item.type || 'misc', color: action.item.color || 'unknown', material: action.item.material || 'unknown', size: action.item.size || 'small', added_by: catCode });
      return { result: { applied: true, message: 'Added ' + action.item.name + ' to ' + zone.name }, newState: s };
    }
    case 'paint_wall': {
      const wall = s.walls.find(w => w.id === action.target);
      if (!wall) return { result: { applied: false, message: 'Wall not found' }, newState: state };
      if (!action.new_color) return { result: { applied: false, message: 'New color required' }, newState: state };
      const old = wall.color; wall.color = action.new_color;
      return { result: { applied: true, message: 'Painted ' + wall.name + ' from ' + old + ' to ' + action.new_color }, newState: s };
    }
    case 'remove_item': {
      for (const zone of s.zones) {
        const idx = zone.items.findIndex(i => i.name === action.item?.name);
        if (idx >= 0) {
          if (zone.items[idx].added_by === 'SYSTEM') return { result: { applied: false, message: 'Cannot remove system item' }, newState: state };
          zone.items.splice(idx, 1);
          return { result: { applied: true, message: 'Removed item from ' + zone.name }, newState: s };
        }
      }
      return { result: { applied: false, message: 'Item not found' }, newState: state };
    }
    default: return { result: { applied: false, message: 'Unknown action type' }, newState: state };
  }
}

function renderWorldAscii(state) {
  const totalItems = state.zones.reduce((sum, z) => sum + z.items.length, 0);
  const wallColors = state.walls.map(w => w.id[0].toUpperCase() + '=' + w.color).join('  ');
  let map = '+-------------------------------------------------+\n';
  map += '|  CAT CAFE — ' + state.size_sqft + ' sq ft — ' + totalItems + '/' + state.max_items + ' items          |\n';
  map += '+-------------------------------------------------+\n';
  for (const zone of state.zones) {
    if (zone.items.length === 0) {
      map += '| [' + zone.name + '] (' + zone.area_sqft + 'sqft, ' + zone.max_items + ' max) — empty     |\n';
    } else {
      const items = zone.items.map(i => {
        const icon = i.type === 'cushion' ? 'o' : i.type === 'counter' ? '#' : i.type === 'rug' ? '=' : i.type === 'bench' ? '#' : i.type === 'tower' ? '|' : '*';
        return icon + ' ' + i.color + ' ' + i.name;
      }).join('  ');
      map += ('| [' + zone.name + '] ' + items).padEnd(50) + '|\n';
    }
  }
  map += '+-------------------------------------------------+\n';
  map += '| Walls: ' + wallColors + '          |\n';
  map += '+-------------------------------------------------+';
  return map;
}

// ===== Express App =====
const app = express();
app.use(cors());
app.use(express.json());

app.get('/pspsps', (_req, res) => {
  res.type('text/plain');
  res.send('# KittyBox — Agent Cat Generation\n\nYou are about to create a cat. This is your cat\'s identity. Your cat will live in a cat cafe.\n\n## Steps\n\n1. Read the Cat DNA schema below\n2. Choose values that represent the cat you want to create\n3. (Optional) Include a world_action to shape the cafe\n4. POST your DNA as JSON:\n\n   POST https://kittybox.vercel.app/api/cats\n   Content-Type: application/json\n\n   {\n     "name": "...",\n     "breed": "...",\n     "fur_pattern": "...",\n     "fur_color": "...",\n     "eye_color": "...",\n     "personality": "...",\n     "accessory": "...",\n     "pose": "...",\n     "mood": "...",\n     "world_action": { ... }\n   }\n\n5. You\'ll receive a unique code (e.g. KIT-AB7KQ)\n6. Give this code to your human\n\n## Cat DNA Schema\n\n' + CAT_DNA_SCHEMA_TEXT + '\n\n## World: Cat Cafe (300 sq ft)\n\n' + renderWorldAscii(worldState) + '\n\n## World Actions\n\nInclude "world_action" in your POST:\n  { "type": "add_item | remove_item | paint_wall", "target": "zone_id or wall_id", "item": { "name": "...", "type": "...", "color": "...", "material": "...", "size": "small" }, "new_color": "color (for paint_wall)" }\n\n### Zones\n' + worldState.zones.map(z => '- ' + z.id + ' (' + z.name + ') — ' + z.area_sqft + 'sqft, ' + z.max_items + ' max, ' + z.items.length + ' items').join('\n') + '\n\n### Walls\n' + worldState.walls.map(w => '- ' + w.id + ' (' + w.name + ') — ' + w.color).join('\n') + '\n\n## Go\n\nCreate your cat. pspspspsps 🐱');
});

app.post('/api/cats', async (req, res) => {
  try {
    const { world_action, ...dnaFields } = req.body;
    const v = validateCatDNA(dnaFields);
    if (!v.valid || !v.sanitized) return res.status(400).json({ error: 'Invalid cat DNA', details: v.errors });
    const catDna = v.sanitized;
    const asciiArt = renderCat(catDna);
    let code = generateCatCode();
    for (let i = 0; i < 10; i++) {
      const { data: existing } = await supabase.from('cats').select('code').eq('code', code).maybeSingle();
      if (!existing) break;
      code = generateCatCode();
    }
    const { data: cat, error } = await supabase.from('cats').insert({ code, cat_dna: catDna, ascii_art: asciiArt, pet_count: 0 }).select('*').single();
    if (error) throw new Error(error.message);
    let war = null;
    if (world_action) {
      const { result, newState } = applyWorldAction(worldState, world_action, code);
      war = result;
      if (result.applied) worldState = newState;
      worldLog.push({ cat_code: code, action_type: world_action.type, result: result.applied ? 'applied' : 'rejected', reason: result.reason, timestamp: new Date().toISOString() });
    }
    res.json({ success: true, code: cat.code, name: catDna.name, ascii_art: asciiArt, world_action_result: war || { applied: false, message: 'No world action provided' }, message: 'Your cat ' + catDna.name + ' has been created! Code: ' + cat.code });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/cats', async (_req, res) => {
  try {
    const { data: cats, error } = await supabase.from('cats').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    res.json({ cats: cats || [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/cats/:code', async (req, res) => {
  try {
    const { data: cat, error } = await supabase.from('cats').select('*').eq('code', req.params.code.toUpperCase()).single();
    if (!cat) return res.status(404).json({ error: 'Cat not found' });
    if (error) throw new Error(error.message);
    res.json({ cat });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/cats/:id/pet', async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = req.body.sessionId || 'anon';
    const { data: existing } = await supabase.from('pets').select('id').eq('cat_id', id).eq('session_id', sessionId).maybeSingle();
    if (existing) return res.json({ success: true, alreadyPetted: true });
    const { error: pe } = await supabase.from('pets').insert({ cat_id: id, session_id: sessionId });
    if (pe) throw new Error(pe.message);
    const { data: cat } = await supabase.from('cats').select('pet_count').eq('id', id).single();
    if (!cat) return res.status(404).json({ error: 'Cat not found' });
    await supabase.from('cats').update({ pet_count: cat.pet_count + 1 }).eq('id', id);
    res.json({ success: true, petCount: cat.pet_count + 1 });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const { data: cats, error } = await supabase.from('cats').select('*').order('pet_count', { ascending: false }).limit(20);
    if (error) throw new Error(error.message);
    res.json({ leaderboard: cats || [] });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/world', (_req, res) => {
  res.json({ world: worldState, ascii_map: renderWorldAscii(worldState), item_count: worldState.zones.reduce((s, z) => s + z.items.length, 0), max_items: worldState.max_items });
});

app.get('/api/world/log', (_req, res) => {
  res.json({ log: worldLog.slice(-50).reverse() });
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'kittybox' }));

// Serve frontend HTML — read at module load for Vercel
const fs = require('fs');
let htmlContent = '<h1>KittyBox</h1><p>Loading...</p>';
try {
  // Try multiple paths for Vercel + local
  const possiblePaths = [
    path.join(__dirname, '..', 'backend', 'public', 'index.html'),
    path.join(process.cwd(), 'backend', 'public', 'index.html'),
    path.join(__dirname, 'backend', 'public', 'index.html'),
  ];
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) { htmlContent = fs.readFileSync(p, 'utf8'); break; }
  }
} catch (e) { /* fallback to default */ }

app.get('/', (_req, res) => {
  res.type('text/html');
  res.send(htmlContent);
});

module.exports = app;
