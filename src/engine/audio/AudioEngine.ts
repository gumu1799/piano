/**
 * AudioEngine — Web Audio API synthesis with ADSR, harmonics, polyphony.
 * Each note gets its own set of oscillators and gain node so notes don't cut each other off.
 */

interface ActiveVoice {
  oscillators: OscillatorNode[];
  gainNode: GainNode;
  startedAt: number;
  releasedAt: number | null;
}

const HARMONIC_GAINS = [1.0, 0.5, 0.25, 0.12]; // fundamental, 2nd, 3rd, 4th

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private voices: Map<number, ActiveVoice> = new Map();
  private _volume = 0.5;

  get volume() {
    return this._volume;
  }
  set volume(v: number) {
    this._volume = Math.max(0, Math.min(1, v));
    if (this.masterGain) {
      this.masterGain.gain.setValueAtTime(this._volume, this.ctx!.currentTime);
    }
  }

  private ensureCtx() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this._volume;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  /** Start a note (MIDI number + frequency). Non-blocking — creates fresh oscillators. */
  noteOn(midi: number, frequency: number): void {
    this.ensureCtx();
    const ctx = this.ctx!;

    // If same note already playing, release it first
    if (this.voices.has(midi)) {
      this.noteOff(midi);
    }

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(this.masterGain!);

    const oscillators: OscillatorNode[] = [];

    for (let h = 0; h < HARMONIC_GAINS.length; h++) {
      const osc = ctx.createOscillator();
      osc.type = h === 0 ? 'triangle' : 'sine';
      osc.frequency.value = frequency * (h + 1);

      const harmonicGain = ctx.createGain();
      harmonicGain.gain.value = 0;

      osc.connect(harmonicGain);
      harmonicGain.connect(gainNode);

      // ADSR envelope per harmonic
      const gain = HARMONIC_GAINS[h];
      const attackTime = 0.008;
      const decayTime = 0.08;
      const sustainLevel = gain * 0.35;

      harmonicGain.gain.setValueAtTime(0, now);
      harmonicGain.gain.linearRampToValueAtTime(gain, now + attackTime);
      harmonicGain.gain.linearRampToValueAtTime(sustainLevel, now + attackTime + decayTime);

      osc.start(now);
      oscillators.push(osc);
    }

    this.voices.set(midi, {
      oscillators,
      gainNode,
      startedAt: now,
      releasedAt: null,
    });
  }

  /** Release a note with a natural decay. */
  noteOff(midi: number): void {
    const voice = this.voices.get(midi);
    if (!voice || voice.releasedAt !== null) return;

    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const releaseTime = 0.4;

    voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
    voice.gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);
    voice.releasedAt = now;

    // Stop oscillators after release
    const stopAt = now + releaseTime + 0.05;
    for (const osc of voice.oscillators) {
      osc.stop(stopAt);
    }

    // Clean up
    setTimeout(() => {
      this.voices.delete(midi);
    }, (releaseTime + 0.1) * 1000);
  }

  /** Immediately kill all voices */
  allNotesOff(): void {
    for (const midi of this.voices.keys()) {
      this.noteOff(midi);
    }
  }

  dispose(): void {
    this.allNotesOff();
    this.ctx?.close();
    this.ctx = null;
    this.masterGain = null;
  }
}

/** Singleton */
export const audioEngine = new AudioEngine();
