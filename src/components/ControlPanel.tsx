import React from 'react';
import type { AppStatus, PracticeMode, ScoringPhase } from '../types';

interface ControlPanelProps {
  status: AppStatus;
  practiceMode: PracticeMode;
  scoringPhase: ScoringPhase;
  cameraReady: boolean;
  showSkeleton: boolean;
  onStartCamera: () => void;
  onStopCamera: () => void;
  onReset: () => void;
  onSetMode: (mode: PracticeMode) => void;
  onToggleSkeleton: () => void;
  onEndSession: () => void;
}

const STATUS_LABELS: Record<AppStatus, string> = {
  idle: 'Ready',
  'camera-loading': 'Camera Loading...',
  'camera-ready': 'Camera Ready',
  'model-loading': 'Loading AI Model...',
  'model-ready': 'Model Ready',
  'hand-detected': 'Hand Detected',
  'no-hand': 'No Hand',
  error: 'Error',
};

export const ControlPanel: React.FC<ControlPanelProps> = ({
  status,
  practiceMode,
  scoringPhase,
  cameraReady,
  showSkeleton,
  onStartCamera,
  onStopCamera,
  onReset,
  onSetMode,
  onToggleSkeleton,
  onEndSession,
}) => {
  const isLoading =
    status === 'camera-loading' || status === 'model-loading';

  return (
    <div className="control-panel floating-panel">
      <div className="status-badge">
        <span
          className={`status-dot ${
            status === 'hand-detected' ? 'active' : isLoading ? 'loading' : ''
          }`}
        />
        {STATUS_LABELS[status]}
      </div>

      <div className="control-buttons">
        {!cameraReady ? (
          <button className="btn btn-primary" onClick={onStartCamera}>
            Start Camera
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={onStopCamera}>
            Stop Camera
          </button>
        )}
        <button className="btn btn-outline" onClick={onReset}>
          Reset
        </button>
        <button
          className="btn btn-sm"
          onClick={onToggleSkeleton}
          title={showSkeleton ? 'Hide hand skeleton' : 'Show hand skeleton'}
        >
          {showSkeleton ? 'Hide Skeleton' : 'Show Skeleton'}
        </button>
      </div>

      <div className="mode-buttons">
        <button
          className={`btn btn-sm ${practiceMode === 'freeplay' ? 'active' : ''}`}
          onClick={() => onSetMode('freeplay')}
        >
          Free Play
        </button>
        <button
          className={`btn btn-sm ${practiceMode === 'guided-scale' ? 'active' : ''}`}
          onClick={() => onSetMode('guided-scale')}
        >
          C Major Scale
        </button>
      </div>

      {practiceMode === 'freeplay' && scoringPhase === 'idle' && (
        <button className="btn btn-end-session" onClick={onEndSession}>
          End Session
        </button>
      )}
    </div>
  );
};
