// ---- Piano Key ----
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PianoKey {
  note: string;
  midi: number;
  frequency: number;
  type: 'white' | 'black';
  rect: Rect;
  isPressed: boolean;
}

// ---- Finger Event ----
export interface FingerEvent {
  fingerName: string;
  note: string;
  midi: number;
  x: number;
  y: number;
  velocityY: number;
  type: 'press';
  timestamp: number;
}

// ---- Hand Tracking ----
export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export interface HandResult {
  handedness: 'Left' | 'Right';
  landmarks: NormalizedLandmark[];
  worldLandmarks?: NormalizedLandmark[];
}

// ---- Calibration ----
export interface CalibrationPoint {
  cameraX: number;
  cameraY: number;
  screenX: number;
  screenY: number;
}

// ---- Game / Practice ----
export type PracticeMode = 'freeplay' | 'guided-scale';
export type ScoringPhase = 'idle' | 'scoring' | 'result';

export interface GuidedNote {
  note: string;
  midi: number;
  completed: boolean;
}

export interface PracticeState {
  mode: PracticeMode;
  scoringPhase: ScoringPhase;
  currentNoteIndex: number;
  score: number;
  correctCount: number;
  wrongCount: number;
  targetNotes: GuidedNote[];
  feedbackMessage: string;
  recentNotes: string[];
}

export interface ScoringResult {
  score: number;
  encouragements: string[];
}

// ---- App Status ----
export type AppStatus =
  | 'idle'
  | 'camera-loading'
  | 'camera-ready'
  | 'model-loading'
  | 'model-ready'
  | 'hand-detected'
  | 'no-hand'
  | 'error';
