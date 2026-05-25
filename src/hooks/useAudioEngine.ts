import { useCallback, useRef } from 'react';
import { audioEngine } from '../engine/audio/AudioEngine';

export function useAudioEngine() {
  const engineRef = useRef(audioEngine);

  const noteOn = useCallback((midi: number, frequency: number) => {
    engineRef.current.noteOn(midi, frequency);
  }, []);

  const noteOff = useCallback((midi: number) => {
    engineRef.current.noteOff(midi);
  }, []);

  const allNotesOff = useCallback(() => {
    engineRef.current.allNotesOff();
  }, []);

  return { noteOn, noteOff, allNotesOff, engine: engineRef.current };
}
