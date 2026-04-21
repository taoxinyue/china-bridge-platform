window.addEventListener("DOMContentLoaded", () => {
  const overlay = document.getElementById("intro-overlay");
  if (!overlay) return;

  let finished = false;
  const reveal = () => {
    if (finished) return;
    finished = true;
    overlay.classList.add("is-revealing");
    /* 与 search.css 中 introMistInsideOut 4.5s 对齐 */
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
