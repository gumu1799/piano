import type { HandResult, PianoKey, FingerEvent } from '../../types';
import { findKeyAt } from '../piano/PianoModel';
import type { ICalibration } from './Calibration';

/**
 * GestureDetector — tracks finger positions across frames, computes velocity,
 * detects "press" gestures with baseline calibration.
 *
 * Calibration flow:
 *   idle → hand detected → calibrating (3s hold still)
 *     ↓ hand moves too much → reset timer
 *     ↓ 3s stable → ready (baselineY set)
 *
 * Press trigger conditions (in 'ready' state):
 *   a. Finger tip on a piano key
 *   b. Finger below baseline (y > baselineY)
 *   c. Y-velocity exceeds threshold (moving downward)
 *   d. Cooldown elapsed
 */

export const FINGER_TIPS = [
  { name: 'thumb', index: 4 },
  { name: 'index', index: 8 },
  { name: 'middle', index: 12 },
  { name: 'ring', index: 16 },
  { name: 'pinky', index: 20 },
];

const PRESS_VELOCITY_THRESHOLD = 0.012;
const COOLDOWN_MS = 120;
const NOTE_HOLD_MS = 200;

// Calibration
const CALIBRATION_DURATION = 3000; // 3 seconds hold still
const CALIBRATION_MOVE_THRESHOLD = 12; // pixels of movement that resets calibration

export type CalibrationState = 'idle' | 'calibrating' | 'ready';

interface FingerState {
  prevX: number;
  prevY: number;
  lastTriggerTime: number;
  lastTriggerNote: string | null;
  noteEndTimeout: ReturnType<typeof setTimeout> | null;
}

export class GestureDetector {
  private fingerStates: Map<string, FingerState> = new Map();
  private calibration: ICalibration | null = null;
  private keys: PianoKey[] = [];
  private onPressCallback: ((event: FingerEvent) => void) | null = null;
  private onReleaseCallback: ((note: string) => void) | null = null;
  private onCalibrationChange: ((state: CalibrationState, progress: number) => void) | null = null;
  private mirrorX = true;

  // Calibration state
  private calibrationState: CalibrationState = 'idle';
  private calibrationStartTime = 0;
  private calibrationStartY = 0;
  private calibrationStableY = 0;
  private baselineY: number | null = null;
  private lastCalibrationY = 0;

  configure(options: {
    calibration: ICalibration;
    keys: PianoKey[];
    mirrorX?: boolean;
  }) {
    this.calibration = options.calibration;
    this.keys = options.keys;
    if (options.mirrorX !== undefined) this.mirrorX = options.mirrorX;
  }

  onPress(cb: (event: FingerEvent) => void) {
    this.onPressCallback = cb;
  }

  onRelease(cb: (note: string) => void) {
    this.onReleaseCallback = cb;
  }

  onCalibration(cb: (state: CalibrationState, progress: number) => void) {
    this.onCalibrationChange = cb;
  }

  getCalibrationState(): CalibrationState {
    return this.calibrationState;
  }

  /** Call every frame with hand detection results */
  update(hands: HandResult[], now: number): FingerEvent[] {
    const events: FingerEvent[] = [];

    // --- Calibration logic (uses index finger of first hand) ---
    const primaryHand = hands[0];
    const indexTip = primaryHand?.landmarks[8];

    if (this.calibrationState === 'idle' && indexTip) {
      // Start calibrating
      this.calibrationState = 'calibrating';
      this.calibrationStartTime = now;
      this.calibrationStartY = indexTip.y;
      this.calibrationStableY = indexTip.y;
      this.lastCalibrationY = indexTip.y;
      this.onCalibrationChange?.('calibrating', 0);
    }

    if (this.calibrationState === 'calibrating') {
      if (!indexTip) {
        // Hand lost — reset
        this.calibrationState = 'idle';
        this.onCalibrationChange?.('idle', 0);
      } else {
        const moved = Math.abs(indexTip.y - this.lastCalibrationY);
        if (moved > CALIBRATION_MOVE_THRESHOLD / (this.calibration ? 200 : 200)) {
          // Hand moved too much — reset timer
          this.calibrationStartTime = now;
          this.calibrationStableY = indexTip.y;
        } else {
          // Stable — accumulate
          this.calibrationStableY = this.calibrationStableY * 0.9 + indexTip.y * 0.1;
        }

        const elapsed = now - this.calibrationStartTime;
        const progress = Math.min(1, elapsed / CALIBRATION_DURATION);

        if (elapsed >= CALIBRATION_DURATION) {
          // Calibration complete
          // Map the normalized Y to display Y for the baseline
          const ny = this.calibrationStableY;
          const display = this.calibration!.mapCameraToDisplay(0.5, ny);
          this.baselineY = display.y;
          this.calibrationState = 'ready';
          this.onCalibrationChange?.('ready', 1);
        } else {
          this.onCalibrationChange?.('calibrating', progress);
        }
        this.lastCalibrationY = indexTip.y;
      }
    }

    if (this.calibrationState === 'ready' && !indexTip) {
      // Hand lost while ready — keep baseline but don't trigger
    }

    // --- Finger press detection ---
    for (const hand of hands) {
      for (const ft of FINGER_TIPS) {
        const fingerId = `${hand.handedness}-${ft.name}`;
        const landmark = hand.landmarks[ft.index];
        if (!landmark) continue;

        let nx = this.mirrorX ? 1 - landmark.x : landmark.x;
        const ny = landmark.y;

        const display = this.calibration!.mapCameraToDisplay(nx, ny);
        const dx = display.x;
        const dy = display.y;

        let state = this.fingerStates.get(fingerId);
        if (!state) {
          state = {
            prevX: dx,
            prevY: dy,
            lastTriggerTime: 0,
            lastTriggerNote: null,
            noteEndTimeout: null,
          };
          this.fingerStates.set(fingerId, state);
        }

        const velocityY = dy - state.prevY;

        // Cooldown
        const timeSinceLast = now - state.lastTriggerTime;
        if (timeSinceLast < COOLDOWN_MS) {
          state.prevX = dx;
          state.prevY = dy;
          continue;
        }

        const key = findKeyAt(dx, dy, this.keys);

        // Release handling
        if (state.lastTriggerNote && key?.note !== state.lastTriggerNote) {
          this.releaseNote(state.lastTriggerNote);
          state.lastTriggerNote = null;
        }

        // Press detection
        const velocityOk = velocityY > PRESS_VELOCITY_THRESHOLD;
        const baselineOk = this.baselineY === null || dy > this.baselineY;

        if (key && velocityOk && baselineOk) {
          const event: FingerEvent = {
            fingerName: ft.name,
            note: key.note,
            midi: key.midi,
            x: dx,
            y: dy,
            velocityY,
            type: 'press',
            timestamp: now,
          };

          state.lastTriggerTime = now;

          if (state.lastTriggerNote && state.lastTriggerNote !== key.note) {
            this.releaseNote(state.lastTriggerNote);
          }

          state.lastTriggerNote = key.note;

          if (state.noteEndTimeout) clearTimeout(state.noteEndTimeout);
          state.noteEndTimeout = setTimeout(() => {
            if (state.lastTriggerNote === key.note) {
              this.releaseNote(key.note);
              state.lastTriggerNote = null;
            }
          }, NOTE_HOLD_MS);

          events.push(event);
          this.onPressCallback?.(event);
        }

        state.prevX = dx;
        state.prevY = dy;
      }
    }

    return events;
  }

  private releaseNote(note: string) {
    this.onReleaseCallback?.(note);
  }

  reset() {
    for (const state of this.fingerStates.values()) {
      if (state.noteEndTimeout) clearTimeout(state.noteEndTimeout);
      if (state.lastTriggerNote) {
        this.releaseNote(state.lastTriggerNote);
      }
    }
    this.fingerStates.clear();
    this.calibrationState = 'idle';
    this.baselineY = null;
    this.onCalibrationChange?.('idle', 0);
  }

  dispose() {
    this.reset();
  }
}
