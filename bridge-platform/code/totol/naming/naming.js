/* global window */

window.addEventListener("DOMContentLoaded", () => {
  const moduleEl = document.getElementById("naming-module");
  const rootEl = document.getElementById("naming-root");
  const leavesEl = document.getElementById("naming-leaves");

  const catEls = {
    qifu: document.getElementById("naming-cat-qifu"), // 上
    material: document.getElementById("naming-cat-material"), // 下
    poetry: document.getElementById("naming-cat-poetry"), // 左
    place: document.getElementById("naming-cat-place"), // 右
  };

  if (!moduleEl || !rootEl || !leavesEl) return;

  Object.values(catEls).forEach((el) => {
    if (!el) throw new Error("命名特色模块：缺少类别圆元素");
  });

  // 将命名模块始终放在“推荐模块”下面
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

  // 一级圆目标位置（相对模块中心）
  const catPos = {
    // 二级圆（类别圆）离根圆圆心 120px：上下左右（距离相同）
    qifu: { x: 20, y: -80 }, // 上：祈福寓意
    material: { x: 20, y: 110 }, // 下：材质结构
    poetry: { x: -80, y: 20 }, // 左：诗意意象
    place: { x: 120, y: 20 }, // 右：地名方位名
  };

  // 二级圆标签
  const leavesMap = {
    qifu: ["永", "济", "安", "太平", "惠"],
    material: ["石", "木"],
    poetry: ["月", "龙", "垂红", "彩虹"],
    place: ["南", "洛阳", "泸县", "东", "西"],
  };

  // 二级圆相对“父圆”的目标偏移（相对 catPos）
  const leafRelPos = {
    // 三级圆：扇形向“远离根圆”的方向打开，避免遮住根圆/二级圆
    // 上（祈福寓意）：扇形向上打开（y 全为负）
    qifu: [
      { x: -62, y: -34 },
      { x: -34, y: -52 },
      { x: 0, y: -62 },
      { x: 34, y: -52 },
      { x: 62, y: -34 },
    ],

    // 下（材质结构）：扇形向下打开（y 全为正）
    material: [
      // 更远、更收拢：离二级圆更远，同时展开更窄
      { x: -30, y: 50 },
      { x: 40, y: 50 },
    ],

    // 左（诗意意象）：扇形向左打开（x 全为负）
    poetry: [
      { x: -34, y: -48 },
      { x: -52, y: -16 },
      { x: -52, y: 16 },
      { x: -34, y: 48 },
    ],

    // 右（地名方位名）：扇形向右打开（x 全为正）
    place: [
      // 让三级圆离二级圆更远一些
      { x: 41, y: -62 },
      { x: 62, y: -29 },
      { x: 74, y: 0 },
      { x: 62, y: 29 },
      { x: 41, y: 62 },
    ],
  };

  let level = 0; // 0: only root, 1: show cats, 2: show leaves

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

    // 根圆缩小+加深
    rootEl.classList.add("is-active");

    clearLeaves();

    // 四个类别圆：从“中心”扩散到目标位置
    Object.entries(catEls).forEach(([key, el]) => {
      const p = catPos[key];
      el.classList.add("is-visible");
      el.classList.remove("is-active");

      // 动画起点：在根圆中心（tx/ty = 0）
      el.style.setProperty("--tx", `0px`);
      el.style.setProperty("--ty", `0px`);
      el.style.setProperty("--scale", `0.45`);

      // 下一帧：移动到目标位置
      requestAnimationFrame(() => {
        el.style.setProperty("--tx", `${p.x}px`);
        el.style.setProperty("--ty", `${p.y}px`);
        el.style.setProperty("--scale", `0.92`);
      });
    });
  }

  function showLeaves(catKey) {
    level = 2;

    // 根圆恢复（不再缩小加深）
    rootEl.classList.remove("is-active");

    // 类别圆：只激活当前点击的那个
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

      // 初始：出现在父圆位置
      leaf.style.setProperty("--tx", `${parentP.x}px`);
      leaf.style.setProperty("--ty", `${parentP.y}px`);
      leaf.style.setProperty("--scale", `0.4`);

      leavesEl.appendChild(leaf);

      // 下一帧：扩散到目标位置
      requestAnimationFrame(() => {
        leaf.style.setProperty("--tx", `${targetX}px`);
        leaf.style.setProperty("--ty", `${targetY}px`);
        leaf.style.setProperty("--scale", `0.9`);
      });

      // 点击叶子：缩小+加深（只保留当前叶子 active）
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

    // 根圆恢复默认样式
    rootEl.classList.remove("is-active");

    // 二级圆全部收回并隐藏
    Object.values(catEls).forEach((el) => {
      el.classList.remove("is-active");
      el.classList.remove("is-visible");
      el.style.setProperty("--tx", `0px`);
      el.style.setProperty("--ty", `0px`);
      el.style.setProperty("--scale", `0.45`);
    });

    // 三级圆全部清空
    clearLeaves();
  }

  // 根圆点击：展开/收回切换
  rootEl.addEventListener("click", () => {
    if (level === 0) showCats();
    else collapseAll();
  });

  // 类别圆点击：打开对应二级圆
  Object.entries(catEls).forEach(([key, el]) => {
    el.addEventListener("click", () => {
      if (level === 0) showCats();
      showLeaves(key);
    });
  });

  // 从搜索模块联动：桥名 -> 根圆文字
 /* window.addEventListener("bridge-selected", (e) => {
    const name = e?.detail?.name ?? "";
    if (name) rootEl.textContent = name;
  });*/
});

