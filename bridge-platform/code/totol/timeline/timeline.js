/**
 * 时间线底栏：纵滚转为横向滚动，便于卷轴浏览
 */
(function () {
  var dockEl = document.getElementById("timeline-dock");
  var toggleEl = document.getElementById("timeline-toggle");
  var scrollEl = document.querySelector(".timeline-scroll");
  if (!dockEl || !toggleEl || !scrollEl) return;

  function setCollapsed(collapsed) {
    dockEl.classList.toggle("is-collapsed", collapsed);
    document.body.classList.toggle("timeline-dock-collapsed", collapsed);
    toggleEl.setAttribute("aria-expanded", collapsed ? "false" : "true");
    toggleEl.title = collapsed ? "展开时间线" : "收起时间线";
  }

  toggleEl.addEventListener("click", function () {
    setCollapsed(!dockEl.classList.contains("is-collapsed"));
  });

  scrollEl.addEventListener(
    "wheel",
    function (e) {
      if (dockEl.classList.contains("is-collapsed")) return;
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
      var max = scrollEl.scrollWidth - scrollEl.clientWidth;
      if (max <= 0) return;
      e.preventDefault();
      scrollEl.scrollLeft += e.deltaY;
    },
    { passive: false },
  );
})();
