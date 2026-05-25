import {
  HandLandmarker,
  FilesetResolver,
  type NormalizedLandmark,
} from '@mediapipe/tasks-vision';
import type { HandResult } from '../../types';

/**
 * HandTracker — wraps MediaPipe HandLandmarker.
 * Loads model once, then processes video frames on demand.
 */

const WASM_PATH = '/models/wasm/';
const MODEL_PATH = '/models/hand_landmarker.task';

export class HandTracker {
  private handLandmarker: HandLandmarker | null = null;
  private loading = false;
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded || this.loading) return;
    this.loading = true;

    try {
      const vision = await FilesetResolver.forVisionTasks(WASM_PATH);
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_PATH,
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.6,
        minTrackingConfidence: 0.5,
      });

      this.loaded = true;
      this.loading = false;
    } catch (err) {
      this.loading = false;
      throw new Error(
        'Failed to load AI model. Run "npm run copy:models" then reload.\n' +
          'Original error: ' + (err instanceof Error ? err.message : String(err))
      );
    }
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  /**
   * Detect hands in a video frame. Timestamp in ms, must be monotonically increasing.
   */
  detect(video: HTMLVideoElement, timestamp: number): HandResult[] {
    if (!this.handLandmarker) return [];

    const results = this.handLandmarker.detectForVideo(video, timestamp);

    return results.landmarks.map((landmarks, i) => ({
      handedness: (results.handedness[i]?.[0]?.categoryName as 'Left' | 'Right') ?? 'Right',
      landmarks: landmarks.map((lm: NormalizedLandmark) => ({
        x: lm.x,
        y: lm.y,
        z: lm.z,
      })),
    }));
  }

  dispose(): void {
    this.handLandmarker?.close();
    this.handLandmarker = null;
    this.loaded = false;
  }
}

/** Singleton shared across app */
export const handTracker = new HandTracker();
