interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

type WaveType = OscillatorType;

export class Sound {
  private context: AudioContext | null = null;
  private enabled = true;

  unlock(): void {
    if (!this.enabled) {
      return;
    }

    try {
      if (!this.context) {
        const AudioContextConstructor =
          window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext;

        if (!AudioContextConstructor) {
          this.enabled = false;
          return;
        }

        this.context = new AudioContextConstructor();
      }

      if (this.context.state === "suspended") {
        void this.context.resume();
      }
    } catch {
      this.enabled = false;
    }
  }

  flap(): void {
    this.playTone({
      startFrequency: 520,
      endFrequency: 760,
      duration: 0.08,
      gain: 0.05,
      type: "sine",
    });
  }

  score(): void {
    this.playTone({
      startFrequency: 880,
      endFrequency: 1180,
      duration: 0.12,
      gain: 0.055,
      type: "triangle",
    });
  }

  hit(): void {
    this.playTone({
      startFrequency: 180,
      endFrequency: 70,
      duration: 0.18,
      gain: 0.08,
      type: "sawtooth",
    });
  }

  private playTone(options: {
    startFrequency: number;
    endFrequency: number;
    duration: number;
    gain: number;
    type: WaveType;
  }): void {
    if (!this.enabled) {
      return;
    }

    this.unlock();

    if (!this.context) {
      return;
    }

    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator();
    const gainNode = this.context.createGain();

    oscillator.type = options.type;
    oscillator.frequency.setValueAtTime(options.startFrequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, options.endFrequency),
      now + options.duration,
    );

    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(options.gain, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + options.duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.context.destination);
    oscillator.start(now);
    oscillator.stop(now + options.duration + 0.02);
  }
}
