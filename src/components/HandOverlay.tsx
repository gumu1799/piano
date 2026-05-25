import React from 'react';

/**
 * Simple status indicator for hand detection state.
 * The actual landmark drawing is done in CameraView's canvas overlay.
 */
interface HandOverlayProps {
  handCount: number;
}

export const HandOverlay: React.FC<HandOverlayProps> = ({ handCount }) => {
  return (
    <div className="hand-status floating-panel">
      {handCount > 0 ? (
        <span className="hand-detected">
          {handCount} hand{handCount > 1 ? 's' : ''} detected
        </span>
      ) : (
        <span className="hand-none">No hand detected</span>
      )}
    </div>
  );
};
