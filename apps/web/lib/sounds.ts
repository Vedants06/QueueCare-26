'use client';

/**
 * Audio management for queue notifications.
 *
 * Browser autoplay policy requires a user gesture before audio can play.
 * We handle this by:
 *   1. Attempting to play immediately
 *   2. If blocked: storing the request as pending
 *   3. On next user interaction: playing the pending sound
 */

let audioContext: AudioContext | null = null;
let hasUserGesture = false;
let pendingSound: 'chime' | 'double-chime' | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * Register user gesture listener.
 * Call this once on component mount.
 * After first click/tap, audio is unlocked.
 */
export function initAudio(): void {
  if (hasUserGesture) return;

  const unlock = () => {
    hasUserGesture = true;

    // Resume audio context if suspended
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {
        // Ignore — audio context may not exist yet
      });
    }

    // Play any pending sound
    if (pendingSound === 'chime') {
      playChime();
    } else if (pendingSound === 'double-chime') {
      playDoubleChime();
    }
    pendingSound = null;

    // Remove listeners after first gesture
    document.removeEventListener('click', unlock);
    document.removeEventListener('touchstart', unlock);
    document.removeEventListener('keydown', unlock);
  };

  document.addEventListener('click', unlock, { once: true });
  document.addEventListener('touchstart', unlock, { once: true });
  document.addEventListener('keydown', unlock, { once: true });
}

/**
 * Play a single chime sound.
 * Used when a new token is called (token-called with isRecall: false).
 */
export function playChime(): void {
  if (!hasUserGesture) {
    pendingSound = 'chime';
    return;
  }

  try {
    const audio = new Audio('/chime.mp3');
    audio.volume = 0.7;
    audio.play().catch(() => {
      // Fallback: generate a synthetic beep
      playSyntheticBeep(800, 200);
    });
  } catch {
    playSyntheticBeep(800, 200);
  }
}

/**
 * Play a double chime sound.
 * Used when current token is recalled (token-called with isRecall: true).
 */
export function playDoubleChime(): void {
  if (!hasUserGesture) {
    pendingSound = 'double-chime';
    return;
  }

  try {
    const audio = new Audio('/double-chime.mp3');
    audio.volume = 0.7;
    audio.play().catch(() => {
      // Fallback: generate two synthetic beeps
      playSyntheticBeep(800, 150);
      setTimeout(() => playSyntheticBeep(1000, 150), 250);
    });
  } catch {
    playSyntheticBeep(800, 150);
    setTimeout(() => playSyntheticBeep(1000, 150), 250);
  }
}

/**
 * Fallback synthetic beep using Web Audio API.
 * Used when mp3 files are not available.
 */
function playSyntheticBeep(frequency: number, durationMs: number): void {
  try {
    const ctx = getAudioContext();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    // Fade in
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.01);

    // Fade out
    gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + durationMs / 1000);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + durationMs / 1000);
  } catch {
    // Audio completely unavailable — silent fallback
  }
}