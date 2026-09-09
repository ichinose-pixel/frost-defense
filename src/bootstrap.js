// One animation loop. Rendering failures are visible rather than an unresponsive start button.
function resizeViewport() {
  resetInput();
  const width = Math.max(1, document.documentElement.clientWidth),
    height = Math.max(1, window.visualViewport?.height || innerHeight);
  renderer.setSize(width, height);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  document.documentElement.style.setProperty(
    "--viewport-height",
    height + "px",
  );
}
function reportStartupError(error) {
  console.error("Frost Defense startup failed", error);
  $("startBtn").disabled = true;
  $("startBtn").textContent = "起動できませんでした";
  $("startupError").hidden = false;
  $("startupError").textContent =
    "3D描画を開始できません。Safariなどのブラウザで開き直すか、ページを再読み込みしてください。";
}
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, clock.getDelta()),
    t = clock.elapsedTime;
  if (document.hidden || contextLost) return;
  if (running) update(dt, t);
  if (running) updateParticles(dt);
  flushWorld();
  camera.updateMatrixWorld();
  uiTime += dt;
  if (uiTime >= 0.1) {
    uiTime = 0;
    updateHUD();
    updateWorldLabels();
  }
  projectGroundTags(t);
  renderer.render(scene, camera);
}
function boot() {
  try {
    initScene();
    renderer.domElement.id = "gameCanvas";
    renderer.domElement.setAttribute("aria-label", "移動操作用ゲーム画面");
    renderer.setClearAlpha(1);
    bindInput();
    resizeViewport();
    addEventListener("resize", resizeViewport);
    window.visualViewport?.addEventListener("resize", resizeViewport);
    renderer.domElement.addEventListener("webglcontextlost", (e) => {
      e.preventDefault();
      contextLost = true;
      resetInput();
      $("runtimeStatus").hidden = false;
      $("runtimeStatus").textContent = "描画を復旧しています…";
    });
    renderer.domElement.addEventListener("webglcontextrestored", () => {
      contextLost = false;
      clock.getDelta();
      resizeViewport();
      $("runtimeStatus").hidden = true;
    });
    $("startBtn").addEventListener("click", () => {
      try {
        initAudio();
        audioCtx?.resume();
      } catch (error) {
        console.warn("Audio unavailable", error);
      }
      $("title").classList.add("hidden");
      startGame();
    });
    $("retryBtn").addEventListener("click", () => {
      $("gameover").classList.add("hidden");
      startGame();
    });
    frame();
  } catch (error) {
    reportStartupError(error);
  }
}
boot();
