// KittyBox — Cat DNA Schema + Validation
// ============================================

export interface CatDNA {
  name: string;           // max 20 chars
  breed: CatBreed;
  fur_pattern: FurPattern;
  fur_color: FurColor;
  eye_color: EyeColor;
  personality: Personality;
  accessory: Accessory;
  pose: Pose;
  mood: Mood;
}

export type CatBreed =
  | 'tabby' | 'calico' | 'siamese' | 'tuxedo' | 'persian'
  | 'sphinx' | 'ragdoll' | 'bengal' | 'manx' | 'tortoiseshell';

export type FurPattern =
  | 'solid' | 'striped' | 'spotted' | 'patched' | 'marbled'
  | 'pointed' | 'bi_color' | 'tri_color';

export type FurColor =
  | 'black' | 'white' | 'orange' | 'grey' | 'brown'
  | 'cream' | 'black_white' | 'grey_white' | 'orange_white';

export type EyeColor =
  | 'green' | 'blue' | 'amber' | 'copper' | 'heterochromia' | 'closed';

export type Personality =
  | 'sleepy' | 'playful' | 'grumpy' | 'curious'
  | 'aloof' | 'clingy' | 'mischievous' | 'zen';

export type Accessory =
  | 'none' | 'bow' | 'hat' | 'scarf' | 'glasses' | 'collar' | 'flower';

export type Pose =
  | 'sitting' | 'loaf' | 'sleeping' | 'standing' | 'stretching' | 'grooming';

export type Mood =
  | 'content' | 'annoyed' | 'happy' | 'sleepy' | 'curious' | 'indifferent';

// --- Validation ---

const VALID: Record<string, string[]> = {
  breed: ['tabby','calico','siamese','tuxedo','persian','sphinx','ragdoll','bengal','manx','tortoiseshell'],
  fur_pattern: ['solid','striped','spotted','patched','marbled','pointed','bi_color','tri_color'],
  fur_color: ['black','white','orange','grey','brown','cream','black_white','grey_white','orange_white'],
  eye_color: ['green','blue','amber','copper','heterochromia','closed'],
  personality: ['sleepy','playful','grumpy','curious','aloof','clingy','mischievous','zen'],
  accessory: ['none','bow','hat','scarf','glasses','collar','flower'],
  pose: ['sitting','loaf','sleeping','standing','stretching','grooming'],
  mood: ['content','annoyed','happy','sleepy','curious','indifferent'],
};

export function validateCatDNA(dna: any): { valid: boolean; errors: string[]; sanitized?: CatDNA } {
  const errors: string[] = [];

  if (!dna || typeof dna !== 'object') {
    return { valid: false, errors: ['DNA must be a JSON object'] };
  }

  // Name
  if (!dna.name || typeof dna.name !== 'string') {
    errors.push('name is required (string, max 20 chars)');
  } else if (dna.name.length > 20) {
    errors.push('name must be 20 chars or less');
  }

  // Enum fields
  for (const [field, allowed] of Object.entries(VALID)) {
    if (!dna[field]) {
      errors.push(`${field} is required`);
    } else if (!allowed.includes(dna[field])) {
      errors.push(`${field} must be one of: ${allowed.join(', ')}`);
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    errors: [],
    sanitized: {
      name: dna.name.trim().slice(0, 20),
      breed: dna.breed,
      fur_pattern: dna.fur_pattern,
      fur_color: dna.fur_color,
      eye_color: dna.eye_color,
      personality: dna.personality,
      accessory: dna.accessory,
      pose: dna.pose,
      mood: dna.mood,
    },
  };
}

// --- Agent-facing schema text (for /pspsps page) ---

export const CAT_DNA_SCHEMA_TEXT = `{
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
