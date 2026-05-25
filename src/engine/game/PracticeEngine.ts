import type { PracticeState, PracticeMode, GuidedNote } from '../../types';
import { cMajorScale, midiToNoteName } from '../piano/MusicTheory';

/**
 * PracticeEngine — manages guided practice state (scale exercises, scoring).
 * Stateless logic — state is passed in and returned.
 */

const MAX_RECENT = 10;

export function createInitialState(): PracticeState {
  return {
    mode: 'freeplay',
    scoringPhase: 'idle',
    currentNoteIndex: 0,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    targetNotes: [],
    feedbackMessage: '',
    recentNotes: [],
  };
}

export function startGuidedScale(state: PracticeState): PracticeState {
  const midis = cMajorScale();
  const targetNotes: GuidedNote[] = midis.map((m) => ({
    note: midiToNoteName(m),
    midi: m,
    completed: false,
  }));

  return {
    ...state,
    mode: 'guided-scale',
    currentNoteIndex: 0,
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    targetNotes,
    feedbackMessage: `Play: ${targetNotes[0].note}`,
    recentNotes: [],
  };
}

export function startScoring(state: PracticeState): PracticeState {
  return { ...state, scoringPhase: 'scoring' };
}

export function finishScoring(state: PracticeState): PracticeState {
  return { ...state, scoringPhase: 'result' };
}

export function setMode(state: PracticeState, mode: PracticeMode): PracticeState {
  if (mode === 'freeplay') {
    return { ...createInitialState(), mode: 'freeplay' };
  }
  return { ...startGuidedScale(state), scoringPhase: 'idle' };
}

export function handleNoteInput(state: PracticeState, midi: number): PracticeState {
  const noteName = midiToNoteName(midi);
  const newRecent = [noteName, ...state.recentNotes].slice(0, MAX_RECENT);

  if (state.mode === 'freeplay') {
    return {
      ...state,
      recentNotes: newRecent,
      feedbackMessage: noteName,
    };
  }

  // Guided scale mode
  const target = state.targetNotes[state.currentNoteIndex];
  if (!target) {
    // All done
    return {
      ...state,
      recentNotes: newRecent,
      feedbackMessage: 'Complete!',
    };
  }

  if (midi === target.midi) {
    const updatedTargets = state.targetNotes.map((t, i) =>
      i === state.currentNoteIndex ? { ...t, completed: true } : t
    );
    const nextIndex = state.currentNoteIndex + 1;
    const done = nextIndex >= updatedTargets.length;

    return {
      ...state,
      targetNotes: updatedTargets,
      currentNoteIndex: nextIndex,
      score: state.score + 10,
      correctCount: state.correctCount + 1,
      recentNotes: newRecent,
      feedbackMessage: done
        ? 'Scale Complete!'
        : `Correct! Next: ${updatedTargets[nextIndex]?.note ?? ''}`,
    };
  }

  // Wrong note
  return {
    ...state,
    wrongCount: state.wrongCount + 1,
    recentNotes: newRecent,
    feedbackMessage: `Wrong Note — Play: ${target.note}`,
  };
}

export function resetPractice(): PracticeState {
  return createInitialState();
}
