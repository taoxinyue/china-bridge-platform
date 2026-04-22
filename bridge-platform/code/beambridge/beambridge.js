(function () {
  var title = document.getElementById("bridge-title");
  var panel = document.getElementById("fog-panel");
  if (!title || !panel) return;

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function updateTitleByPanel() {
    var rect = panel.getBoundingClientRect();
    var progress = clamp((window.innerHeight - rect.top) / (window.innerHeight * 0.72), 0, 1);
    var wipe = clamp(progress * 100, 0, 100);
    var fog = 0.9 - progress * 0.9;

    title.style.setProperty("--wipe", wipe.toFixed(1) + "%");
    title.style.opacity = "1";
    title.style.filter = "none";
    document.body.style.setProperty("--bg-fog-opacity", fog.toFixed(3));
  }

  window.addEventListener("scroll", updateTitleByPanel, { passive: true });
  window.addEventListener("resize", updateTitleByPanel);
  updateTitleByPanel();
})();
