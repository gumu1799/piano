import type { Rect } from '../../types';
import type { KeyDef } from './MusicTheory';

/**
 * Compute key rectangles for 3D piano layout.
 *
 * White keys: full width share, height = canvasHeight - depthMargin.
 * The bottom depthMargin is reserved for the 3D front face.
 * Black keys: 55% white key width, start from top with a negative offset
 * to appear "behind" the white key front faces (raised above).
 */

const BLACK_WIDTH_RATIO = 0.55;
const BLACK_HEIGHT_RATIO = 0.58;
const DEPTH_MARGIN = 18; // px reserved for 3D front face of white keys

export interface Key3DRects {
  /** Top playing surface */
  top: Rect;
  /** Front vertical face */
  front: Rect;
  /** Right side shadow strip */
  side: Rect;
}

export interface WhiteKeyLayout {
  rects: Key3DRects;
  midi: number;
  note: string;
}

export interface BlackKeyLayout {
  top: Rect;
  front: Rect;
  midi: number;
  note: string;
}

export function computeKeyRects(
  defs: KeyDef[],
  canvasWidth: number,
  canvasHeight: number
): Rect[] {
  const whiteKeys = defs.filter((d) => !d.isBlack);
  const whiteCount = whiteKeys.length;
  const whiteWidth = canvasWidth / whiteCount;
  const playableHeight = canvasHeight - DEPTH_MARGIN;
  const blackWidth = whiteWidth * BLACK_WIDTH_RATIO;
  const blackHeight = playableHeight * BLACK_HEIGHT_RATIO;

  const whiteIndexMap = new Map<number, number>();
  whiteKeys.forEach((wk, i) => whiteIndexMap.set(wk.midi, i));

  const rects: Rect[] = [];

  for (const def of defs) {
    if (!def.isBlack) {
      const wi = whiteIndexMap.get(def.midi)!;
      rects.push({
        x: wi * whiteWidth,
        y: 0,
        width: whiteWidth,
        height: playableHeight,
      });
    } else {
      const naturalBelow = def.midi - 1;
      const wi = whiteIndexMap.get(naturalBelow);
      if (wi !== undefined) {
        const x = (wi + 1) * whiteWidth - blackWidth / 2;
        rects.push({ x, y: 0, width: blackWidth, height: blackHeight });
      } else {
        rects.push({ x: 0, y: 0, width: 0, height: 0 });
      }
    }
  }

  return rects;
}

/** Build 3D layout data for rendering */
export function build3DLayout(
  defs: KeyDef[],
  canvasWidth: number,
  canvasHeight: number
): { whiteKeys: WhiteKeyLayout[]; blackKeys: BlackKeyLayout[] } {
  const whiteKeys = defs.filter((d) => !d.isBlack);
  const whiteCount = whiteKeys.length;
  const whiteWidth = canvasWidth / whiteCount;
  const playableHeight = canvasHeight - DEPTH_MARGIN;
  const blackWidth = whiteWidth * BLACK_WIDTH_RATIO;
  const blackHeight = playableHeight * BLACK_HEIGHT_RATIO;
  const sideWidth = 2; // thin shadow strip on right side

  const whiteIndexMap = new Map<number, number>();
  whiteKeys.forEach((wk, i) => whiteIndexMap.set(wk.midi, i));

  const whiteLayouts: WhiteKeyLayout[] = whiteKeys.map((wk) => {
    const wi = whiteIndexMap.get(wk.midi)!;
    const x = wi * whiteWidth;
    return {
      midi: wk.midi,
      note: wk.note,
      rects: {
        top: { x, y: 0, width: whiteWidth - 1, height: playableHeight },
        front: { x, y: playableHeight, width: whiteWidth - 1, height: DEPTH_MARGIN },
        side: { x: x + whiteWidth - sideWidth - 1, y: 0, width: sideWidth, height: playableHeight },
      },
    };
  });

  const blackLayouts: BlackKeyLayout[] = [];
  for (const def of defs) {
    if (!def.isBlack) continue;
    const naturalBelow = def.midi - 1;
    const wi = whiteIndexMap.get(naturalBelow);
    if (wi === undefined) continue;
    const x = (wi + 1) * whiteWidth - blackWidth / 2;
    blackLayouts.push({
      midi: def.midi,
      note: def.note,
      top: { x, y: 0, width: blackWidth, height: blackHeight },
      front: { x, y: blackHeight, width: blackWidth, height: DEPTH_MARGIN - 2 },
    });
  }

  return { whiteKeys: whiteLayouts, blackKeys: blackLayouts };
}
