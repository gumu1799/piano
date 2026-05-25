import type { PianoKey } from '../../types';
import { buildKeyDefs, midiToFrequency } from './MusicTheory';
import { computeKeyRects } from './KeyMapper';

/** Build the full PianoKey[] array with layout rectangles */
export function buildPianoKeys(
  canvasWidth: number,
  canvasHeight: number,
  fromMidi = 60,
  toMidi = 72
): PianoKey[] {
  const defs = buildKeyDefs(fromMidi, toMidi);
  const rects = computeKeyRects(defs, canvasWidth, canvasHeight);

  return defs.map((def, i) => ({
    note: def.note,
    midi: def.midi,
    frequency: midiToFrequency(def.midi),
    type: def.isBlack ? 'black' : 'white',
    rect: rects[i],
    isPressed: false,
  }));
}

/** Find which key a point (x,y) falls into. Black keys take priority. */
export function findKeyAt(
  x: number,
  y: number,
  keys: PianoKey[]
): PianoKey | null {
  // check black keys first (they overlay white keys)
  const blacks = keys.filter((k) => k.type === 'black');
  for (const key of blacks) {
    if (hitTest(key, x, y)) return key;
  }
  const whites = keys.filter((k) => k.type === 'white');
  for (const key of whites) {
    if (hitTest(key, x, y)) return key;
  }
  return null;
}

function hitTest(key: PianoKey, x: number, y: number): boolean {
  const r = key.rect;
  return x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
}
