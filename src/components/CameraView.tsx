import React, { useRef, useEffect } from 'react';
import type { HandResult } from '../types';
import type { CalibrationState } from '../engine/hand/GestureDetector';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  cameraReady: boolean;
  hands: HandResult[];
  showSkeleton: boolean;
  calibrationState: CalibrationState;
  calibrationProgress: number;
}

const LANDMARK_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

const FINGER_TIP_INDICES = [4, 8, 12, 16, 20];

const COLORS: Record<string, string> = {
  Left: '#00e5ff',
  Right: '#ff6d00',
};

export const CameraView: React.FC<CameraViewProps> = ({
  videoRef,
  cameraReady,
  hands,
  showSkeleton,
  calibrationState,
  calibrationProgress,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Draw hand landmarks on the canvas overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vw = video.videoWidth || 640;
    const vh = video.videoHeight || 480;

    const rect = video.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showSkeleton || hands.length === 0) return;

    const scaleX = canvas.width / vw;
    const scaleY = canvas.height / vh;

    for (const hand of hands) {
      const color = COLORS[hand.handedness] ?? '#fff';
      const pts = hand.landmarks.map((lm) => ({
        x: (1 - lm.x) * vw * scaleX,
        y: lm.y * vh * scaleY,
      }));

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      for (const [a, b] of LANDMARK_CONNECTIONS) {
        ctx.beginPath();
        ctx.moveTo(pts[a].x, pts[a].y);
        ctx.lineTo(pts[b].x, pts[b].y);
        ctx.stroke();
      }

      for (let i = 0; i < pts.length; i++) {
        ctx.beginPath();
        const isFingertip = FINGER_TIP_INDICES.includes(i);
        const radius = isFingertip ? 5 : 2.5;
        ctx.arc(pts[i].x, pts[i].y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = isFingertip ? '#ff1744' : color;
        ctx.fill();
      }
    }
  }, [hands, videoRef, cameraReady, showSkeleton]);

  return (
    <div className="camera-container">
      <video
        ref={videoRef}
        className={`camera-video ${!cameraReady ? 'camera-placeholder' : ''}`}
        playsInline
        muted
      />
      <canvas ref={canvasRef} className="hand-overlay" />

      {/* Calibration indicator */}
      {calibrationState === 'calibrating' && (
        <div className="calibration-indicator">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="6"
            />
            <circle
              cx="50" cy="50" r="42"
              fill="none"
              stroke="#7c4dff"
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${calibrationProgress * 264} 264`}
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dasharray 0.3s ease' }}
            />
          </svg>
          <span className="calibration-text">
            {calibrationProgress < 0.1 ? 'Keep Still...' : 'Hold Still'}
          </span>
        </div>
      )}

      {calibrationState === 'ready' && (
        <div className="calibration-indicator calibration-done">
          <svg width="100" height="100" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#4caf50" strokeWidth="6" />
            <path d="M30 50 L45 65 L70 38" fill="none" stroke="#4caf50" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="calibration-text done">Ready!</span>
        </div>
      )}

      {!cameraReady && (
        <div className="camera-placeholder-text">
          <span className="camera-icon">📷</span>
          <p>Camera not started</p>
          <p className="privacy-note">Camera is processed locally in your browser.</p>
        </div>
      )}
    </div>
  );
};
