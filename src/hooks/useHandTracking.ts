import { useState, useRef, useCallback, useEffect } from 'react';
import { handTracker } from '../engine/hand/HandTracker';
import { GestureDetector, type CalibrationState } from '../engine/hand/GestureDetector';
import { LinearCalibration } from '../engine/hand/Calibration';
import type { HandResult, FingerEvent, PianoKey, AppStatus } from '../types';
import { buildPianoKeys } from '../engine/piano/PianoModel';

interface UseHandTrackingOptions {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraReady: boolean;
  pianoWidth: number;
  pianoHeight: number;
  fromMidi: number;
  toMidi: number;
}

interface UseHandTrackingReturn {
  handsRef: React.RefObject<HandResult[]>;
  gestureDetectorRef: React.RefObject<GestureDetector>;
  status: AppStatus;
  modelLoading: boolean;
  calibrationState: CalibrationState;
  calibrationProgress: number;
  loadModel: () => Promise<void>;
  refreshKeys: (
    width: number,
    height: number
  ) => { keys: PianoKey[]; calibration: LinearCalibration };
}

export function useHandTracking(options: UseHandTrackingOptions): UseHandTrackingReturn {
  const { videoRef, cameraReady, pianoWidth, pianoHeight, fromMidi, toMidi } = options;
  const handsRef = useRef<HandResult[]>([]);
  const gestureDetectorRef = useRef(new GestureDetector());
  const calibrationRef = useRef(new LinearCalibration(pianoWidth, pianoHeight));
  const keysRef = useRef<PianoKey[]>(buildPianoKeys(pianoWidth, pianoHeight, fromMidi, toMidi));
  const [status, setStatus] = useState<AppStatus>('idle');
  const [modelLoading, setModelLoading] = useState(false);
  const [calibrationState, setCalibrationState] = useState<CalibrationState>('idle');
  const [calibrationProgress, setCalibrationProgress] = useState(0);
  const animFrameRef = useRef<number>(0);
  const lastTimestampRef = useRef(0);

  const refreshKeys = useCallback(
    (width: number, height: number) => {
      const keys = buildPianoKeys(width, height, fromMidi, toMidi);
      keysRef.current = keys;
      calibrationRef.current.updateDimensions(width, height);
      gestureDetectorRef.current.configure({
        calibration: calibrationRef.current,
        keys,
        mirrorX: true,
      });
      return { keys, calibration: calibrationRef.current };
    },
    []
  );

  const loadModel = useCallback(async () => {
    setModelLoading(true);
    setStatus('model-loading');
    await handTracker.load();
    setModelLoading(false);
    setStatus('camera-ready');
  }, []);

  // Wire calibration callback (once)
  useEffect(() => {
    const gd = gestureDetectorRef.current;
    gd.onCalibration((state, progress) => {
      setCalibrationState(state);
      setCalibrationProgress(progress);
    });
  }, []);

  // Tracking loop
  useEffect(() => {
    if (!cameraReady || !handTracker.isLoaded()) return;

    const video = videoRef.current;
    if (!video) return;

    setStatus('no-hand');

    const gd = gestureDetectorRef.current;
    gd.configure({
      calibration: calibrationRef.current,
      keys: keysRef.current,
      mirrorX: true,
    });

    const loop = () => {
      if (video.readyState >= 2) {
        lastTimestampRef.current = performance.now();
        const result = handTracker.detect(video, lastTimestampRef.current);
        handsRef.current = result;

        if (result.length > 0) {
          setStatus('hand-detected');
          gd.update(result, lastTimestampRef.current);
        } else {
          setStatus('no-hand');
          // If hand lost, reset calibration
          if (gd.getCalibrationState() === 'calibrating') {
            // calibration will auto-reset in GestureDetector when hand is lost
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [cameraReady, videoRef, modelLoading]);

  // Refresh calibration when piano dimensions change
  useEffect(() => {
    calibrationRef.current.updateDimensions(pianoWidth, pianoHeight);
    keysRef.current = buildPianoKeys(pianoWidth, pianoHeight, fromMidi, toMidi);
    gestureDetectorRef.current.configure({
      calibration: calibrationRef.current,
      keys: keysRef.current,
      mirrorX: true,
    });
  }, [pianoWidth, pianoHeight, fromMidi, toMidi]);

  return {
    handsRef,
    gestureDetectorRef,
    status,
    modelLoading,
    calibrationState,
    calibrationProgress,
    loadModel,
    refreshKeys,
  };
}
