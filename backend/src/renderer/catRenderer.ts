// KittyBox — ASCII Cat Renderer
// DNA → ASCII art cat
// ============================================

import { CatDNA } from './schema.js';

// --- Base templates per pose ---

const POSES: Record<string, string[]> = {
  sitting: [
    '   /\\_/\\   ',
    '  ( o.o )  ',
    '   > ^ <   ',
    '  /     \\  ',
    ' /       \\ ',
    ' |       | ',
    ' |       | ',
    ' \\___|___/',
  ],
  loaf: [
    '  /\\___/\\  ',
    '  |     |  ',
    '  |     |  ',
    '  |     |  ',
    '  |_____|  ',
    '  /     \\  ',
    ' /       \\ ',
    ' \\_______/',
  ],
  sleeping: [
    '   /\\___/\\   ',
    '  (  -.-  )  ',
    '   \\     /   ',
    '    \\___/    ',
    '   /     \\   ',
    '  |       |  ',
    '  |_______|  ',
    '  /       \\  ',
  ],
  standing: [
    '    /\\_/\\    ',
    '   ( o.o )   ',
    '    > ^ <    ',
    '   /     \\   ',
    '  |       |  ',
    '  |       |  ',
    '  |       |  ',
    '  /|     |\\  ',
    '   |     |   ',
    '   |     |   ',
    '   |_____|   ',
  ],
  stretching: [
    '    /\\_/\\     ',
    '   ( >.< )    ',
    '    >   <     ',
    '   /     \\    ',
    '  |       |   ',
    '  |       |~~~',
    '   \\     /    ',
    '    \\___/     ',
  ],
  grooming: [
    '   /\\_/\\    ',
    '  ( -.- )   ',
    '   > ~ <    ',
    '  /  ~  \\   ',
    ' |   ~   |  ',
    ' |   ~   |  ',
    '  \\___| /   ',
    '    |__|    ',
  ],
};

// --- Eye styles per eye_color ---

const EYES: Record<string, [string, string, string]> = {
  // [left_eye, right_eye, blink_line]
  green:        ['( o.o )', '( o·o )', '( -.- )'],
  blue:         ['( ~.~ )', '( ~·~ )', '( -.- )'],
  amber:        ['( @.@ )', '( @·@ )', '( -.- )'],
  copper:       ['( *.*)',  '( *·*)',  '( -.- )'],
  heterochromia:['( o.O )', '( o·O )', '( -.O )'],
  closed:        ['( -.- )', '( -.- )', '( -.- )'],
};

// --- Mood expression modifiers ---

const MOOD_EYES: Record<string, string> = {
  content:    '( ˘ω˘ )',
  annoyed:    '( >.< )',
  happy:      '( ^.^ )',
  sleepy:     '( -.- )',
  curious:    '( O.O )',
  indifferent: '( -.- )',
};

// --- Fur pattern modifiers ---

const FUR_MARKS: Record<string, string> = {
  solid:    ' ',
  striped:  '≡',
  spotted:  '·',
  patched:  '░',
  marbled:  '≈',
  pointed:  '•',
  bi_color: '▒',
  tri_color:'▓',
};

// --- Accessories ---

function applyAccessory(lines: string[], accessory: string): string[] {
  const result = [...lines];
  const width = Math.max(...lines.map(l => l.length));

  switch (accessory) {
    case 'bow':
      result.splice(1, 0, '   ' + '><(⋅)><'.padEnd(width) + '   ');
      break;
    case 'hat':
      result.splice(0, 0, '      ▽▲▽      '.padEnd(width));
      break;
    case 'scarf':
      result.splice(4, 0, '  ~~~~~~~~~~~~~~  '.padEnd(width));
      break;
    case 'glasses':
      if (result[2]) result[2] = result[2].replace(/(\([^\)]+\))/g, '(≈°≈)');
      break;
    case 'collar':
      result.splice(4, 0, '  ··············  '.padEnd(width));
      break;
    case 'flower':
      result.splice(1, 0, '   @(▪▪)@      '.padEnd(width));
      break;
    case 'none':
    default:
      break;
  }

  return result;
}

// --- Main render function ---

export function renderCat(dna: CatDNA): string {
  // 1. Get base pose template
  let lines = [...(POSES[dna.pose] || POSES.sitting)];

  // 2. Apply eye color to the face line (usually line index 1-2)
  const eyeSet = EYES[dna.eye_color] || EYES.green;
  // Replace the face line — find a line matching ( ... ) pattern
  const faceLineIdx = lines.findIndex(l => /\([^\)]+\)/.test(l));
  if (faceLineIdx >= 0) {
    // If mood overrides, use mood eyes; otherwise use eye color
    if (dna.mood === 'happy' || dna.mood === 'annoyed' || dna.mood === 'sleepy') {
      lines[faceLineIdx] = lines[faceLineIdx].replace(/\([^\)]+\)/, MOOD_EYES[dna.mood]);
    } else {
      lines[faceLineIdx] = lines[faceLineIdx].replace(/\([^\)]+\)/, eyeSet[0]);
    }
  }

  // 3. Apply fur pattern marks
  const furMark = FUR_MARKS[dna.fur_pattern] || ' ';
  if (furMark !== ' ') {
    // Add fur marks to body lines (not face or feet)
    for (let i = 3; i < lines.length - 2; i++) {
      // Only modify lines that have body content (not just whitespace)
      if (lines[i] && lines[i].includes('|')) {
        const pos = lines[i].indexOf('|') + 1;
        if (pos < lines[i].length - 1) {
          lines[i] =
            lines[i].slice(0, pos) +
            furMark +
            lines[i].slice(pos + 1);
        }
      }
    }
  }

  // 4. Apply accessories
  lines = applyAccessory(lines, dna.accessory);

  // 5. Add name plaque
  const nameLine = `  ~ ${dna.name} ~  `;

  // 6. Combine
  const art = lines.join('\n');
  const plaque = '\n' + nameLine;

  return art + plaque;
}

// --- Compact renderer (for leaderboard / many cats on page) ---

export function renderCatCompact(dna: CatDNA): string {
  const eyeSet = EYES[dna.eye_color] || EYES.green;
  const eyeExpr = dna.mood === 'happy' ? '(^.^)' :
                  dna.mood === 'annoyed' ? '(>.<)' :
                  dna.mood === 'sleepy' ? '(-.-)' :
                  eyeSet[0];

  const furMark = FUR_MARKS[dna.fur_pattern] || ' ';
  const acc = dna.accessory === 'none' ? '' :
              dna.accessory === 'bow' ? '<> ' :
              dna.accessory === 'hat' ? '▲' :
              dna.accessory === 'flower' ? '@ ' :
              '';

  // Compact 5-line cat
  return [
    `  ${acc}/\\_/\\  `,
    ` ${acc}${eyeExpr} `,
    `  > ${furMark} <  `,
    ` /${furMark}${furMark}${furMark}${furMark}\\ `,
    ` \\___|_/ `,
  ].join('\n');
}

// --- Unique code generator ---

export function generateCatCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
  let code = '';
  for (let i = 0; i < 5; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `KIT-${code}`;
}
