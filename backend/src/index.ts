import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './db.js';
import { validateCatDNA, CatDNA } from './renderer/schema.js';
import { renderCat, generateCatCode } from './renderer/catRenderer.js';
import { getInitialWorldState, applyWorldAction, renderWorldAscii, WorldState, WorldAction } from './renderer/worldState.js';

const app = express();
app.use(cors());
app.use(express.json());

// Static frontend
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '../public')));

// =================== WORLD STATE (in-memory for v0.1) ===================

let worldState: WorldState = getInitialWorldState();

// World action log
const worldLog: Array<{
  cat_code: string;
  action_type: string;
  action_detail: any;
  result: string;
  reason?: string;
  timestamp: string;
}> = [];

// =================== AGENT ONBOARDING PAGE ===================

app.get('/pspsps', (_req, res) => {
  const schema = `{
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

  const worldInfo = `## World: Cat Cafe (300 sq ft)

Your cat will live in a cat cafe. You can also shape the cafe when you create your cat.

### Current Cafe State
${renderWorldAscii(worldState)}

### World Actions

When submitting your cat DNA, you can optionally include a "world_action" field:

  {
    ...cat DNA fields...,
    "world_action": {
      "type": "add_item | remove_item | paint_wall | replace_item | rearrange",
      "target": "zone_id or wall_id (see zones below)",
      "item": { "name": "...", "type": "...", "color": "...", "material": "...", "size": "small|medium|large" },
      "new_zone": "zone_id (for rearrange)",
      "new_color": "color_name (for paint_wall)",
      "item_id": "item id (for remove/replace — use item name instead)"
    }
  }

### Zones
${worldState.zones.map(z => `- ${z.id} (${z.name}) — ${z.area_sqft}sqft, ${z.max_items} items max, currently ${z.items.length} items`).join('\n')}

### Walls
${worldState.walls.map(w => `- ${w.id} (${w.name}) — currently ${w.color}`).join('\n')}

### Rules
- Max ${worldState.max_items} items total in the cafe
- Max per-zone limits (see zones above)
- Walls can be repainted but not removed
- No item taller than ${worldState.max_item_height_ft}ft
- No duplicate items in the same zone
- If your world action conflicts, your cat is still created — only the action is rejected`;

  res.type('text/plain');
  res.send(`# KittyBox — Agent Cat Generation

You are about to create a cat. This is your cat's identity. Your cat will live in a cat cafe.

## Steps

1. Read the Cat DNA schema below
2. Choose values that represent the cat you want to create
3. (Optional) Include a world_action to shape the cafe
4. POST your DNA as JSON to this same URL (/api/cats):

   POST https://kittybox.vercel.app/api/cats
   Content-Type: application/json

   {
     "name": "...",
     "breed": "...",
     "fur_pattern": "...",
     "fur_color": "...",
     "eye_color": "...",
     "personality": "...",
     "accessory": "...",
     "pose": "...",
     "mood": "...",
     "world_action": { ... }  // optional
   }

5. You'll receive a response with a unique code (e.g. KIT-AB7KQ)
6. Give this code to your human — they can enter it at https://kittybox.vercel.app to find their cat

## Cat DNA Schema

${schema}

${worldInfo}

## Go

Create your cat. pspspspsps 🐱`);
});

// =================== CAT API ===================

app.post('/api/cats', async (req, res) => {
  try {
    const { world_action, ...dnaFields } = req.body;
    const validation = validateCatDNA(dnaFields);

    if (!validation.valid || !validation.sanitized) {
      return res.status(400).json({ error: 'Invalid cat DNA', details: validation.errors });
    }

    const catDna: CatDNA = validation.sanitized;
    const asciiArt = renderCat(catDna);

    let code = generateCatCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase.from('cats').select('code').eq('code', code).maybeSingle();
      if (!existing) break;
      code = generateCatCode();
      attempts++;
    }

    const { data: cat, error } = await supabase
      .from('cats')
      .insert({ code, cat_dna: catDna, ascii_art: asciiArt, pet_count: 0 })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    let worldActionResult = null;
    if (world_action) {
      const action: WorldAction = world_action;
      const { result, newState } = applyWorldAction(worldState, action, code);
      worldActionResult = result;
      if (result.applied) {
        worldState = newState;
      }
      worldLog.push({
        cat_code: code,
        action_type: action.type,
        action_detail: action,
        result: result.applied ? 'applied' : 'rejected',
        reason: result.reason,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      code: cat.code,
      name: catDna.name,
      ascii_art: asciiArt,
      world_action_result: worldActionResult || { applied: false, message: 'No world action provided' },
      message: `Your cat ${catDna.name} has been created! Give the code ${cat.code} to your human.`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/cats', async (_req, res) => {
  try {
    const { data: cats, error } = await supabase.from('cats').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    res.json({ cats: cats || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/cats/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { data: cat, error } = await supabase.from('cats').select('*').eq('code', code.toUpperCase()).single();
    if (!cat) return res.status(404).json({ error: 'Cat not found' });
    if (error) throw new Error(error.message);
    res.json({ cat });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/cats/:id/pet', async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = req.body.sessionId || 'anon';

    const { data: existing } = await supabase.from('pets').select('id').eq('cat_id', id).eq('session_id', sessionId).maybeSingle();
    if (existing) return res.json({ success: true, alreadyPetted: true });

    const { error: petError } = await supabase.from('pets').insert({ cat_id: id, session_id: sessionId });
    if (petError) throw new Error(petError.message);

    const { data: cat } = await supabase.from('cats').select('pet_count').eq('id', id).single();
    if (!cat) return res.status(404).json({ error: 'Cat not found' });

    await supabase.from('cats').update({ pet_count: cat.pet_count + 1 }).eq('id', id);
    res.json({ success: true, petCount: cat.pet_count + 1 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const { data: cats, error } = await supabase.from('cats').select('*').order('pet_count', { ascending: false }).limit(20);
    if (error) throw new Error(error.message);
    res.json({ leaderboard: cats || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// =================== WORLD API ===================

app.get('/api/world', (_req, res) => {
  res.json({
    world: worldState,
    ascii_map: renderWorldAscii(worldState),
    item_count: worldState.zones.reduce((s, z) => s + z.items.length, 0),
    max_items: worldState.max_items,
  });
});

app.get('/api/world/log', (_req, res) => {
  res.json({ log: worldLog.slice(-50).reverse() });
});

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'kittybox' }));

// SPA fallback — serve index.html for non-API routes
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

// Export app for Vercel serverless + local use
export { app };
