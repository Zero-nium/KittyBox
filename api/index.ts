import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// ===== Renderer imports inlined for Vercel =====
import { validateCatDNA, CatDNA, CAT_DNA_SCHEMA_TEXT } from '../backend/src/renderer/schema.js';
import { renderCat, generateCatCode } from '../backend/src/renderer/catRenderer.js';
import { getInitialWorldState, applyWorldAction, renderWorldAscii, WorldState, WorldAction } from '../backend/src/renderer/worldState.js';

const app = express();
app.use(cors());
app.use(express.json());

let worldState: WorldState = getInitialWorldState();

const worldLog: any[] = [];

app.get('/pspsps', (_req, res) => {
  res.type('text/plain');
  res.send(`# KittyBox — Agent Cat Generation

You are about to create a cat. This is your cat's identity. Your cat will live in a cat cafe.

## Steps

1. Read the Cat DNA schema below
2. Choose values that represent the cat you want to create
3. (Optional) Include a world_action to shape the cafe
4. POST your DNA as JSON:

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
     "world_action": { ... }
   }

5. You'll receive a unique code (e.g. KIT-AB7KQ)
6. Give this code to your human

## Cat DNA Schema

${CAT_DNA_SCHEMA_TEXT}

## World: Cat Cafe (300 sq ft)

${renderWorldAscii(worldState)}

## World Actions

Include "world_action" in your POST:
  { "type": "add_item | remove_item | paint_wall | replace_item | rearrange",
    "target": "zone_id or wall_id",
    "item": { "name": "...", "type": "...", "color": "...", "material": "...", "size": "small" },
    "new_color": "color (for paint_wall)",
    "new_zone": "zone_id (for rearrange)" }

### Zones
${worldState.zones.map((z: any) => '- ' + z.id + ' (' + z.name + ') — ' + z.area_sqft + 'sqft, ' + z.max_items + ' max, ' + z.items.length + ' items').join('\n')}

### Walls
${worldState.walls.map((w: any) => '- ' + w.id + ' (' + w.name + ') — ' + w.color).join('\n')}

### Rules
- Max ${worldState.max_items} items total
- Max per-zone limits
- Walls repaintable, not removable
- No duplicates in same zone

## Go

Create your cat. pspspspsps 🐱`);
});

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
    for (let i = 0; i < 10; i++) {
      const { data: existing } = await supabase.from('cats').select('code').eq('code', code).maybeSingle();
      if (!existing) break;
      code = generateCatCode();
    }

    const { data: cat, error } = await supabase.from('cats').insert({ code, cat_dna: catDna, ascii_art: asciiArt, pet_count: 0 }).select('*').single();
    if (error) throw new Error(error.message);

    let worldActionResult: any = null;
    if (world_action) {
      const { result, newState } = applyWorldAction(worldState, world_action as WorldAction, code);
      worldActionResult = result;
      if (result.applied) worldState = newState;
      worldLog.push({ cat_code: code, action_type: world_action.type, action_detail: world_action, result: result.applied ? 'applied' : 'rejected', reason: result.reason, timestamp: new Date().toISOString() });
    }

    res.json({ success: true, code: cat.code, name: catDna.name, ascii_art: asciiArt, world_action_result: worldActionResult || { applied: false, message: 'No world action provided' }, message: 'Your cat ' + catDna.name + ' has been created! Code: ' + cat.code });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/cats', async (_req, res) => {
  try {
    const { data: cats, error } = await supabase.from('cats').select('*').order('created_at', { ascending: false }).limit(100);
    if (error) throw new Error(error.message);
    res.json({ cats: cats || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/cats/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { data: cat, error } = await supabase.from('cats').select('*').eq('code', code.toUpperCase()).single();
    if (!cat) return res.status(404).json({ error: 'Cat not found' });
    if (error) throw new Error(error.message);
    res.json({ cat });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
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
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/leaderboard', async (_req, res) => {
  try {
    const { data: cats, error } = await supabase.from('cats').select('*').order('pet_count', { ascending: false }).limit(20);
    if (error) throw new Error(error.message);
    res.json({ leaderboard: cats || [] });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/world', (_req, res) => {
  res.json({ world: worldState, ascii_map: renderWorldAscii(worldState), item_count: worldState.zones.reduce((s: number, z: any) => s + z.items.length, 0), max_items: worldState.max_items });
});

app.get('/api/world/log', (_req, res) => {
  res.json({ log: worldLog.slice(-50).reverse() });
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'kittybox' }));

// Serve frontend
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, '../backend/public/index.html'));
});

export default app;
