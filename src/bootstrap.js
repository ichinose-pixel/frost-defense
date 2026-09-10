// One animation loop. Rendering failures are visible rather than an unresponsive start button.
function resizeViewport() {
  resetInput();
  const visual = window.visualViewport,
    width = Math.max(
      1,
      visual?.width || document.documentElement.clientWidth || innerWidth,
    ),
    height = Math.max(1, visual?.height || innerHeight),
    left = visual?.offsetLeft || 0,
    top = visual?.offsetTop || 0,
    style = $("gameViewport").style;
  style.setProperty("--viewport-width", width + "px");
  style.setProperty("--viewport-height", height + "px");
  style.setProperty("--viewport-left", left + "px");
  style.setProperty("--viewport-top", top + "px");
  if (renderer) renderer.setSize(width, height);
  if (camera) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
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
    // Fit the title/errors as well, even if GPU initialization fails.
    resizeViewport();
    addEventListener("resize", resizeViewport);
    addEventListener("pageshow", resizeViewport);
    window.visualViewport?.addEventListener("resize", resizeViewport);
    window.visualViewport?.addEventListener("scroll", resizeViewport);
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) resizeViewport();
    });
    initScene();
    renderer.domElement.id = "gameCanvas";
    renderer.domElement.setAttribute("aria-label", "移動操作用ゲーム画面");
    renderer.setClearAlpha(1);
    bindInput();
    resizeViewport();
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
