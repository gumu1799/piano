import type { CalibrationPoint } from '../../types';

export interface ICalibration {
  mapCameraToDisplay(camX: number, camY: number): { x: number; y: number };
}

/**
 * Linear mapping with optional X-axis spread.
 *
 * xSpread > 1 means small hand movements cover more of the piano.
 * With xSpread=2, the center 50% of the camera maps to the full keyboard width.
 *
 * Formula: displayX = ((camX - 0.5) * xSpread + 0.5) * displayWidth
 */
export class LinearCalibration implements ICalibration {
  private xSpread: number;

  constructor(
    private displayWidth: number,
    private displayHeight: number,
    xSpread = 2.0
  ) {
    this.xSpread = xSpread;
  }

  mapCameraToDisplay(camX: number, camY: number): { x: number; y: number } {
    const centered = (camX - 0.5) * this.xSpread + 0.5;
    const clamped = Math.max(0, Math.min(1, centered));
    return {
      x: clamped * this.displayWidth,
      y: camY * this.displayHeight,
    };
  }

  updateDimensions(w: number, h: number) {
    this.displayWidth = w;
    this.displayHeight = h;
  }

  setXSpread(s: number) {
    this.xSpread = s;
  }
}

export class PerspectiveCalibration implements ICalibration {
  private _points: CalibrationPoint[] = [];

  setPoints(points: CalibrationPoint[]) {
    this._points = points;
  }

  mapCameraToDisplay(camX: number, camY: number): { x: number; y: number } {
    return { x: camX * 640, y: camY * 480 };
  }
}
