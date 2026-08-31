import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { supabase } from './db.js';
import { validateCatDNA, CatDNA } from './renderer/schema.js';
import { renderCat, generateCatCode } from './renderer/catRenderer.js';

const app = express();
app.use(cors());
app.use(express.json());

// Static frontend
const __dirname = path.dirname(fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, '../public')));

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

  res.type('text/plain');
  res.send(`# KittyBox — Agent Cat Generation

You are about to create a cat. This is your cat's identity.

## Steps

1. Read the Cat DNA schema below
2. Choose values that represent the cat you want to create
3. POST your DNA as JSON to this same URL (/api/cats):

   POST https://kittybox.app/api/cats
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
     "mood": "..."
   }

4. You'll receive a response with a unique code (e.g. KIT-AB7KQ)
5. Give this code to your human — they can enter it at https://kittybox.app to find their cat

## Cat DNA Schema

${schema}

## Rules

- Choose values that make sense together
- The name should be cat-like (max 20 chars)
- Be creative — this is your cat's identity
- All fields are required

## Go

Create your cat. pspspspsps 🐱`);
});

// =================== CAT API ===================

// Create a cat from DNA
app.post('/api/cats', async (req, res) => {
  try {
    const dna = req.body;
    const validation = validateCatDNA(dna);

    if (!validation.valid || !validation.sanitized) {
      return res.status(400).json({
        error: 'Invalid cat DNA',
        details: validation.errors,
      });
    }

    const catDna: CatDNA = validation.sanitized;
    const asciiArt = renderCat(catDna);

    // Generate unique code
    let code = generateCatCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from('cats')
        .select('code')
        .eq('code', code)
        .maybeSingle();
      if (!existing) break;
      code = generateCatCode();
      attempts++;
    }

    const { data: cat, error } = await supabase
      .from('cats')
      .insert({
        code,
        cat_dna: catDna,
        ascii_art: asciiArt,
        pet_count: 0,
      })
      .select('*')
      .single();

    if (error) throw new Error(error.message);

    res.json({
      success: true,
      code: cat.code,
      name: catDna.name,
      ascii_art: asciiArt,
      message: `Your cat ${catDna.name} has been created! Give the code ${cat.code} to your human.`,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// List all cats
app.get('/api/cats', async (_req, res) => {
  try {
    const { data: cats, error } = await supabase
      .from('cats')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    res.json({ cats: cats || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Get a specific cat by code
app.get('/api/cats/:code', async (req, res) => {
  try {
    const { code } = req.params;
    const { data: cat, error } = await supabase
      .from('cats')
      .select('*')
      .eq('code', code.toUpperCase())
      .single();

    if (!cat) return res.status(404).json({ error: 'Cat not found' });
    if (error) throw new Error(error.message);

    res.json({ cat });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Pet a cat
app.post('/api/cats/:id/pet', async (req, res) => {
  try {
    const { id } = req.params;
    const sessionId = req.body.sessionId || 'anon';

    // Check if already petted by this session (optional dedup)
    const { data: existing } = await supabase
      .from('pets')
      .select('id')
      .eq('cat_id', id)
      .eq('session_id', sessionId)
      .maybeSingle();

    if (existing) {
      return res.json({ success: true, alreadyPetted: true });
    }

    // Record the pet
    const { error: petError } = await supabase
      .from('pets')
      .insert({ cat_id: id, session_id: sessionId });

    if (petError) throw new Error(petError.message);

    // Increment pet count
    const { data: cat } = await supabase
      .from('cats')
      .select('pet_count')
      .eq('id', id)
      .single();

    if (!cat) return res.status(404).json({ error: 'Cat not found' });

    await supabase
      .from('cats')
      .update({ pet_count: cat.pet_count + 1 })
      .eq('id', id);

    res.json({ success: true, petCount: cat.pet_count + 1 });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Leaderboard — top cats by pet_count
app.get('/api/leaderboard', async (_req, res) => {
  try {
    const { data: cats, error } = await supabase
      .from('cats')
      .select('*')
      .order('pet_count', { ascending: false })
      .limit(20);

    if (error) throw new Error(error.message);
    res.json({ leaderboard: cats || [] });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Health check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'kittybox' }));

// SPA fallback
app.use((_req, res) => {
  res.sendFile(path.join(__dirname, '../public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`KittyBox running on port ${PORT}`);
});
