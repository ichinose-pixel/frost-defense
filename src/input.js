// Only movement is bound; one pointer owns the joystick until release/cancel.
const keys = {};
let joyId = null,
  joyVec = { x: 0, y: 0 };
const joyBase = $("joyBase"),
  joyKnob = $("joyKnob");
function resetInput() {
  const id = joyId;
  joyId = null;
  joyVec = { x: 0, y: 0 };
  for (const k of Object.keys(keys)) delete keys[k];
  joyBase.style.display = joyKnob.style.display = "none";
  if (id !== null && renderer?.domElement.hasPointerCapture?.(id))
    renderer.domElement.releasePointerCapture(id);
}
function bindInput() {
  const canvas = renderer.domElement;
  canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (
        !running ||
        document.hidden ||
        contextLost ||
        joyId !== null ||
        e.button > 0
      )
        return;
      e.preventDefault();
      joyId = e.pointerId;
      canvas.setPointerCapture?.(joyId);
      joyBase._ox = e.clientX;
      joyBase._oy = e.clientY;
      joyBase.style.cssText = `display:block;left:${e.clientX - 62}px;top:${e.clientY - 62}px`;
      joyKnob.style.cssText = `display:block;left:${e.clientX - 27}px;top:${e.clientY - 27}px`;
      audioCtx?.resume();
    },
    { passive: false },
  );
  addEventListener("pointermove", (e) => {
    if (e.pointerId !== joyId) return;
    let dx = e.clientX - joyBase._ox,
      dy = e.clientY - joyBase._oy;
    const d = Math.hypot(dx, dy),
      max = 48;
    if (d > max) {
      dx *= max / d;
      dy *= max / d;
    }
    joyVec = { x: dx / max, y: -dy / max };
    joyKnob.style.left = joyBase._ox + dx - 27 + "px";
    joyKnob.style.top = joyBase._oy + dy - 27 + "px";
  });
  const end = (e) => {
    if (e.pointerId === joyId) resetInput();
  };
  addEventListener("pointerup", end);
  addEventListener("pointercancel", end);
  canvas.addEventListener("lostpointercapture", end);
  addEventListener("keydown", (e) => {
    if (!running) return;
    if (/^(Key[WASD]|Arrow(Up|Down|Left|Right))$/.test(e.code)) {
      e.preventDefault();
      keys[e.code] = true;
    }
  });
  addEventListener("keyup", (e) => delete keys[e.code]);
  addEventListener("blur", resetInput);
  document.addEventListener("visibilitychange", () => {
    resetInput();
    clock.getDelta();
    if (document.hidden) audioCtx?.suspend();
    else if (running) audioCtx?.resume();
  });
}
