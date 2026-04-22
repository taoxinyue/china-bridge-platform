window.addEventListener("DOMContentLoaded", () => {
  const moduleEl = document.getElementById("naming-module");
  const rootEl = document.getElementById("naming-root");
  const leavesEl = document.getElementById("naming-leaves");

  const catEls = {
    qifu: document.getElementById("naming-cat-qifu"),
    material: document.getElementById("naming-cat-material"),
    poetry: document.getElementById("naming-cat-poetry"),
    place: document.getElementById("naming-cat-place"),
  };

  if (!moduleEl || !rootEl || !leavesEl) return;

  Object.values(catEls).forEach((el) => {
    if (!el) throw new Error("命名特色模块：缺少类别圆元素");
  });

  const recEl = document.querySelector("section.recommendation-module");
  if (recEl) {
    const updatePosition = () => {
      const bottom = recEl.getBoundingClientRect().bottom;
      moduleEl.style.top = `${Math.round(bottom + 10)}px`;
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener(
      "scroll",
      () => requestAnimationFrame(updatePosition),
      { passive: true },
    );
  }

  const catPos = {
    qifu: { x: 20, y: -80 },
    material: { x: 20, y: 110 },
    poetry: { x: -80, y: 20 },
    place: { x: 120, y: 20 },
  };

  const leavesMap = {
    qifu: ["永", "济", "安", "太平", "惠"],
    material: ["石", "木"],
    poetry: ["月", "龙", "垂红", "彩虹"],
    place: ["南", "洛阳", "泸县", "东", "西"],
  };

  const leafRelPos = {
    qifu: [
      { x: -62, y: -34 },
      { x: -34, y: -52 },
      { x: 0, y: -62 },
      { x: 34, y: -52 },
      { x: 62, y: -34 },
    ],

    material: [
      { x: -30, y: 50 },
      { x: 40, y: 50 },
    ],

    poetry: [
      { x: -34, y: -48 },
      { x: -52, y: -16 },
      { x: -52, y: 16 },
      { x: -34, y: 48 },
    ],

    place: [
      { x: 41, y: -62 },
      { x: 62, y: -29 },
      { x: 74, y: 0 },
      { x: 62, y: 29 },
      { x: 41, y: 62 },
    ],
  };

  let level = 0;

  function clearLeaves() {
    leavesEl.innerHTML = "";
  }

  function deactivateAllCats() {
    Object.values(catEls).forEach((el) => el.classList.remove("is-active"));
  }

  function setCatVisible(catKey) {
    const el = catEls[catKey];
    if (!el) return;
    el.classList.add("is-visible");
  }

  function showCats() {
    level = 1;

    rootEl.classList.add("is-active");

    clearLeaves();

    Object.entries(catEls).forEach(([key, el]) => {
      const p = catPos[key];
      el.classList.add("is-visible");
      el.classList.remove("is-active");

      el.style.setProperty("--tx", `0px`);
      el.style.setProperty("--ty", `0px`);
      el.style.setProperty("--scale", `0.45`);

      requestAnimationFrame(() => {
        el.style.setProperty("--tx", `${p.x}px`);
        el.style.setProperty("--ty", `${p.y}px`);
        el.style.setProperty("--scale", `0.92`);
      });
    });
  }

  function showLeaves(catKey) {
    level = 2;

    rootEl.classList.remove("is-active");

    deactivateAllCats();
    Object.keys(catEls).forEach((k) => setCatVisible(k));
    const activeCat = catEls[catKey];
    if (activeCat) activeCat.classList.add("is-active");

    clearLeaves();

    const parentP = catPos[catKey];
    const labels = leavesMap[catKey] || [];
    const rels = leafRelPos[catKey] || [];

    labels.forEach((label, i) => {
      const rel = rels[i] ?? { x: 0, y: 0 };
      const targetX = parentP.x + rel.x;
      const targetY = parentP.y + rel.y;

      const leaf = document.createElement("div");
      leaf.className = "naming-circle naming-leaf is-visible";
      leaf.textContent = label;

      leaf.style.setProperty("--tx", `${parentP.x}px`);
      leaf.style.setProperty("--ty", `${parentP.y}px`);
      leaf.style.setProperty("--scale", `0.4`);

      leavesEl.appendChild(leaf);

      requestAnimationFrame(() => {
        leaf.style.setProperty("--tx", `${targetX}px`);
        leaf.style.setProperty("--ty", `${targetY}px`);
        leaf.style.setProperty("--scale", `0.9`);
      });

      leaf.addEventListener("click", () => {
        Array.from(leavesEl.children).forEach((c) =>
          c.classList.remove("is-active"),
        );
        leaf.classList.add("is-active");
      });
    });
  }

  function collapseAll() {
    level = 0;

    rootEl.classList.remove("is-active");

    Object.values(catEls).forEach((el) => {
      el.classList.remove("is-active");
      el.classList.remove("is-visible");
      el.style.setProperty("--tx", `0px`);
      el.style.setProperty("--ty", `0px`);
      el.style.setProperty("--scale", `0.45`);
    });

    clearLeaves();
  }

  rootEl.addEventListener("click", () => {
    if (level === 0) showCats();
    else collapseAll();
  });

  Object.entries(catEls).forEach(([key, el]) => {
    el.addEventListener("click", () => {
      if (level === 0) showCats();
      showLeaves(key);
    });
  });

});

