/* global echarts */

window.addEventListener("DOMContentLoaded", () => {
  const el = document.getElementById("appreciation-chart");
  if (!el || typeof echarts === "undefined") return;

  const chart = echarts.init(el, null, { renderer: "canvas" });

  // 五等分：梁桥、拱桥、索桥、浮桥、木拱廊桥
  const data = [
    { name: "梁桥", value: 20 },
    { name: "拱桥", value: 20 },
    { name: "索桥", value: 20 },
    { name: "浮桥", value: 20 },
    { name: "木拱廊桥", value: 20 },
  ];

  chart.setOption({
    backgroundColor: "transparent",
    tooltip: { show: false },
    // 参考图：平面棕色系（由深到浅）
    color: [
      "#C99255",
      "#F0E2C6",
      "#E9D1A4",
      "#DCBE84",
      "#D5AF72",
    ],
    series: [
      {
        type: "pie",
        radius: "88%",
        center: ["50%", "52%"],
        startAngle: 90,
        clockwise: true,
        data,
        label: {
          show: true,
          formatter: "{b}",
          position: "inside",
          color: "#4B2E1A",
          fontSize: 13,
          fontWeight: 700,
        },
        labelLine: { show: false },
        itemStyle: {
          borderColor: "rgba(141,106,68,0.6)",
          borderWidth: 2,
          shadowBlur: 0,
        },
        emphasis: {
          scale: false,
          itemStyle: {
            shadowBlur: 0,
          },
          label: { color: "#4B2E1A" },
        },
        animationDuration: 400,
        animationDurationUpdate: 400,
      },
    ],
  });

  chart.on("click", (params) => {
    if (params && params.name === "拱桥") {
      window.open("../archbridge/index.html", "_blank", "noopener,noreferrer");
      return;
    }
    if (params && params.name === "梁桥") {
      window.open("../beambridge/index.html", "_blank", "noopener,noreferrer");
      return;
    }
    if (params && params.name === "浮桥") {
      window.open("../pontoonbridge/index.html", "_blank", "noopener,noreferrer");
      return;
    }
    if (params && params.name === "索桥") {
      window.open("../suspensionbridge/index.html", "_blank", "noopener,noreferrer");
      return;
    }
    if (params && params.name === "木拱廊桥") {
      window.open("../loungebridge/index.html", "_blank", "noopener,noreferrer");
    }
  });

  window.addEventListener("resize", () => chart.resize());
});

