function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function highlightKeyword(text, keyword) {
  const safeText = escapeHtml(text ?? "");
  const safeKw = escapeHtml(keyword ?? "");
  if (!safeKw) return safeText;
  // Simple contains-based highlighting (Chinese keywords are fine).
  return safeText.split(safeKw).join(
    `<span class="bridge-search-highlight">${safeKw}</span>`,
  );
}

function parseCsvLine(line) {
  // This dataset uses simple comma-separated values without quotes.
  // (If later you add quoted commas, we can upgrade to a full CSV parser.)
  return line.split(",").map((s) => s.trim());
}

async function loadBridgeCatalog() {
  // index.html 位于 code/totol/search/，到项目根目录退三级 ../../../，
  // 再进入 data 目录
  const res = await fetch("../../../data/总目录.csv");
  if (!res.ok) throw new Error(`加载失败：${res.status} ${res.statusText}`);

  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);

  // CSV 可能是 UTF-8 或 GBK/GB18030（Windows 常见）。
  const tryDecode = (encoding) => {
    try {
      return new TextDecoder(encoding).decode(bytes);
    } catch {
      return null;
    }
  };

  let text = tryDecode("utf-8");
  if (!text || !text.includes("省份,行政区,名称,朝代")) {
    const gb = tryDecode("gb18030");
    if (gb) text = gb;
  }

  if (!text) text = "";
  const lines = text
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [];

  const header = parseCsvLine(lines[0]);
  const idxProvince = header.indexOf("省份");
  const idxDistrict = header.indexOf("行政区");
  const idxName = header.indexOf("名称");
  const idxDynasty = header.indexOf("朝代");

  return lines.slice(1).map((line, i) => {
    const cols = parseCsvLine(line);
    return {
      id: `bridge-${i + 1}`,
      province: cols[idxProvince] ?? "",
      district: cols[idxDistrict] ?? "",
      name: cols[idxName] ?? "",
      dynasty: cols[idxDynasty] ?? "",
    };
  });
}

function debounce(fn, waitMs) {
  let t = null;
  return (...args) => {
    if (t) clearTimeout(t);
    t = setTimeout(() => fn(...args), waitMs);
  };
}

function setDropdownVisible(dropdown, input, visible) {
  dropdown.style.display = visible ? "block" : "none";
  input.setAttribute("aria-expanded", visible ? "true" : "false");
}

function getItems(dropdown) {
  return Array.from(dropdown.querySelectorAll(".bridge-search-item"));
}

function setActive(dropdown, index) {
  const items = getItems(dropdown);
  items.forEach((el, i) => el.classList.toggle("active", i === index));

  const activeEl = items[index];
  if (!activeEl) return;

  // Ensure active item stays visible.
  const top = activeEl.offsetTop;
  const bottom = top + activeEl.offsetHeight;
  const viewTop = dropdown.scrollTop;
  const viewBottom = viewTop + dropdown.clientHeight;
  if (top < viewTop) dropdown.scrollTop = top;
  else if (bottom > viewBottom) dropdown.scrollTop = bottom - dropdown.clientHeight;
}

window.addEventListener("DOMContentLoaded", async () => {
  const input = document.getElementById("bridge-search-input");
  const dropdown = document.getElementById("bridge-search-dropdown");
  if (!input || !dropdown) return;

  let bridgeList = [];
  try {
    bridgeList = await loadBridgeCatalog();
  } catch (e) {
    console.error(e);
  }

  let filtered = [];
  let activeIndex = -1;

  function hideDropdown() {
    setDropdownVisible(dropdown, input, false);
    activeIndex = -1;
  }

  function selectBridge(bridge) {
    input.value = bridge.name;
    hideDropdown();

    // 1. 打开百度百科词条（新标签页）
    const baikeUrl =
      "https://baike.baidu.com/item/" + encodeURIComponent(bridge.name);
    window.open(baikeUrl, "_blank");

    // 2. 保留事件，方便与其它模块联动
    window.dispatchEvent(
      new CustomEvent("bridge-selected", { detail: bridge }),
    );
  }

  function render(keyword) {
    const kw = keyword.trim();
    dropdown.innerHTML = "";
    activeIndex = -1;

    if (!kw) {
      hideDropdown();
      return;
    }

    filtered = bridgeList.filter((b) => (b.name ?? "").includes(kw));

    if (filtered.length === 0) {
      dropdown.innerHTML = `<li class="bridge-search-empty">未找到匹配项</li>`;
      setDropdownVisible(dropdown, input, true);
      return;
    }

    const frag = document.createDocumentFragment();
    for (let i = 0; i < filtered.length; i++) {
      const bridge = filtered[i];

      const li = document.createElement("li");
      li.className = "bridge-search-item";
      li.setAttribute("role", "option");
      li.dataset.index = String(i);

      // 展示：名称-省份（朝代）
      const titleHtml = `${highlightKeyword(bridge.name, kw)} - ${escapeHtml(
        bridge.province,
      )}（${escapeHtml(bridge.dynasty)}）`;

      li.innerHTML = `<span class="bridge-search-item-title">${titleHtml}</span>`;

      li.addEventListener("mouseenter", () => {
        activeIndex = i;
        setActive(dropdown, activeIndex);
      });
      li.addEventListener("mousedown", (e) => {
        // Prevent blur before click select.
        e.preventDefault();
      });
      li.addEventListener("click", () => selectBridge(bridge));

      frag.appendChild(li);
    }
    dropdown.appendChild(frag);
    setDropdownVisible(dropdown, input, true);
  }

  const onInput = debounce(() => render(input.value), 120);
  input.addEventListener("input", onInput);

  input.addEventListener("focus", () => {
    if (input.value.trim()) render(input.value);
  });

  input.addEventListener("keydown", (e) => {
    const isVisible = dropdown.style.display !== "none";
    if (!isVisible && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      if (input.value.trim()) render(input.value);
      return;
    }

    if (dropdown.style.display === "none") return;

    if (filtered.length === 0) return;

    if (e.key === "Escape") {
      e.preventDefault();
      hideDropdown();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % filtered.length;
      setActive(dropdown, activeIndex);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + filtered.length) % filtered.length;
      setActive(dropdown, activeIndex);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < filtered.length) {
        e.preventDefault();
        selectBridge(filtered[activeIndex]);
      }
    }
  });

  document.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Node)) return;
    if (dropdown.contains(target) || input.contains(target)) return;
    hideDropdown();
  });
});

