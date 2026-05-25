// MusicTheory — note-to-frequency and scale utilities

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/** MIDI number → frequency (A4=440Hz=69) */
export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** note name + octave → MIDI number. e.g. noteToMidi('C', 4) = 60 */
export function noteToMidi(note: string, octave: number): number {
  const idx = NOTE_NAMES.indexOf(note);
  if (idx === -1) throw new Error(`Unknown note: ${note}`);
  return (octave + 1) * 12 + idx;
}

/** MIDI number → note name */
export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const idx = midi % 12;
  return `${NOTE_NAMES[idx]}${octave}`;
}

/** C major scale MIDI numbers (one octave C4-C5) */
export function cMajorScale(): number[] {
  // C4 D4 E4 F4 G4 A4 B4 C5
  return [60, 62, 64, 65, 67, 69, 71, 72];
}

/** All chromatic MIDI numbers in one octave C4-C5 */
export function chromaticOctave(): number[] {
  return Array.from({ length: 13 }, (_, i) => 60 + i);
}

/** Build all piano keys for a range of MIDI numbers */
export interface KeyDef {
  note: string;
  midi: number;
  isBlack: boolean;
}

export function buildKeyDefs(fromMidi: number, toMidi: number): KeyDef[] {
  const keys: KeyDef[] = [];
  for (let midi = fromMidi; midi <= toMidi; midi++) {
    const idx = midi % 12;
    const isBlack = [1, 3, 6, 8, 10].includes(idx);
    keys.push({
      note: midiToNoteName(midi),
      midi,
      isBlack,
    });
  }
  return keys;
}

export { NOTE_NAMES };
