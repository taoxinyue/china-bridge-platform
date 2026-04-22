function parseCsvLine(line) {
  return String(line)
    .split(",")
    .map((s) => s.trim());
}

function escapeHtml(input) {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(input) {
  return String(input ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function loadCsv(url, expectedHeaderToken) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`加载失败：${res.status} ${res.statusText}`);

  const buf = await res.arrayBuffer();
  const bytes = new Uint8Array(buf);

  const tryDecode = (encoding) => {
    try {
      return new TextDecoder(encoding).decode(bytes);
    } catch {
      return null;
    }
  };

  let text = tryDecode("utf-8");
  if (!text || (expectedHeaderToken && !text.includes(expectedHeaderToken))) {
    const gb = tryDecode("gb18030");
    if (gb) text = gb;
  }

  if (!text) return [];

  const lines = text
    .split(/\r?\n/g)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length <= 1) return [];

  const headerRaw = parseCsvLine(lines[0]);

  if (headerRaw[0] && headerRaw[0].charCodeAt(0) === 0xfeff) {
    headerRaw[0] = headerRaw[0].slice(1);
  }

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const obj = {};
    for (let i = 0; i < headerRaw.length; i++) {
      obj[headerRaw[i]] = cols[i] ?? "";
    }
    return obj;
  });
}

function renderCards(scrollerEl, items) {
  scrollerEl.innerHTML = items
    .map(
      (it) => `
      <div class="recommendation-card" data-name="${escapeAttr(it.name)}" title="${escapeHtml(
        it.name,
      )}——${escapeHtml(it.nature)}">
        <strong>${escapeHtml(it.name)}</strong>——${escapeHtml(it.nature)}
      </div>
    `,
    )
    .join("");
}

window.addEventListener("DOMContentLoaded", async () => {
  const provinceEl = document.getElementById("recommendation-province");
  const scrollerEl = document.getElementById("recommendation-scroller");
  if (!provinceEl || !scrollerEl) return;

  const searchEl = document.querySelector("section.bridge-search-wrapper");
  const recEl = document.querySelector("section.recommendation-module");
  if (searchEl && recEl) {
    const GAP = 10;

    const updatePosition = () => {
      const rect = searchEl.getBoundingClientRect();
      recEl.style.top = `${Math.round(rect.bottom + GAP)}px`;
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener(
      "scroll",
      () => requestAnimationFrame(updatePosition),
      { passive: true },
    );
  }

  provinceEl.textContent = "全国";

  let nationalItems = [];

  try {
    const nationalRows = await loadCsv(
      "../../data/推荐.csv",
      "名称,性质",
    );
    nationalItems = nationalRows.map((r) => ({
      name: r["名称"] ?? "",
      nature: r["性质"] ?? "",
    }));
  } catch (e) {
    console.error(e);
    scrollerEl.innerHTML = `<div class="recommendation-card">推荐数据加载失败</div>`;
    return;
  }

  renderCards(scrollerEl, nationalItems);

  scrollerEl.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;
    const card = target.closest(".recommendation-card");
    if (!card) return;

    const name = card.dataset.name;
    if (!name) return;

    const baikeUrl =
      "https://baike.baidu.com/item/" + encodeURIComponent(name);
    window.open(baikeUrl, "_blank");
  });

  let provinceRowsCache = null;

  async function ensureProvinceRows() {
    if (provinceRowsCache) return provinceRowsCache;
    provinceRowsCache = await loadCsv(
      "../../data/各省推荐.csv",
      "省份,行政区,名称,朝代,性质",
    );
    return provinceRowsCache;
  }

  window.addEventListener("province-selected", async (e) => {
    const province = e?.detail?.province ?? "";
    if (!province) return;

    provinceEl.textContent = province;

    const rows = await ensureProvinceRows();
    const items = rows
      .filter((r) => (r["省份"] ?? "") === province)
      .map((r) => ({
        name: r["名称"] ?? "",
        nature: r["性质"] ?? "",
      }));

    if (!items.length) {
      renderCards(scrollerEl, [{ name: "暂无推荐", nature: "" }]);
      return;
    }
    renderCards(scrollerEl, items);
  });

  window.addEventListener("province-cleared", () => {
    provinceEl.textContent = "全国";
    renderCards(scrollerEl, nationalItems);
  });
});

