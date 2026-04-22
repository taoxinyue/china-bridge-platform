(function () {
  "use strict";

  function parseImages(root) {
    var raw = root.getAttribute("data-images");
    if (!raw) return null;
    try {
      var list = JSON.parse(raw);
      return Array.isArray(list) && list.length ? list : null;
    } catch (e) {
      return null;
    }
  }

  function applyFrame(root, list, index) {
    var n = list.length;
    var slides = root.querySelectorAll(".bridge-carousel-slide");
    if (slides.length < 3) return;

    var prev = (index - 1 + n) % n;
    var next = (index + 1) % n;

    var pairs = [
      { el: slides[0], item: list[prev] },
      { el: slides[1], item: list[index] },
      { el: slides[2], item: list[next] },
    ];

    for (var i = 0; i < pairs.length; i++) {
      var img = pairs[i].el.querySelector("img");
      if (!img || !pairs[i].item) continue;
      img.src = pairs[i].item[0];
      img.alt = pairs[i].item[1] || "";
    }

    slides[0].className = "bridge-carousel-slide";
    slides[1].className = "bridge-carousel-slide";
    slides[2].className = "bridge-carousel-slide";

    if (n === 1) {
      slides[0].classList.add("is-hidden");
      slides[1].classList.add("is-active");
      slides[2].classList.add("is-hidden");
    } else {
      slides[0].classList.add("is-prev");
      slides[1].classList.add("is-active");
      slides[2].classList.add("is-next");
    }

    root.setAttribute("data-carousel-index", String(index));
  }

  function initCarousel(root) {
    var list = parseImages(root);
    if (!list || list.length === 0) return;

    var index = 0;
    var prevBtn = root.querySelector(".bridge-carousel-btn-prev");
    var nextBtn = root.querySelector(".bridge-carousel-btn-next");

    function go(delta) {
      var n = list.length;
      if (n < 1) return;
      index = (index + delta + n) % n;
      applyFrame(root, list, index);
    }

    if (prevBtn) {
      prevBtn.addEventListener("click", function () {
        go(-1);
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener("click", function () {
        go(1);
      });
    }

    applyFrame(root, list, index);
  }

  document.querySelectorAll("[data-bridge-carousel]").forEach(initCarousel);
})();
