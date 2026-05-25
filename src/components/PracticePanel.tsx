import React from 'react';
import type { PracticeState } from '../types';

interface PracticePanelProps {
  state: PracticeState;
}

export const PracticePanel: React.FC<PracticePanelProps> = ({ state }) => {
  const { mode, currentNoteIndex, score, correctCount, wrongCount, targetNotes, feedbackMessage, recentNotes } = state;

  return (
    <div className="practice-panel floating-panel">
      <div className="feedback">
        <span className="feedback-text">{feedbackMessage || 'Ready'}</span>
      </div>

      {mode === 'guided-scale' && targetNotes.length > 0 && (
        <div className="scale-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(currentNoteIndex / targetNotes.length) * 100}%` }}
            />
          </div>
          <span className="progress-text">
            {currentNoteIndex} / {targetNotes.length}
          </span>
          <div className="target-notes">
            {targetNotes.map((tn, i) => (
              <span
                key={tn.note}
                className={`target-note ${tn.completed ? 'completed' : ''} ${i === currentNoteIndex ? 'current' : ''}`}
              >
                {tn.note}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="score-board">
        <div className="score-item">
          <span className="score-label">Score</span>
          <span className="score-value">{score}</span>
        </div>
        <div className="score-item">
          <span className="score-label">Correct</span>
          <span className="score-value">{correctCount}</span>
        </div>
        <div className="score-item">
          <span className="score-label">Wrong</span>
          <span className="score-value">{wrongCount}</span>
        </div>
      </div>

      {recentNotes.length > 0 && (
        <div className="recent-notes">
          <span className="recent-label">Recent: </span>
          {recentNotes.map((n, i) => (
            <span key={`${n}-${i}`} className="recent-note">
              {n}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
