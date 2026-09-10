// audio system — v12, integrated from the deployed v11.

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  masterGain = audioCtx.createGain();
  masterGain.gain.value = 0.22;
  masterGain.connect(audioCtx.destination);
}

function tone(freq = 440, dur = 0.08, type = "sine", vol = 0.13, slide = 1) {
  if (!audioCtx) return;
  const o = audioCtx.createOscillator(),
    g = audioCtx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, audioCtx.currentTime);
  o.frequency.exponentialRampToValueAtTime(
    Math.max(40, freq * slide),
    audioCtx.currentTime + dur,
  );
  g.gain.setValueAtTime(vol, audioCtx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
  o.connect(g);
  g.connect(masterGain);
  o.start();
  o.stop(audioCtx.currentTime + dur);
}

function sfx(name) {
  if (!audioCtx) return;
  const now = performance.now();
  if (lastSfx[name] && now - lastSfx[name] < 45) return;
  lastSfx[name] = now;
  if (name === "pickup") {
    if (lastSfx.pickupNote && now - lastSfx.pickupNote < 100) return;
    lastSfx.pickupNote = now;
    tone(880, 0.055, "sine", 0.04, 1.3);
  } else if (name === "deliver") {
    tone(420, 0.08, "triangle", 0.055, 0.7);
  } else if (name === "wood") {
    tone(170, 0.06, "square", 0.08, 1.8);
    tone(280, 0.08, "triangle", 0.06, 1.3);
  } else if (name === "coal") {
    tone(110, 0.09, "square", 0.09, 0.72);
    tone(190, 0.05, "triangle", 0.05, 0.8);
  } else if (name === "iron") {
    tone(520, 0.05, "triangle", 0.06, 1.3);
    tone(780, 0.09, "sine", 0.05, 1.1);
  } else if (name === "build") {
    tone(180, 0.09, "square", 0.08, 1.3);
    setTimeout(() => tone(330, 0.12, "triangle", 0.09, 1.45), 70);
  } else if (name === "upgrade") {
    tone(330, 0.08, "triangle", 0.08, 1.3);
    setTimeout(() => tone(520, 0.1, "triangle", 0.08, 1.25), 70);
    setTimeout(() => tone(780, 0.14, "sine", 0.07, 1.05), 145);
  } else if (name === "shoot") tone(760, 0.035, "square", 0.025, 0.72);
  else if (name === "flame") tone(125, 0.12, "sawtooth", 0.035, 0.55);
  else if (name === "kill") {
    const pitch = 1 + Math.min(8, Math.max(0, combo - 1)) * 0.065;
    tone(220 * pitch, 0.04, "square", 0.055, 1.8);
    tone(440 * pitch, 0.07, "triangle", 0.04, 1.25);
  } else if (name === "wave") {
    tone(105, 0.3, "sawtooth", 0.09, 0.65);
    setTimeout(() => tone(85, 0.35, "sawtooth", 0.08, 0.55), 160);
  } else if (name === "base" || name === "capture" || name === "rescue") {
    tone(392, 0.1, "triangle", 0.08, 1.2);
    setTimeout(() => tone(587, 0.12, "triangle", 0.08, 1.2), 90);
    setTimeout(() => tone(784, 0.18, "sine", 0.07, 1.05), 190);
  } else if (name === "boss") {
    tone(70, 0.45, "sawtooth", 0.12, 0.55);
    setTimeout(() => tone(55, 0.55, "square", 0.09, 0.5), 240);
  }
}
