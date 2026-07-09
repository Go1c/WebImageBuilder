/* Lumio 统一工作台原型 · 交互逻辑 */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- 数据 ---------- */
  var A = "../assets/";
  var PROMPTS = [
    { img: "case1.jpg", t: "城市生命系统图谱", n: 1, c: "场景" },
    { img: "case15.jpg", t: "夜市大排档人像海报", n: 15, c: "人物" },
    { img: "case17.jpg", t: "成都吃货暴走地图", n: 17, c: "场景" },
    { img: "case14.jpg", t: "国风美食图鉴", n: 14, c: "风格" },
    { img: "community-2.jpg", t: "流动的丝绸渐变", n: 21, c: "风格" },
    { img: "community-4.jpg", t: "彩虹光晕", n: 22, c: "风格" },
    { img: "community-6.jpg", t: "银河星空", n: 23, c: "场景" },
    { img: "community-5.jpg", t: "周末清晨的咖啡", n: 24, c: "人物" },
    { img: "community-1.jpg", t: "工坊里的匠人", n: 25, c: "人物" },
    { img: "case19.jpg", t: "图解式故事海报", n: 19, c: "风格" }
  ];
  var SHOWCASE = [
    { img: "community-6.jpg", t: "银河星空", tag: "长曝光 · 摄影质感" },
    { img: "community-2.jpg", t: "流动的丝绸渐变", tag: "抽象 · 壁纸" },
    { img: "case17.jpg", t: "成都吃货暴走地图", tag: "手绘水彩 · 信息图" },
    { img: "community-4.jpg", t: "彩虹光晕", tag: "抽象 · 渐变" },
    { img: "case14.jpg", t: "国风美食图鉴", tag: "手绘 · 海报" },
    { img: "community-5.jpg", t: "周末清晨的咖啡", tag: "生活 · 摄影" }
  ];

  /* ---------- 主题（?theme= + localStorage + 顶栏开关） ---------- */
  var THEME_KEY = "lumio-proto-theme";
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
  }
  var urlTheme = new URLSearchParams(location.search).get("theme");
  var saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (e) {}
  applyTheme(urlTheme === "dark" || urlTheme === "light" ? urlTheme : saved || "light");
  function toggleTheme() {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  }
  $("#theme-toggle").addEventListener("click", toggleTheme);
  $$("[data-theme-btn]").forEach(function (b) { b.addEventListener("click", toggleTheme); });
  $("#menu-theme").addEventListener("click", toggleTheme);

  /* ---------- 导航（hash 深链） ---------- */
  var PAGES = ["studio", "canvas", "prompts", "portfolio", "share", "404"];
  function navigate(name) {
    if (PAGES.indexOf(name) < 0) name = "404";
    PAGES.forEach(function (p) {
      var el = $("#page-" + p);
      if (el) el.classList.toggle("is-active", p === name);
    });
    $$(".shell-nav button[data-nav]").forEach(function (b) {
      b.classList.toggle("is-selected", b.getAttribute("data-nav") === name);
    });
    if (location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
  }
  $$("[data-nav]").forEach(function (b) {
    if (b.getAttribute("data-nav") === "tutorial") return;
    b.addEventListener("click", function () { navigate(b.getAttribute("data-nav")); });
  });
  window.addEventListener("hashchange", function () { navigate(location.hash.slice(1) || "studio"); });
  navigate(location.hash.slice(1) || "studio");

  /* ---------- 全站计数 pill：加载态 → 数字 ---------- */
  setTimeout(function () {
    $("#stat-skeleton").hidden = true;
    $("#stat-num").hidden = false;
  }, 1400);

  /* ---------- 公告横幅：排队 + 可关闭 ---------- */
  var ANNOUNCES = [
    { id: "a1", html: "gpt-image-2 · 4K 档已开放，登录后即可使用账户余额生成。<a href=\"#studio\">立即体验</a>" },
    { id: "a2", html: "本周五 02:00–03:00 系统维护，期间生成可能排队。" }
  ];
  var aIdx = 0;
  function renderAnnounce() {
    var bar = $("#announce-bar");
    if (aIdx >= ANNOUNCES.length) { bar.classList.add("is-hidden"); return; }
    bar.classList.remove("is-hidden");
    $("#announce-text").innerHTML = ANNOUNCES[aIdx].html;
    $("#announce-queue").textContent = ANNOUNCES.length > 1 ? (aIdx + 1) + " / " + ANNOUNCES.length : "";
  }
  $("#announce-close").addEventListener("click", function () { aIdx += 1; renderAnnounce(); });
  renderAnnounce();

  /* ---------- Toast / Confirm ---------- */
  function toast(msg, isErr) {
    var el = document.createElement("div");
    el.className = "toast" + (isErr ? " err" : "");
    el.textContent = msg;
    $("#toast-wrap").appendChild(el);
    setTimeout(function () { el.remove(); }, 2800);
  }
  var confirmCb = null;
  function confirmDialog(title, desc, impact, okLabel, cb) {
    $("#confirm-title").textContent = title;
    $("#confirm-desc").textContent = desc;
    $("#confirm-impact").textContent = "影响范围：" + impact;
    $("#confirm-ok").textContent = okLabel;
    confirmCb = cb;
    openOverlay("ov-confirm");
  }
  $("#confirm-ok").addEventListener("click", function () {
    closeOverlays();
    if (confirmCb) confirmCb();
    confirmCb = null;
  });

  /* ---------- 浮层通用 ---------- */
  function openOverlay(id) { closeOverlays(); $("#" + id).classList.add("open"); }
  function closeOverlays() { $$(".overlay-scrim").forEach(function (o) { o.classList.remove("open"); }); }
  $$("[data-overlay]").forEach(function (b) {
    b.addEventListener("click", function () { openOverlay("ov-" + b.getAttribute("data-overlay")); });
  });
  $$("[data-close]").forEach(function (b) { b.addEventListener("click", closeOverlays); });
  $$(".overlay-scrim").forEach(function (o) {
    o.addEventListener("click", function (e) { if (e.target === o) closeOverlays(); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeOverlays(); $("#account-menu").classList.remove("open"); }
  });

  /* 账号菜单 */
  $("#account-avatar").addEventListener("click", function (e) {
    e.stopPropagation();
    $("#account-menu").classList.toggle("open");
  });
  document.addEventListener("click", function (e) {
    if (!$("#account-menu").contains(e.target)) $("#account-menu").classList.remove("open");
  });
  $("#menu-config").addEventListener("click", function () { toast("偏好配置已收入账号菜单（原 canvas /config）"); });
  $("#menu-logout").addEventListener("click", function () { setSignedIn(false); });

  /* 登录浮层：交接加载 → 失败演示 */
  $("#login-go").addEventListener("click", function () {
    $("#auth-loading").hidden = false;
    $("#auth-error").hidden = true;
    setTimeout(function () {
      $("#auth-loading").hidden = true;
      setSignedIn(true);
      closeOverlays();
      toast("登录成功，免费额度 +3");
    }, 1500);
  });
  $("#auth-retry").addEventListener("click", function () {
    $("#auth-error").hidden = true;
    $("#login-go").click();
  });
  $("#invite-copy").addEventListener("click", function () { toast("邀请链接已复制"); });

  function setSignedIn(v) {
    $("#account-signed-in").hidden = !v;
    $("#account-signed-out").hidden = v;
    if (!v) toast("已退出登录");
  }

  /* ---------- 额度状态 ---------- */
  var quotaLeft = 3;
  function renderQuota(state) {
    var pill = $("#quota-pill"), hint = $("#quota-hint");
    if (state === "out") {
      quotaLeft = 0;
      pill.classList.add("is-low");
      $("#quota-num").textContent = "0 次";
      hint.classList.add("is-exhausted");
      hint.innerHTML = "免费额度已用完 · <strong>登录 +3 次</strong>、邀请好友 +20 次，或使用余额生成";
    } else {
      quotaLeft = state === "low" ? 1 : 3;
      pill.classList.toggle("is-low", state === "low");
      $("#quota-num").textContent = quotaLeft + " 次";
      hint.classList.remove("is-exhausted");
      hint.innerHTML = "本次消耗 <strong>1 次免费额度</strong> · 剩 " + quotaLeft + " 次" +
        (state === "low" ? "，<strong>额度将尽</strong>，登录可再得 3 次" : "");
    }
    $("#spend-left").textContent = quotaLeft;
  }

  /* ---------- 生图流程：空 → 加载 → 成功 / 失败 ---------- */
  var stageEls = ["stage-empty", "stage-loading", "stage-image", "stage-failed"];
  function showStage(id) { stageEls.forEach(function (s) { $("#" + s).hidden = s !== id; }); }
  var failNext = false;
  var genImgs = ["community-6.jpg", "community-2.jpg", "community-4.jpg"];
  var genIdx = 0;
  function generate() {
    if (quotaLeft <= 0) { toast("免费额度已用完：登录、邀请或充值后继续", true); return; }
    showStage("stage-loading");
    var bar = $("#progress-bar"), p = 0;
    bar.style.width = "0%";
    var timer = setInterval(function () {
      p = Math.min(p + 12 + Math.random() * 14, 92);
      bar.style.width = p + "%";
    }, 380);
    setTimeout(function () {
      clearInterval(timer);
      if (failNext) { failNext = false; showStage("stage-failed"); return; }
      bar.style.width = "100%";
      var img = genImgs[genIdx % genImgs.length];
      genIdx += 1;
      $("#stage-img").src = A + img;
      showStage("stage-image");
      addHistory(img);
      var promptText = $("#prompt-input").value.trim();
      if (promptText) $("#meta-prompt").textContent = promptText;
      toast("生成完成");
    }, 2200);
  }
  $("#generate-btn").addEventListener("click", generate);
  $("#retry-btn").addEventListener("click", generate);
  $("#act-regen").addEventListener("click", generate);
  $("#try-prompt").addEventListener("click", function () {
    $("#prompt-input").value = "赛博朋克夜市，雨后霓虹倒影，电影感构图";
    toast("已填入示例提示词");
  });

  /* 历史条 */
  function addHistory(img) {
    var strip = $("#canvas-history");
    $$(".history-thumb", strip).forEach(function (t) { t.classList.remove("is-active"); });
    var b = document.createElement("button");
    b.type = "button";
    b.className = "history-thumb is-active";
    b.innerHTML = '<img src="' + A + img + '" alt="历史结果">';
    b.addEventListener("click", function () {
      $$(".history-thumb", strip).forEach(function (t) { t.classList.remove("is-active"); });
      b.classList.add("is-active");
      $("#stage-img").src = A + img;
      showStage("stage-image");
    });
    strip.insertBefore(b, strip.children[1]);
  }
  /* 默认历史 */
  addHistory("community-4.jpg");
  addHistory("community-6.jpg");

  /* 结果操作 */
  $("#act-save").addEventListener("click", function () {
    portfolioHas = true; renderPortfolio();
    toast("已保存到作品集 · 仅保存在本设备");
  });
  $("#act-canvas").addEventListener("click", function () { openOverlay("ov-crossover"); });
  $("#crossover-new").addEventListener("click", function () {
    closeOverlays(); navigate("canvas");
    toast("已新建画布项目「未命名 1」，图片已作为节点加入");
  });
  $("#crossover-append").addEventListener("click", function () {
    closeOverlays(); navigate("canvas");
    toast("已追加到「屋顶花园系列」");
  });
  $("#act-share").addEventListener("click", function () {
    navigate("share");
    toast("分享短链已生成，可复制发送");
  });
  $("#act-download").addEventListener("click", function () { toast("已开始下载原图"); });
  $("#act-delete").addEventListener("click", function () {
    confirmDialog("删除这张生成结果？", "删除后无法恢复。", "仅删除本设备上的记录，不影响已分享的卡片。", "确认删除", function () {
      showStage("stage-empty");
      toast("已删除");
    });
  });

  /* 左栏控件 */
  $("#custom-btn").addEventListener("click", function () {
    var open = $("#custom-fields").classList.toggle("open");
    this.classList.toggle("is-selected", open);
    if (open) $$("#ratio-grid .ratio-button").forEach(function (b) { b.classList.remove("is-selected"); });
  });
  $$("#ratio-grid .ratio-button").forEach(function (b) {
    b.addEventListener("click", function () {
      $$("#ratio-grid .ratio-button").forEach(function (x) { x.classList.remove("is-selected"); });
      b.classList.add("is-selected");
      $("#custom-fields").classList.remove("open");
      $("#custom-btn").classList.remove("is-selected");
    });
  });
  $("#detail-slider").addEventListener("input", function () {
    var v = +this.value;
    this.style.setProperty("--slider-progress", v + "%");
    $("#detail-val").textContent = v;
    $("#hq-note").hidden = v < 72;
  });

  /* ---------- 提示词库（嵌入态 + 完整态共用渲染） ---------- */
  var libState = "ok"; /* ok | loading | error | empty */
  var libTab = "热门";
  function cardHTML(p, full) {
    return '<button type="button" class="prompt-lib-card" data-prompt="' + p.t + '">' +
      '<img src="' + A + p.img + '" alt="' + p.t + '" loading="lazy">' +
      (full ? '<span class="card-fav" aria-label="加入我的素材">☆</span>' : "") +
      '<span class="t">' + p.t + '</span><span class="m">#' + p.n + " · " + p.c + "</span></button>";
  }
  function renderLibrary() {
    var body = $("#library-body");
    if (libState === "loading") {
      body.innerHTML = '<div class="prompt-lib-grid">' +
        new Array(6).fill('<div class="skeleton-block" style="aspect-ratio:1/1.16"></div>').join("") + "</div>";
      return;
    }
    if (libState === "error") {
      body.innerHTML = '<div class="lib-state">提示词库暂时拉取失败，不是没有内容。<br><button type="button" class="btn" id="lib-retry">重试</button></div>';
      $("#lib-retry").addEventListener("click", function () { libState = "loading"; renderLibrary(); setTimeout(function () { libState = "ok"; renderLibrary(); }, 900); });
      return;
    }
    if (libTab === "我的" && libState === "empty") {
      body.innerHTML = '<div class="lib-state">还没有收藏的素材。<br>在提示词库点 ☆，或把好用的提示词保存进来。<br><button type="button" class="btn" id="lib-go">去逛提示词库</button></div>';
      $("#lib-go").addEventListener("click", function () { navigate("prompts"); });
      return;
    }
    var list = libTab === "热门" ? PROMPTS : PROMPTS.filter(function (p) { return p.c === libTab; });
    if (libTab === "我的") list = PROMPTS.slice(0, 4);
    body.innerHTML = (libTab === "我的" ? '<p class="local-note">🔒 仅保存在本设备 · 可导入导出 ZIP</p>' : "") +
      '<div class="prompt-lib-grid">' + list.map(function (p) { return cardHTML(p, false); }).join("") + "</div>";
    bindCards(body);
  }
  function bindCards(root) {
    $$(".prompt-lib-card", root).forEach(function (c) {
      c.addEventListener("click", function (e) {
        if (e.target.classList.contains("card-fav")) {
          e.target.classList.toggle("faved");
          e.target.textContent = e.target.classList.contains("faved") ? "★" : "☆";
          toast(e.target.classList.contains("faved") ? "已加入我的素材" : "已从我的素材移除");
          return;
        }
        $("#prompt-input").value = c.getAttribute("data-prompt");
        navigate("studio");
        toast("提示词已套用到创作面板");
      });
    });
  }
  $$("#library-tabs button").forEach(function (b) {
    b.addEventListener("click", function () {
      $$("#library-tabs button").forEach(function (x) { x.classList.remove("is-selected"); });
      b.classList.add("is-selected");
      libTab = b.textContent;
      renderLibrary();
    });
  });
  renderLibrary();

  /* 完整态 */
  $("#prompts-grid").innerHTML = PROMPTS.concat(PROMPTS.slice(0, 5)).map(function (p) { return cardHTML(p, true); }).join("");
  bindCards($("#prompts-grid"));
  $$("#prompts-filter .chip").forEach(function (c) {
    c.addEventListener("click", function () {
      $$("#prompts-filter .chip").forEach(function (x) { x.classList.remove("on"); });
      c.classList.add("on");
    });
  });

  /* 画布落地页 showcase */
  $("#showcase-grid").innerHTML = SHOWCASE.map(function (s) {
    return '<a href="#prompts"><img src="' + A + s.img + '" alt="' + s.t + '" loading="lazy">' +
      '<span class="showcase-caption">' + s.t + "<small>" + s.tag + "</small></span></a>";
  }).join("");
  $("#canvas-start").addEventListener("click", function () { toast("原型内不含画布编辑器内核，仅 Shell 统一"); });
  $("#canvas-open").addEventListener("click", function () { toast("原型内不含画布编辑器内核，仅 Shell 统一"); });

  /* 作品集 */
  var portfolioHas = true;
  function renderPortfolio() {
    var grid = $("#portfolio-grid");
    $("#portfolio-empty").hidden = portfolioHas;
    grid.hidden = !portfolioHas;
    if (!portfolioHas) { grid.innerHTML = ""; return; }
    grid.innerHTML = SHOWCASE.slice(0, 4).map(function (s, i) {
      return '<div class="portfolio-card"><img src="' + A + s.img + '" alt="' + s.t + '">' +
        '<div class="pc-meta"><span>' + s.t + "</span><span>" + (i + 1) + " 天前</span></div></div>";
    }).join("");
  }
  renderPortfolio();

  /* 分享页 */
  $("#share-try").addEventListener("click", function () {
    $("#prompt-input").value = "流动的丝绸质感渐变，紫罗兰、青蓝与暖橙交织，柔和体积光，超高清壁纸质感";
    navigate("studio");
    toast("提示词已预填（?prompt= 深链），免费体验 3 次");
  });
  $("#share-copy").addEventListener("click", function () { toast("提示词已复制"); });
  $("#share-download").addEventListener("click", function () { toast("已开始下载（含水印预览图）"); });
  $("#share-report").addEventListener("click", function () {
    confirmDialog("举报该内容？", "我们会在 24 小时内复核，被证实违规的内容将下架。", "举报仅提交给运营团队，不会通知作者。", "提交举报", function () {
      toast("已收到举报，感谢反馈");
    });
  });

  /* ---------- 演示控制 ---------- */
  $$(".demo-bar button").forEach(function (b) {
    b.addEventListener("click", function () {
      var d = b.getAttribute("data-demo");
      if (d === "quota-full") renderQuota("full");
      if (d === "quota-low") renderQuota("low");
      if (d === "quota-out") renderQuota("out");
      if (d === "lib-loading") { libState = "loading"; renderLibrary(); navigate("studio"); }
      if (d === "lib-error") { libState = "error"; renderLibrary(); navigate("studio"); }
      if (d === "lib-empty") {
        libState = "empty"; libTab = "我的";
        $$("#library-tabs button").forEach(function (x) { x.classList.toggle("is-selected", x.textContent === "我的"); });
        renderLibrary(); navigate("studio");
      }
      if (d === "logout") setSignedIn(false);
      if (d === "invited") openOverlay("ov-invited");
      if (d === "share-dead") {
        navigate("share");
        $("#share-normal").hidden = !$("#share-normal").hidden;
        $("#share-unavailable").hidden = !$("#share-normal").hidden;
      }
      if (d === "portfolio-empty") { portfolioHas = !portfolioHas; renderPortfolio(); navigate("portfolio"); }
      if (d === "404") navigate("404");
    });
  });
  /* 供失败态演示：连续第 3 次生成必成功，第 2 次点「重试」演示失败 */
  var genCount = 0;
  $("#generate-btn").addEventListener("click", function () {
    genCount += 1;
    if (genCount % 3 === 0) failNext = true;
  }, true);
})();
