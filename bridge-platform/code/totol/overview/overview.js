/* global echarts */

function parseCsvLine(line) {
  // This dataset uses simple comma-separated values without quotes.
  return String(line)
    .split(",")
    .map((s) => s.trim());
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

  const header = parseCsvLine(lines[0]);
  const idx = (name) => header.indexOf(name);

  return lines.slice(1).map((line) => {
    const cols = parseCsvLine(line);
    const obj = {};
    for (let i = 0; i < header.length; i++) obj[header[i]] = cols[i] ?? "";
    return obj;
  });
}

function toNumber(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function computeDynastyData(dynastyRows) {
  // input: [{朝代:'清',桥梁数量:'37'}, ...]
  const all = dynastyRows.map((r) => ({
    name: r["朝代"],
    value: toNumber(r["桥梁数量"]),
  }));

  const map = new Map(all.map((d) => [d.name, d.value]));
  const q = map.get("清") ?? 0;
  const m = map.get("明") ?? 0;
  const s = map.get("宋") ?? 0;
  const other = all.reduce((sum, d) => {
    if (d.name === "清" || d.name === "明" || d.name === "宋") return sum;
    return sum + d.value;
  }, 0);

  return {
    pie: [
      { name: "清", value: q },
      { name: "明", value: m },
      { name: "宋", value: s },
      { name: "其他", value: other },
    ],
    bar: all, // show all dynasties
  };
}

function computeProvinceData(rows) {
  const all = rows.map((r) => ({
    name: r["省份"],
    value: toNumber(r["桥梁数量"]),
  }));

  const top = new Set(["浙江省", "河北省", "福建省", "江西省", "江苏省", "云南省", "河南省"]);

  let other = 0;
  const pie = [];
  for (const item of all) {
    if (top.has(item.name)) {
      pie.push({ name: item.name, value: item.value });
    } else {
      other += item.value;
    }
  }

  pie.push({ name: "其他", value: other });
  return {
    pie, // fixed merged categories
    bar: all, // show all provinces
  };
}

function buildPieOption(data, titlePrefix) {
  const isProvincePie = titlePrefix === "省份：";
  return {
    backgroundColor: "transparent",
    color: [
      "#F6ECDD",
      "#EFE1CA",
      "#E6D2B3",
      "#DABD98",
      "#CFA97F",
      "#BE946A",
      "#A97D55",
      "#8E6441",
    ],
    tooltip: {
      trigger: "item",
      formatter: (p) => {
        const value = p.value ?? 0;
        const percent = p.percent ?? 0;
        return `${titlePrefix}${p.name}<br/>${value} 座<br/>占比 ${percent}%`;
      },
    },
    legend: isProvincePie
      ? {
          show: true,
          type: "scroll",
          orient: "vertical",
          right: 6,
          top: "middle",
          textStyle: {
            color: "rgba(75,50,32,0.9)",
            fontSize: 11,
          },
          itemWidth: 10,
          itemHeight: 10,
        }
      : { show: false },
    series: [
      {
        type: "pie",
        radius: isProvincePie ? "66%" : "72%",
        center: isProvincePie ? ["36%", "52%"] : ["50%", "52%"],
        avoidLabelOverlap: true,
        label: {
          show: !isProvincePie,
          position: "inside",
          color: "rgba(75,50,32,0.95)",
          fontSize: 12,
          formatter: "{b}",
        },
        labelLine: {
          show: false,
          lineStyle: { color: "rgba(148,112,76,0.45)" },
        },
        itemStyle: {
          borderRadius: 0,
          borderColor: "rgba(148,112,76,0.18)",
          borderWidth: 1,
        },
        emphasis: {
          scale: true,
          scaleSize: 10,
          itemStyle: {
            shadowBlur: 22,
            shadowColor: "rgba(178, 82, 27, 0.35)",
          },
        },
        data,
        animationType: "cubicOut",
        animationDuration: 520,
        animationDurationUpdate: 520,
      },
    ],
  };
}

function buildBarOption(categories, values, titlePrefix) {
  return {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      formatter: (params) => {
        const p = params && params[0];
        if (!p) return "";
        const cat = p.axisValue ?? "";
        const value = p.data ?? 0;
        return `${titlePrefix}${cat}<br/>${value} 座`;
      },
    },
    grid: {
      left: 52,
      right: 24,
      top: 18,
      bottom: 30,
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: categories,
      axisLabel: {
        color: "rgba(75,50,32,0.85)",
        fontSize: 12,
        interval: 0,
        formatter: (v) => String(v),
        // 顺时针旋转 90°
        rotate: 90,
        align: "center",
        verticalAlign: "top",
        margin: 40,
      },
      splitLine: {
        lineStyle: { color: "rgba(148,112,76,0.15)" },
      },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: "rgba(75,50,32,0.95)",
        fontSize: 12,
      },
    },
    series: [
      {
        type: "bar",
        barWidth: 14,
        data: values,
        itemStyle: {
          borderRadius: 0,
          color: "rgba(178, 82, 27, 0.34)",
        },
        emphasis: {
          itemStyle: {
            color: "rgba(178, 82, 27, 0.62)",
            shadowBlur: 18,
            shadowColor: "rgba(178, 82, 27, 0.25)",
          },
        },
        animationDuration: 700,
        animationDurationUpdate: 700,
        animationEasing: "cubicOut",
      },
    ],
  };
}

function titlePrefixForPanel(panel) {
  // Keep text consistent with “hover show quantity”.
  return panel === "province" ? "省份：" : "朝代：";
}

window.addEventListener("DOMContentLoaded", async () => {
  const chartEl = document.getElementById("overview-chart");
  const chartScroll = document.getElementById("chart-scroll");
  if (!chartEl || !chartScroll) return;

  const btnPanelProvince = document.getElementById("btn-panel-province");
  const btnPanelDynasty = document.getElementById("btn-panel-dynasty");
  const btnStylePie = document.getElementById("btn-style-pie");
  const btnStyleBar = document.getElementById("btn-style-bar");
  if (!btnPanelProvince || !btnPanelDynasty || !btnStylePie || !btnStyleBar) return;

  let panel = "province";
  let style = "pie";

  function syncButtons() {
    btnPanelProvince.classList.toggle("is-active", panel === "province");
    btnPanelDynasty.classList.toggle("is-active", panel === "dynasty");
    btnStylePie.classList.toggle("is-active", style === "pie");
    btnStyleBar.classList.toggle("is-active", style === "bar");
  }

  // Init echarts
  const chart = echarts.init(chartEl, null, { renderer: "canvas" });
  chartEl.style.width = "100%";
  chartEl.style.height = `${chartScroll.clientHeight}px`;

  let dynasty = null;
  let province = null;

  try {
    const dynastyRows = await loadCsv(
      "../../data/朝代桥梁数量.csv",
      "朝代,桥梁数量",
    );
    dynasty = computeDynastyData(dynastyRows);

    const provinceRows = await loadCsv(
      "../../data/省份桥梁数量.csv",
      "省份,桥梁数量",
    );
    province = computeProvinceData(provinceRows);
  } catch (e) {
    console.error(e);
    chartEl.innerHTML = "数据加载失败";
    return;
  }

  function setScrollMode(nextStyle) {
    if (nextStyle === "pie") {
      chartScroll.classList.add("is-pie");
      chartScroll.style.overflowY = "hidden";
      chartScroll.style.overflowX = "hidden";
      chart.resize();
      chartEl.style.width = "100%";
      chartEl.style.height = `${chartScroll.clientHeight}px`;
      chart.resize();
    } else {
      chartScroll.classList.remove("is-pie");
      // Enable vertical scrollbar as fallback for rotated/cut labels.
      chartScroll.style.overflowY = "auto";
      chartScroll.style.overflowX = "auto";
      // Height is computed in renderBar because categories count differs.
    }
  }

  function renderPie() {
    const data =
      panel === "province" ? province.pie : dynasty.pie;

    // Rotate animation on switching to pie.
    chartEl.classList.remove("pie-open");
    chartEl.getBoundingClientRect(); // force reflow
    chartEl.classList.add("pie-open");

    const titlePrefix = titlePrefixForPanel(panel);

    // Pie “from nothing”: first render 0-values, then quickly update real values.
    const zeroData = data.map((d) => ({ name: d.name, value: 0 }));
    chartEl.style.width = "100%";
    chart.setOption(buildPieOption(zeroData, titlePrefix), true);
    setTimeout(() => {
      chartEl.style.width = "100%";
      chart.setOption(buildPieOption(data, titlePrefix), true);
    }, 30);
  }

  function renderBar() {
    const data = panel === "province" ? province.bar : dynasty.bar;
    const categories = data.map((d) => d.name);
    const values = data.map((d) => d.value);

    // Vertical bar: keep chart within the fixed container.
    const colWidth = 26;
    const extra = 80; // axes/inner padding reserve
    chartEl.style.width = `${categories.length * colWidth + extra}px`;
    // If rotated x-axis labels are cut, show a vertical scrollbar by
    // slightly expanding canvas height in bar mode.
    const yExtra = 60;
    chartEl.style.height = `${chartScroll.clientHeight + yExtra}px`;
    chart.resize();

    const titlePrefix = titlePrefixForPanel(panel);

    // “Horizontal expand” animation: render zeros first.
    const zeroValues = values.map(() => 0);
    const option0 = buildBarOption(categories, zeroValues, titlePrefix);
    chart.setOption(option0, true);

    const option1 = buildBarOption(categories, values, titlePrefix);
    setTimeout(() => {
      chart.setOption(option1, true);
    }, 40);
  }

  function render() {
    syncButtons();
    setScrollMode(style);

    if (style === "pie") renderPie();
    else renderBar();

    // Resize after DOM updates
    requestAnimationFrame(() => chart.resize());
  }

  btnPanelProvince.addEventListener("click", () => {
    panel = "province";
    render();
  });
  btnPanelDynasty.addEventListener("click", () => {
    panel = "dynasty";
    render();
  });
  btnStylePie.addEventListener("click", () => {
    style = "pie";
    render();
  });
  btnStyleBar.addEventListener("click", () => {
    style = "bar";
    render();
  });

  window.addEventListener("resize", () => chart.resize());

  render();
});

