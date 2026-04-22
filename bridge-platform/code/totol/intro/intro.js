window.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("intro-overlay");
  if (!overlay) return;

  let finished = false;
  const reveal = () => {
    if (finished) return;
    finished = true;
    overlay.classList.add("is-revealing");
    window.setTimeout(() => {
      overlay.classList.add("is-hidden");
    }, 4500);
    window.setTimeout(() => {
      overlay.remove();
    }, 5200);
  };

  overlay.addEventListener("click", reveal);
  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      reveal();
    }
  });
});
