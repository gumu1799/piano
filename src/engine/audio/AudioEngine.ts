/**
 * AudioEngine — Web Audio API synthesis with ADSR, harmonics, polyphony.
 * Piano-like envelope: quick attack, natural decay to silence (no sustain).
 * Each note naturally fades out, so stuck notes won't ring forever.
 */

interface ActiveVoice {
  oscillators: OscillatorNode[];
  gainNode: GainNode;
  startedAt: number;
  releasedAt: number | null;
}

const HARMONIC_GAINS = [1.0, 0.5, 0.25, 0.12];

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

  noteOn(midi: number, frequency: number): void {
    this.ensureCtx();
    const ctx = this.ctx!;

    if (this.voices.has(midi)) {
      this.noteOff(midi);
    }

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.connect(this.masterGain!);

    const oscillators: OscillatorNode[] = [];

    // Piano-like envelope: attack → natural decay to silence
    const attackTime = 0.005;
    const decayTime = 1.2; // decay to silence over 1.2s (like a real piano)

    for (let h = 0; h < HARMONIC_GAINS.length; h++) {
      const osc = ctx.createOscillator();
      osc.type = h === 0 ? 'triangle' : 'sine';
      osc.frequency.value = frequency * (h + 1);

      const harmonicGain = ctx.createGain();
      harmonicGain.gain.value = 0;

      osc.connect(harmonicGain);
      harmonicGain.connect(gainNode);

      const gain = HARMONIC_GAINS[h];

      harmonicGain.gain.setValueAtTime(0, now);
      harmonicGain.gain.linearRampToValueAtTime(gain, now + attackTime);
      harmonicGain.gain.exponentialRampToValueAtTime(0.001, now + attackTime + decayTime);

      osc.start(now);
      // Auto-stop after full decay
      osc.stop(now + attackTime + decayTime + 0.1);
      oscillators.push(osc);
    }

    this.voices.set(midi, {
      oscillators,
      gainNode,
      startedAt: now,
      releasedAt: null,
    });
  }

  noteOff(midi: number): void {
    const voice = this.voices.get(midi);
    if (!voice || voice.releasedAt !== null) return;

    const ctx = this.ctx!;
    const now = ctx.currentTime;
    const releaseTime = 0.3;

    voice.gainNode.gain.cancelScheduledValues(now);
    voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
    voice.gainNode.gain.linearRampToValueAtTime(0, now + releaseTime);
    voice.releasedAt = now;

    setTimeout(() => {
      this.voices.delete(midi);
    }, (releaseTime + 0.1) * 1000);
  }

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

export const audioEngine = new AudioEngine();
