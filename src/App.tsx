import React, { useState, useCallback, useRef, useEffect } from 'react';
import { CameraView } from './components/CameraView';
import { HandOverlay } from './components/HandOverlay';
import { PianoKeyboard } from './components/PianoKeyboard';
import { ControlPanel } from './components/ControlPanel';
import { PracticePanel } from './components/PracticePanel';
import { AIScoringOverlay } from './components/AIScoringOverlay';
import { useCamera } from './hooks/useCamera';
import { useHandTracking } from './hooks/useHandTracking';
import { useAudioEngine } from './hooks/useAudioEngine';
import { handTracker } from './engine/hand/HandTracker';
import {
  createInitialState,
  handleNoteInput,
  setMode,
  startScoring,
} from './engine/game/PracticeEngine';
import { midiToFrequency } from './engine/piano/MusicTheory';
import type { AppStatus, PianoKey, ScoringPhase } from './types';

const PIANO_WIDTH = 1200;
const PIANO_HEIGHT = 260;
const PIANO_FROM_MIDI = 48; // C3
const PIANO_TO_MIDI = 83;   // B5 (3 octaves)

const App: React.FC = () => {
  const {
    videoRef,
    cameraReady,
    cameraError,
    cameraLoading,
    startCamera,
    stopCamera,
  } = useCamera();
  const {
    handsRef,
    gestureDetectorRef,
    status: handStatus,
    modelLoading,
    calibrationState,
    calibrationProgress,
    loadModel,
    refreshKeys,
  } = useHandTracking({
    videoRef,
    cameraReady,
    pianoWidth: PIANO_WIDTH,
    pianoHeight: PIANO_HEIGHT,
    fromMidi: PIANO_FROM_MIDI,
    toMidi: PIANO_TO_MIDI,
  });
  const { noteOn, noteOff, allNotesOff } = useAudioEngine();

  const [practiceState, setPracticeState] = useState(createInitialState);
  const [pressedNotes, setPressedNotes] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<AppStatus>('idle');
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [scoringPhase, setScoringPhase] = useState<ScoringPhase>('idle');

  const pressedNotesRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const audioTriggeredRef = useRef<Map<string, number>>(new Map());
  const keysRef = useRef<PianoKey[]>([]);

  // Preload AI model as soon as the page mounts
  useEffect(() => {
    loadModel();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refresh keys initially
  useEffect(() => {
    const { keys } = refreshKeys(PIANO_WIDTH, PIANO_HEIGHT);
    keysRef.current = keys;
  }, [refreshKeys]);

  // Derive overall status
  useEffect(() => {
    if (cameraLoading) setStatus('camera-loading');
    else if (modelLoading) setStatus('model-loading');
    else if (!cameraReady) setStatus('idle');
    else if (!handTracker.isLoaded()) setStatus('camera-ready');
    else setStatus(handStatus);
  }, [cameraReady, cameraLoading, modelLoading, handStatus]);

  // Press a key visually
  const pressKey = useCallback((note: string) => {
    const existing = pressedNotesRef.current.get(note);
    if (existing) clearTimeout(existing);

    setPressedNotes((prev) => new Set(prev).add(note));

    const timeout = setTimeout(() => {
      setPressedNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
      pressedNotesRef.current.delete(note);
    }, 200);

    pressedNotesRef.current.set(note, timeout);
  }, []);

  // Set up gesture detector callbacks
  useEffect(() => {
    const gd = gestureDetectorRef.current;

    gd.onPress((event) => {
      // Audio
      const existingMidi = audioTriggeredRef.current.get(event.note);
      if (existingMidi === undefined) {
        noteOn(event.midi, midiToFrequency(event.midi));
        audioTriggeredRef.current.set(event.note, event.midi);
      }

      pressKey(event.note);

      setPracticeState((prev) => handleNoteInput(prev, event.midi));
    });

    gd.onRelease((note) => {
      const midi = audioTriggeredRef.current.get(note);
      if (midi !== undefined) {
        noteOff(midi);
        audioTriggeredRef.current.delete(note);
      }
    });

    return () => {
      gd.dispose();
    };
  }, [noteOn, noteOff, pressKey]);

  // Mouse click on piano keys
  const handleKeyClick = useCallback(
    (key: PianoKey) => {
      noteOn(key.midi, key.frequency);
      pressKey(key.note);
      setPracticeState((prev) => handleNoteInput(prev, key.midi));
      setTimeout(() => noteOff(key.midi), 400);
    },
    [noteOn, noteOff, pressKey]
  );

  // Camera
  const handleStartCamera = useCallback(async () => {
    await Promise.all([startCamera(), loadModel()]);
  }, [startCamera, loadModel]);

  const handleStopCamera = useCallback(() => {
    stopCamera();
    allNotesOff();
    setStatus('idle');
  }, [stopCamera, allNotesOff]);

  // Reset
  const handleReset = useCallback(() => {
    allNotesOff();
    setPressedNotes(new Set());
    pressedNotesRef.current.forEach((t) => clearTimeout(t));
    pressedNotesRef.current.clear();
    audioTriggeredRef.current.clear();
    setPracticeState(createInitialState());
    setScoringPhase('idle');
    gestureDetectorRef.current.reset();
  }, [allNotesOff, cameraReady]);

  // Mode switch
  const handleSetMode = useCallback(
    (mode: 'freeplay' | 'guided-scale') => {
      allNotesOff();
      setPressedNotes(new Set());
      pressedNotesRef.current.forEach((t) => clearTimeout(t));
      pressedNotesRef.current.clear();
      audioTriggeredRef.current.clear();
      setScoringPhase('idle');
      setPracticeState((prev) => setMode(prev, mode));
    },
    [allNotesOff, cameraReady]
  );

  // Skeleton toggle
  const handleToggleSkeleton = useCallback(() => {
    setShowSkeleton((prev) => !prev);
  }, []);

  // End session → start scoring
  const handleEndSession = useCallback(() => {
    setScoringPhase('scoring');
    setPracticeState((prev) => startScoring(prev));
  }, []);

  // Restart after scoring
  const handleScoringRestart = useCallback(() => {
    allNotesOff();
    setPressedNotes(new Set());
    pressedNotesRef.current.forEach((t) => clearTimeout(t));
    pressedNotesRef.current.clear();
    audioTriggeredRef.current.clear();
    setPracticeState(createInitialState());
    setScoringPhase('idle');
  }, [allNotesOff]);

  // Cleanup
  useEffect(() => {
    return () => {
      allNotesOff();
      pressedNotesRef.current.forEach((t) => clearTimeout(t));
    };
  }, [allNotesOff]);

  return (
    <div className="app">
      {/* Full-screen camera background */}
      <CameraView
        videoRef={videoRef}
        cameraReady={cameraReady}
        hands={handsRef.current}
        showSkeleton={showSkeleton}
        calibrationState={calibrationState}
        calibrationProgress={calibrationProgress}
      />

      {/* Header — subtle overlay at top */}
      <header className="app-header">
        <h1>Virtual Piano</h1>
      </header>

      {/* Floating control panel — top right */}
      <ControlPanel
        status={status}
        practiceMode={practiceState.mode}
        scoringPhase={scoringPhase}
        cameraReady={cameraReady}
        showSkeleton={showSkeleton}
        onStartCamera={handleStartCamera}
        onStopCamera={handleStopCamera}
        onReset={handleReset}
        onSetMode={handleSetMode}
        onToggleSkeleton={handleToggleSkeleton}
        onEndSession={handleEndSession}
      />

      {/* Floating practice panel — top left */}
      <PracticePanel state={practiceState} />

      {/* Hand status — bottom left corner */}
      <HandOverlay handCount={handsRef.current.length} />

      {/* Privacy note */}
      {cameraError && (
        <div className="error-message floating-error">
          Camera Error: {cameraError}
        </div>
      )}

      {/* Piano keyboard — bottom center */}
      <div className="piano-section">
        <PianoKeyboard
          width={PIANO_WIDTH}
          height={PIANO_HEIGHT}
          fromMidi={PIANO_FROM_MIDI}
          toMidi={PIANO_TO_MIDI}
          pressedNotes={pressedNotes}
          onKeyClick={handleKeyClick}
          recentNotes={practiceState.recentNotes}
        />
        <p className="piano-hint">
          {cameraReady && handTracker.isLoaded()
            ? 'Move your finger down on a key to play'
            : 'Click keys to test audio'}
        </p>
      </div>

      {/* AI Scoring overlay */}
      <AIScoringOverlay
        visible={scoringPhase === 'scoring' || scoringPhase === 'result'}
        onRestart={handleScoringRestart}
      />
    </div>
  );
};

export default App;
