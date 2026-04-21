/**
 * 地图：ECharts GL map3D，设色来自 省份桥梁数量.csv，桥梁列表来自 总目录.csv
 * 联动：window province-selected / province-cleared → 推荐（各省推荐.csv）
 */
(function () {
  "use strict";

  // 地图来源：国家地理信息公共服务平台（天地图）
  // 审图号：GS(2024)0650号
  var CHINA_GEOJSON_URL = "../../data/中国_省.geojson";

  /**
   * 海南省 MultiPolygon 中，质心纬度低于此值的岛礁划到附图（与主岛分离）。
   * 可按显示效果微调（约 18.3～18.6）。
   */
  var HAINAN_INSET_MAX_LAT = 18.42;

  var DATA_CATALOG_CSV = "../../data/总目录.csv";
  var DATA_PROVINCE_COUNT_CSV = "../../data/省份桥梁数量.csv";

  var GEO_TO_CSV = {
    北京: "北京市",
    天津: "天津市",
    河北: "河北省",
    山西: "山西省",
    内蒙古: "内蒙古自治区",
    辽宁: "辽宁省",
    吉林: "吉林省",
    黑龙江: "黑龙江省",
    上海: "上海市",
    江苏: "江苏省",
    浙江: "浙江省",
    安徽: "安徽省",
    福建: "福建省",
    江西: "江西省",
    山东: "山东省",
    河南: "河南省",
    湖北: "湖北省",
    湖南: "湖南省",
    广东: "广东省",
    广西: "广西壮族自治区",
    海南: "海南省",
    重庆: "重庆市",
    四川: "四川省",
    贵州: "贵州省",
    云南: "云南省",
    西藏: "西藏自治区",
    陕西: "陕西省",
    甘肃: "甘肃省",
    青海: "青海省",
    宁夏: "宁夏回族自治区",
    新疆: "新疆维吾尔自治区",
    台湾: "台湾省",
    香港: "香港特别行政区",
    澳门: "澳门特别行政区",
  };

  var PROVINCE_CAPITALS = {
    北京市: [116.407526, 39.90403],
    天津市: [117.200983, 39.084158],
    河北省: [114.502461, 38.045474],
    山西省: [112.549248, 37.857014],
    内蒙古自治区: [111.670801, 40.818311],
    辽宁省: [123.429096, 41.796767],
    吉林省: [125.3245, 43.886841],
    黑龙江省: [126.642464, 45.756967],
    上海市: [121.472644, 31.231706],
    江苏省: [118.767413, 32.041544],
    浙江省: [120.153576, 30.287459],
    安徽省: [117.283042, 31.86119],
    福建省: [119.306239, 26.075302],
    江西省: [115.892151, 28.676493],
    山东省: [117.000923, 36.675807],
    河南省: [113.665412, 34.757975],
    湖北省: [114.298572, 30.584355],
    湖南省: [112.982279, 28.19409],
    广东省: [113.280637, 23.125178],
    广西壮族自治区: [108.320004, 22.82402],
    海南省: [110.33119, 20.031971],
    重庆市: [106.504962, 29.533155],
    四川省: [104.065735, 30.659462],
    贵州省: [106.713478, 26.578343],
    云南省: [102.712251, 25.040609],
    西藏自治区: [91.132212, 29.660361],
    陕西省: [108.948024, 34.263161],
    甘肃省: [103.823557, 36.058039],
    青海省: [101.778916, 36.623178],
    宁夏回族自治区: [106.278179, 38.46637],
    新疆维吾尔自治区: [87.617733, 43.792818],
    台湾省: [121.509062, 25.044332],
    香港特别行政区: [114.173355, 22.320048],
    澳门特别行政区: [113.54909, 22.198951],
  };

  var chart = null;
  /** 右下角 2D 南海附图（与主图 map3D 独立） */
  var chartInset = null;
  /**
   * 主图已改为 margin-top + height 填满容器（无 translateY），一般为 0；
   * 若标记与地图有偏差可微调（px）。
   */
  var MAP_CHART_OFFSET_Y = 0;
  /** 与 map.css 中 .map-chart margin-left 一致（左移为负 px） */
  var MAP_CHART_OFFSET_X = -20;
  var bridgeCountMap = {};
  var bridgesByProvince = {};
  var selectedCsv = null;

  function parseCsv(text) {
    var rows = [];
    var i = 0;
    var field = "";
    var row = [];
    var inQuotes = false;
    while (i < text.length) {
      var c = text[i];
      if (inQuotes) {
        if (c === '"') {
          if (text[i + 1] === '"') {
            field += '"';
            i += 2;
            continue;
          }
          inQuotes = false;
          i++;
          continue;
        }
        field += c;
        i++;
        continue;
      }
      if (c === '"') {
        inQuotes = true;
        i++;
        continue;
      }
      if (c === ",") {
        row.push(field);
        field = "";
        i++;
        continue;
      }
      if (c === "\r") {
        i++;
        continue;
      }
      if (c === "\n") {
        row.push(field);
        if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
          rows.push(row);
        }
        row = [];
        field = "";
        i++;
        continue;
      }
      field += c;
      i++;
    }
    row.push(field);
    if (row.length > 1 || (row.length === 1 && row[0] !== "")) {
      rows.push(row);
    }
    return rows;
  }

  function loadText(url) {
    return fetch(url).then(function (r) {
      if (!r.ok) throw new Error("加载失败: " + url);
      return r.text();
    });
  }

  function ringCentroid(ring) {
    if (!ring || !ring.length) return [0, 0];
    var n = ring.length;
    var last = n - 1;
    if (
      ring[0][0] === ring[last][0] &&
      ring[0][1] === ring[last][1]
    ) {
      n--;
    }
    if (n <= 0) return [ring[0][0], ring[0][1]];
    var sx = 0;
    var sy = 0;
    for (var i = 0; i < n; i++) {
      sx += ring[i][0];
      sy += ring[i][1];
    }
    return [sx / n, sy / n];
  }

  function ringSignedArea(ring) {
    if (!ring || ring.length < 3) return 0;
    var area = 0;
    var j = ring.length - 1;
    for (var i = 0; i < ring.length; i++) {
      area += ring[j][0] * ring[i][1] - ring[i][0] * ring[j][1];
      j = i;
    }
    return Math.abs(area / 2);
  }

  /**
   * 将海南省 MultiPolygon 拆成主图面 + 附图面（远海诸岛）。
   */
  function splitHainanGeometry(multiPolygonCoords) {
    var mainPolys = [];
    var insetPolys = [];
    if (!multiPolygonCoords || !multiPolygonCoords.length) {
      return { mainPolys: mainPolys, insetPolys: insetPolys };
    }
    var i;
    for (i = 0; i < multiPolygonCoords.length; i++) {
      var polygon = multiPolygonCoords[i];
      var exterior = polygon[0];
      if (!exterior || !exterior.length) continue;
      var c = ringCentroid(exterior);
      if (c[1] < HAINAN_INSET_MAX_LAT) {
        insetPolys.push(polygon);
      } else {
        mainPolys.push(polygon);
      }
    }
    if (mainPolys.length === 0 && multiPolygonCoords.length > 0) {
      var bestIdx = 0;
      var bestA = -1;
      for (i = 0; i < multiPolygonCoords.length; i++) {
        var a = ringSignedArea(multiPolygonCoords[i][0] || []);
        if (a > bestA) {
          bestA = a;
          bestIdx = i;
        }
      }
      mainPolys = [multiPolygonCoords[bestIdx]];
      insetPolys = [];
      for (i = 0; i < multiPolygonCoords.length; i++) {
        if (i !== bestIdx) insetPolys.push(multiPolygonCoords[i]);
      }
    }
    return { mainPolys: mainPolys, insetPolys: insetPolys };
  }

  function cloneFeature(f) {
    return JSON.parse(JSON.stringify(f));
  }

  /**
   * 主图：去掉九段线 JD；海南省仅保留主岛/近岸面。
   * 附图：JD + 南海诸岛（从海南省拆出的远海面）。
   */
  function processChinaGeoJson(fullGeoJson) {
    var features = (fullGeoJson && fullGeoJson.features) || [];
    var jdFeatures = [];
    var mainFeatures = [];
    var insetIslandPolys = [];
    var fi;
    for (fi = 0; fi < features.length; fi++) {
      var f = features[fi];
      var pr = f.properties || {};
      if (pr.adcode === "100000_JD" || pr.adchar === "JD") {
        jdFeatures.push(cloneFeature(f));
        continue;
      }
      var isHainan =
        pr.name === "海南省" ||
        pr.adcode === 460000 ||
        pr.adcode === "460000";
      var geom = f.geometry;

      // 过滤线要素（如“境界线”），仅保留省级面要素
      if (!geom || (geom.type !== "Polygon" && geom.type !== "MultiPolygon")) {
        continue;
      }
      if (pr.name === "境界线" || pr.name === "边界线") {
        continue;
      }

      if (isHainan && geom.type === "MultiPolygon" && geom.coordinates) {
        var sp = splitHainanGeometry(geom.coordinates);
        var newHainan = cloneFeature(f);
        newHainan.geometry = {
          type: "MultiPolygon",
          coordinates: sp.mainPolys,
        };
        mainFeatures.push(newHainan);
        var pi;
        for (pi = 0; pi < sp.insetPolys.length; pi++) {
          insetIslandPolys.push(sp.insetPolys[pi]);
        }
        continue;
      }
      mainFeatures.push(cloneFeature(f));
    }
    var insetFeatures = jdFeatures.slice();
    if (insetIslandPolys.length > 0) {
      insetFeatures.push({
        type: "Feature",
        properties: {
          name: "南海诸岛",
          adcode: "460000_NQ",
          level: "inset",
        },
        geometry: {
          type: "MultiPolygon",
          coordinates: insetIslandPolys,
        },
      });
    }
    return {
      mainGeoJson: { type: "FeatureCollection", features: mainFeatures },
      insetGeoJson: { type: "FeatureCollection", features: insetFeatures },
    };
  }

  function stripAdminSuffix(s) {
    return String(s || "").replace(
      /省|市|自治区|特别行政区|壮族|回族|维吾尔/g,
      "",
    );
  }

  function geoNameToCsvProvince(geoName) {
    if (!geoName) return null;
    if (geoName === "南海诸岛") return "海南省";
    if (PROVINCE_CAPITALS[geoName]) return geoName;
    var short = stripAdminSuffix(geoName);
    if (GEO_TO_CSV[short]) return GEO_TO_CSV[short];
    if (GEO_TO_CSV[geoName]) return GEO_TO_CSV[geoName];
    if (bridgeCountMap[geoName] !== undefined && bridgeCountMap[geoName] !== "") {
      return geoName;
    }
    if (bridgesByProvince[geoName]) return geoName;
    return null;
  }

  function buildBridgeCountMap(rows) {
    var m = {};
    if (!rows || rows.length < 2) return m;
    var header = rows[0];
    if (header[0] && header[0].charCodeAt(0) === 0xfeff) {
      header[0] = header[0].slice(1);
    }
    var idxP = header.indexOf("省份");
    var idxC = header.indexOf("桥梁数量");
    if (idxP < 0 || idxC < 0) return m;
    for (var i = 1; i < rows.length; i++) {
      var row = rows[i];
      var p = (row[idxP] || "").trim();
      var c = (row[idxC] || "").trim();
      if (p) m[p] = c;
    }
    return m;
  }

  function buildBridgesByProvince(rows) {
    bridgesByProvince = {};
    if (!rows || rows.length < 2) return;
    var header = rows[0];
    if (header[0] && header[0].charCodeAt(0) === 0xfeff) {
      header[0] = header[0].slice(1);
    }
    var idxP = header.indexOf("省份");
    var idxN = header.indexOf("名称");
    if (idxP < 0 || idxN < 0) return;
    for (var r = 1; r < rows.length; r++) {
      var row = rows[r];
      var prov = (row[idxP] || "").trim();
      var name = (row[idxN] || "").trim();
      if (!prov || !name) continue;
      if (!bridgesByProvince[prov]) bridgesByProvince[prov] = [];
      bridgesByProvince[prov].push(name);
    }
  }

  function getCountForCsvProvince(csvP) {
    if (!csvP) return 0;
    var raw = bridgeCountMap[csvP];
    if (raw == null || raw === "") return 0;
    var v = parseInt(String(raw).trim(), 10);
    return isNaN(v) ? 0 : v;
  }

  function updateBridgeList(provinceCsv) {
    var ul = document.getElementById("map-bridge-list");
    var title = document.getElementById("map-bridge-title");
    if (!ul || !title) return;
    ul.innerHTML = "";
    if (!provinceCsv) {
      title.textContent = "著名桥梁";
      var empty = document.createElement("li");
      empty.className = "map-bridge-empty";
      empty.textContent = "点击省域查看";
      ul.appendChild(empty);
      return;
    }
    title.textContent =
      provinceCsv.replace(/省|市|自治区|特别行政区|壮族|回族|维吾尔/g, "") +
      " · 著名桥梁";
    var names = bridgesByProvince[provinceCsv] || [];
    if (!names.length) {
      var li = document.createElement("li");
      li.className = "map-bridge-empty";
      li.textContent = "总目录中暂无该省条目";
      ul.appendChild(li);
      return;
    }
    for (var i = 0; i < names.length; i++) {
      (function (bridgeName) {
        var item = document.createElement("li");
        item.className = "map-bridge-item";
        item.textContent = bridgeName;
        item.setAttribute("role", "button");
        item.setAttribute("tabindex", "0");
        item.title = "打开百度百科：" + bridgeName;
        function openBaike() {
          var baikeUrl =
            "https://baike.baidu.com/item/" + encodeURIComponent(bridgeName);
          window.open(baikeUrl, "_blank");
        }
        item.addEventListener("click", function (e) {
          e.stopPropagation();
          openBaike();
        });
        item.addEventListener("keydown", function (e) {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openBaike();
          }
        });
        ul.appendChild(item);
      })(names[i]);
    }
  }

  function updateMarkerPixel() {
    var el = document.getElementById("map-marker");
    if (!el || !chart || !selectedCsv) {
      if (el) el.style.display = "none";
      return;
    }
    var cap = PROVINCE_CAPITALS[selectedCsv];
    if (!cap) {
      el.style.display = "none";
      return;
    }
    var pixel = null;
    /* 仅 map3D 一条系列，用 seriesIndex:0（勿用 scatter3D+geo3D，会触发 geo "0" not found） */
    var tries = [
      function () {
        return chart.convertToPixel({ seriesIndex: 0 }, cap);
      },
    ];
    for (var t = 0; t < tries.length; t++) {
      try {
        pixel = tries[t]();
        if (
          pixel &&
          pixel.length >= 2 &&
          !isNaN(pixel[0]) &&
          !isNaN(pixel[1])
        ) {
          break;
        }
      } catch (err) {
        pixel = null;
      }
    }
    if (
      !pixel ||
      pixel.length < 2 ||
      isNaN(pixel[0]) ||
      isNaN(pixel[1])
    ) {
      el.style.display = "none";
      return;
    }
    el.style.display = "block";
    el.style.left = pixel[0] + MAP_CHART_OFFSET_X + "px";
    el.style.top = pixel[1] + MAP_CHART_OFFSET_Y + "px";
  }

  function clearSelection() {
    selectedCsv = null;
    updateBridgeList(null);
    updateMarkerPixel();
    window.dispatchEvent(new CustomEvent("province-cleared", { detail: {} }));
  }

  function selectProvince(csvProvince, skipDispatch) {
    if (!csvProvince) return;
    selectedCsv = csvProvince;
    updateBridgeList(csvProvince);
    updateMarkerPixel();
    if (!skipDispatch) {
      window.dispatchEvent(
        new CustomEvent("province-selected", {
          detail: { province: csvProvince },
        }),
      );
    }
  }

  function buildMapData(geoJson) {
    var features = (geoJson && geoJson.features) || [];
    var vals = [];
    var mapData = [];
    for (var i = 0; i < features.length; i++) {
      var name = features[i].properties && features[i].properties.name;
      if (!name) continue;
      var csvP = geoNameToCsvProvince(name);
      var v = csvP ? getCountForCsvProvince(csvP) : 0;
      mapData.push({ name: name, value: v });
      vals.push(v);
    }
    var minV = vals.length ? Math.min.apply(null, vals) : 0;
    var maxV = vals.length ? Math.max.apply(null, vals) : 1;
    if (maxV <= minV) maxV = minV + 1;
    return { mapData: mapData, minV: minV, maxV: maxV };
  }

  function getMapOption(mapData, minV, maxV) {
    return {
      backgroundColor: "transparent",
      tooltip: {
        show: true,
        formatter: function (p) {
          if (!p.name) return "";
          var csvP = geoNameToCsvProvince(p.name);
          var n = csvP ? getCountForCsvProvince(csvP) : 0;
          return p.name + "<br/>桥梁数量（文保统计）：" + n;
        },
      },
      visualMap: {
        show: true,
        type: "continuous",
        min: minV,
        max: maxV,
        calculable: true,
        realtime: true,
        seriesIndex: 0,
        orient: "horizontal",
        left: 48,
        bottom: 60,
        dimension: 0,
        /* 低→高：浅暖棕 → 亮橙 → 棕（整体偏浅、发亮） */
        inRange: {
          color: ["#c4a078", "#8B5A2B", "#7a4a28"],
        },
        text: ["高", "低"],
        textStyle: {
          color: "rgba(1, 4, 6, 0.85)",
          fontSize: 11,
        },
        itemWidth: 14,
        itemHeight: 120,
        borderColor: "rgba(126,232,255,0.35)",
        /*backgroundColor: "rgb(252, 246, 233)",*/
      },
      series: [
        {
          id: "china3d",
          type: "map3D",
          map: "china",
          roam: true,
          regionHeight: 3.2,
          shading: "lambert",
          light: {
            main: {
              intensity: 1.1,
              shadow: true,
              shadowQuality: "high",
              alpha: 45,
              beta: 10,
            },
            ambient: { intensity: 0.55 },
          },
          postEffect: {
            enable: true,
            bloom: { enable: true, bloomIntensity: 0.06 },
          },
          temporalSuperSampling: { enable: true },
          viewControl: {
            projection: "perspective",
            autoRotate: false,
            distance: 95,
            minDistance: 95,
            maxDistance: 95,
            alpha: 70,
            beta: 5,
            minAlpha: 5,
            maxAlpha: 88,
            animation: true,
            animationDurationUpdate: 800,
            damping: 0.78,
            rotateSensitivity: 0.65,
            zoomSensitivity: 0,
            panSensitivity: 0.55,
          },
          /*groundPlane: {
            show: true,
            color: "rgba(8,16,32,0.92)",
          },*/
          /* 省界过粗会像「长虚线」；略细、略透明减轻南海方向长边观感 */
          itemStyle: {
            borderWidth: 0.25,
            borderColor: "rgba(220, 190, 150, 0.35)",
            opacity: 1,
          },
          emphasis: {
            itemStyle: {
              color: "#d2b086",
              opacity: 1,
              borderColor: "rgba(180, 145, 105, 0.75)",
              borderWidth: 0.5,
            },
            label: {
              show: true,
              textStyle: {
                color: "#f5e6d0",
                fontSize: 11,
                fontWeight: "bold",
                backgroundColor: "rgba(60, 35, 18, 0.55)",
                padding: [2, 4],
                borderRadius: 2,
              },
            },
          },
          label: {
            show: true,
            distance: 4,
            textStyle: {
              color: "rgba(248, 220, 175, 0.95)",
              fontSize: 10,
              backgroundColor: "rgba(40, 28, 16, 0.35)",
              padding: [1, 3],
              borderRadius: 2,
            },
          },
          data: mapData,
        },
      ],
    };
  }

  function getInsetMapOption() {
    return {
      backgroundColor: "transparent",
      tooltip: { show: false },
      animation: false,
      series: [
        {
          type: "map",
          map: "chinaSouthSeaInset",
          roam: false,
          silent: true,
          selectedMode: false,
          label: { show: false },
          itemStyle: {
            areaColor: "rgba(210, 175, 135, 0.94)",
            borderColor: "rgba(175, 140, 105, 0.58)",
            borderWidth: 0.6,
          },
          emphasis: {
            disabled: true,
          },
          layoutCenter: ["50%", "50%"],
          layoutSize: "98%",
          aspectScale: 0.85,
        },
      ],
    };
  }

  function initInsetChart(insetGeoJson) {
    var wrap = document.querySelector(".map-chart-inset-wrap");
    var insetDom = document.getElementById("map-chart-inset");
    if (!insetDom || !insetGeoJson || !insetGeoJson.features || !insetGeoJson.features.length) {
      if (wrap) wrap.style.display = "none";
      return;
    }
    echarts.registerMap("chinaSouthSeaInset", insetGeoJson);
    chartInset = echarts.init(insetDom, null, { renderer: "canvas" });
    chartInset.setOption(getInsetMapOption());
    if (wrap) wrap.style.display = "";
  }

  function init() {
    if (typeof echarts === "undefined") {
      var box = document.getElementById("map-chart");
      if (box) {
        box.innerHTML = '<div class="map-error-msg">请先加载 ECharts</div>';
      }
      return;
    }

    var dom = document.getElementById("map-chart");
    if (!dom) return;

    Promise.all([
      loadText(DATA_CATALOG_CSV),
      loadText(DATA_PROVINCE_COUNT_CSV),
      fetch(CHINA_GEOJSON_URL).then(function (r) {
        if (!r.ok) throw new Error("国界 GeoJSON 加载失败");
        return r.json();
      }),
    ])
      .then(function (res) {
        var catalogRows = parseCsv(res[0]);
        var countRows = parseCsv(res[1]);
        var geoJsonFull = res[2];

        buildBridgesByProvince(catalogRows);
        bridgeCountMap = buildBridgeCountMap(countRows);

        var processed = processChinaGeoJson(geoJsonFull);
        echarts.registerMap("china", processed.mainGeoJson);
        initInsetChart(processed.insetGeoJson);

        var built = buildMapData(processed.mainGeoJson);
        chart = echarts.init(dom, null, { renderer: "canvas" });

        chart.setOption(getMapOption(built.mapData, built.minV, built.maxV));

        chart.on("click", function (params) {
          if (!params || !params.name) return;
          var csvP = geoNameToCsvProvince(params.name);
          if (csvP) selectProvince(csvP);
        });

        chart.on("georoam", function () {
          requestAnimationFrame(updateMarkerPixel);
        });
        chart.on("finished", function () {
          updateMarkerPixel();
        });

        window.addEventListener("resize", function () {
          if (chart) {
            chart.resize();
            updateMarkerPixel();
          }
          if (chartInset) {
            chartInset.resize();
          }
        });

        var bridgePanel = document.getElementById("map-bridge-panel");
        var bridgeToggle = document.getElementById("map-bridge-toggle");
        if (bridgePanel && bridgeToggle) {
          bridgeToggle.addEventListener("click", function (e) {
            e.preventDefault();
            bridgePanel.classList.toggle("is-collapsed");
            var collapsed = bridgePanel.classList.contains("is-collapsed");
            bridgeToggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
          });
        }

        updateBridgeList(null);
        updateMarkerPixel();
      })
      .catch(function (err) {
        console.error(err);
        dom.innerHTML =
          '<div class="map-error-msg">地图加载失败：' +
          (err && err.message ? err.message : String(err)) +
          "</div>";
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
