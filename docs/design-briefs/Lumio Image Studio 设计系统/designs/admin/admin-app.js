/* Lumio Admin 原型 · Shell 交互（导航 / 抽屉 / ConfirmDialog / Toast / 图表 tooltip / 拖拽 / 演示） */
(function () {
  "use strict";
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var D = ADX;

  var TITLES = {
    overview: "总览", materials: "素材库", shares: "分享管理", safety: "内容安全",
    announcements: "公告运营", users: "用户记录", invites: "邀请裂变",
    errors: "报错监控", cost: "成本看板", audit: "审计日志"
  };

  /* ---------- Toast / Confirm ---------- */
  function toast(msg, isErr, sub) {
    var el = document.createElement("div");
    el.className = "adx-toast" + (isErr ? " err" : "");
    el.innerHTML = msg + (sub ? " <small>" + sub + "</small>" : "");
    $("#toast-wrap").appendChild(el);
    setTimeout(function () { el.remove(); }, 3000);
  }
  var confirmCb = null;
  function confirmDialog(opts) {
    $("#dialog-title").textContent = opts.title;
    $("#dialog-desc").textContent = opts.desc;
    var imp = $("#dialog-impact");
    imp.className = "adx-impact" + (opts.crit ? " crit" : "");
    imp.textContent = "影响范围：" + opts.impact;
    $("#dialog-ok").textContent = opts.ok || "确认";
    $("#dialog-ok").className = "ad-btn " + (opts.crit ? "confirm-crit" : "primary");
    confirmCb = opts.onOk;
    $("#dialog-scrim").classList.add("open");
  }
  $("#dialog-cancel").addEventListener("click", function () { $("#dialog-scrim").classList.remove("open"); });
  $("#dialog-ok").addEventListener("click", function () {
    $("#dialog-scrim").classList.remove("open");
    if (confirmCb) confirmCb();
    confirmCb = null;
  });
  $("#dialog-scrim").addEventListener("click", function (e) { if (e.target === this) this.classList.remove("open"); });

  /* ---------- Drawer ---------- */
  function openDrawer(title, sub, bodyHTML) {
    $("#drawer-title").textContent = title;
    $("#drawer-sub").innerHTML = sub || "";
    $("#drawer-body").innerHTML = bodyHTML;
    $("#drawer").classList.add("open");
    $("#drawer-scrim").classList.add("open");
    bindCommon($("#drawer-body"));
  }
  function closeDrawer() { $("#drawer").classList.remove("open"); $("#drawer-scrim").classList.remove("open"); }
  $("#drawer-close").addEventListener("click", closeDrawer);
  $("#drawer-scrim").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeDrawer(); $("#dialog-scrim").classList.remove("open"); }
  });

  /* ---------- 导航 ---------- */
  var current = "overview";
  function goto(view) {
    current = view;
    $$(".ad-view").forEach(function (v) { v.classList.toggle("active", v.id === "view-" + view); });
    $$(".ad-nav-item").forEach(function (b) { b.classList.toggle("active", b.getAttribute("data-view") === view); });
    $("#topbar-title").textContent = TITLES[view];
    $("#topbar-crumb").textContent = "Lumio Admin / " + TITLES[view];
    $("#ad-side").classList.remove("open");
    renderView(view);
  }
  $$(".ad-nav-item").forEach(function (b) { b.addEventListener("click", function () { goto(b.getAttribute("data-view")); }); });
  $("#menu-btn").addEventListener("click", function () { $("#ad-side").classList.add("open"); });

  function renderView(view) {
    var el = $("#view-" + view);
    el.innerHTML = ADVIEWS[view]();
    bindCommon(el);
    bindModule(view, el);
  }

  /* ---------- 公共绑定：复制 / toast 链接 / 深链 / 图表 ---------- */
  function bindCommon(root) {
    $$("[data-copy]", root).forEach(function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); toast("已复制", false, b.getAttribute("data-copy").slice(0, 24) + "…"); });
    });
    $$("[data-toast]", root).forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); e.stopPropagation(); toast(b.getAttribute("data-toast")); });
    });
    $$("[data-goto]", root).forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); goto(b.getAttribute("data-goto")); });
    });
    $$(".adx-chart", root).forEach(bindChart);
    $$(".ad-chip", root).forEach(function (c) {
      if (c.tagName === "SELECT" || c.closest(".ad-panel-head")) return;
      c.addEventListener("click", function () {
        $$(".ad-chip", c.parentElement).forEach(function (x) { x.classList.remove("on"); });
        c.classList.add("on");
      });
    });
    $$(".ad-tab", root).forEach(function (t) {
      t.addEventListener("click", function () {
        $$(".ad-tab", t.parentElement).forEach(function (x) { x.classList.remove("on"); });
        t.classList.add("on");
      });
    });
  }

  /* 图表 tooltip */
  function bindChart(chart) {
    var id = chart.getAttribute("data-chart");
    var tip = $("[data-chart-tip]", chart);
    var svg = $("svg", chart);
    var data = id === "trend" ? D.TREND : D.COSTD;
    var series = id === "trend"
      ? [{ key: "ok", label: "成功", color: "#5B61E8" }, { key: "fail", label: "失败", color: "#D9484C" }]
      : [{ key: "v", label: "估算成本 $", color: "#5B61E8" }];
    svg.addEventListener("mousemove", function (e) {
      var rect = svg.getBoundingClientRect();
      var i = Math.round(((e.clientX - rect.left) / rect.width * 640 - 36) / ((640 - 46) / (data.length - 1)));
      i = Math.max(0, Math.min(data.length - 1, i));
      $$("[data-chart-dot]", svg).forEach(function (d) { d.setAttribute("opacity", d.getAttribute("data-chart-dot") == i ? 1 : 0); });
      var row = data[i];
      tip.innerHTML = '<span class="d">' + row.d + "</span>" + series.map(function (s) {
        return '<div class="row"><span class="dot" style="background:' + s.color + '"></span>' + s.label + " " + row[s.key] + "</div>";
      }).join("");
      tip.style.left = ((36 + i * ((640 - 46) / (data.length - 1))) / 640 * 100) + "%";
      tip.style.top = "36px";
      tip.classList.add("show");
    });
    svg.addEventListener("mouseleave", function () {
      tip.classList.remove("show");
      $$("[data-chart-dot]", svg).forEach(function (d) { d.setAttribute("opacity", 0); });
    });
  }

  /* ---------- 模块级交互 ---------- */
  function bindModule(view, root) {
    if (view === "materials") bindMaterials(root);
    if (view === "shares") bindShares(root);
    if (view === "safety") bindSafety(root);
    if (view === "announcements") bindAnnouncements(root);
    if (view === "users") bindUsers(root);
    if (view === "errors") bindErrors(root);
    if (view === "audit") bindAudit(root);
  }

  /* 素材库：编辑抽屉 / 隐藏 / 删除 / 拖拽 */
  function matById(id) { return D.MATERIALS.filter(function (m) { return m.id === id; })[0]; }
  function bindMaterials(root) {
    $$("[data-mat-edit]", root).forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-mat-edit");
        var m = matById(id) || { id: "新建", title: "", cat: "场景", img: "", prompt: "" };
        openDrawer(id === "new" ? "新建素材" : "编辑素材", '<span class="ad-mono">' + m.id + "</span> · 保存后即时对前台生效",
          '<label class="ad-form-label">标题</label><input class="ad-field" value="' + m.title + '"></input>' +
          '<label class="ad-form-label">分类</label><select class="ad-field"><option>热门</option><option' + (m.cat === "人物" ? " selected" : "") + ">人物</option><option" + (m.cat === "场景" ? " selected" : "") + ">场景</option><option" + (m.cat === "风格" ? " selected" : "") + ">风格</option></select>" +
          '<label class="ad-form-label">提示词</label><textarea class="ad-field">' + m.prompt + "</textarea>" +
          '<label class="ad-form-label">图片 URL（暂仅支持粘贴 URL，直传为后端规划能力）</label>' +
          '<input class="ad-field" id="mat-url" value="' + (m.img || "") + '" placeholder="https://…/cover.jpg"></input>' +
          '<p class="ad-field-error" id="mat-url-err" hidden>URL 需以 http(s) 开头且指向图片文件</p>' +
          '<h4>预览</h4><div id="mat-preview">' + (m.img ? '<img src="' + m.img + '" style="width:100%; border-radius:10px; border:1px solid var(--ad-border)" alt="封面预览">' : '<p class="ad-sub">粘贴 URL 后此处出现预览</p>') + "</div>" +
          '<div style="display:flex; gap:8px; margin-top:20px"><button type="button" class="ad-btn primary" id="mat-save">保存</button><button type="button" class="ad-btn" id="mat-cancel">取消</button></div>');
        $("#mat-url").addEventListener("input", function () {
          var ok = /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(this.value) || /^\.\.\//.test(this.value);
          $("#mat-url-err").hidden = ok || !this.value;
          this.classList.toggle("invalid", !ok && !!this.value);
          if (ok) $("#mat-preview").innerHTML = '<img src="' + this.value + '" style="width:100%; border-radius:10px; border:1px solid var(--ad-border)" alt="封面预览">';
        });
        $("#mat-save").addEventListener("click", function () { closeDrawer(); toast("素材已保存", false, "已即时对前台生效"); });
        $("#mat-cancel").addEventListener("click", closeDrawer);
      });
    });
    $$("[data-mat-hide]", root).forEach(function (b) {
      b.addEventListener("click", function () {
        var m = matById(b.getAttribute("data-mat-hide"));
        if (m.hidden) { m.hidden = false; renderView("materials"); toast("已恢复显示", false, "前台立即可见"); return; }
        confirmDialog({
          title: "隐藏素材「" + m.title + "」？", desc: "隐藏后前台提示词库立即看不到这条素材，数据保留，可随时恢复。",
          impact: "即时对前台生效；已套用该提示词的用户不受影响。", ok: "隐藏",
          onOk: function () { m.hidden = true; renderView("materials"); toast("已隐藏", false, "前台不再展示"); }
        });
      });
    });
    $$("[data-mat-del]", root).forEach(function (b) {
      b.addEventListener("click", function () {
        var m = matById(b.getAttribute("data-mat-del"));
        confirmDialog({
          title: "删除素材「" + m.title + "」？", desc: "删除不可恢复，序号将自动顺延。", crit: true,
          impact: "即时对前台生效；这条提示词从提示词库彻底消失。", ok: "确认删除",
          onOk: function () {
            D.MATERIALS.splice(D.MATERIALS.indexOf(m), 1);
            renderView("materials");
            toast("已删除素材", false, m.id);
          }
        });
      });
    });
    /* 拖拽排序（reorder 接口已有） */
    var dragging = null;
    $$(".ad-mat-card", root).forEach(function (card) {
      card.addEventListener("dragstart", function () { dragging = card; card.classList.add("dragging"); });
      card.addEventListener("dragend", function () { card.classList.remove("dragging"); dragging = null; });
      card.addEventListener("dragover", function (e) { e.preventDefault(); card.classList.add("drag-over"); });
      card.addEventListener("dragleave", function () { card.classList.remove("drag-over"); });
      card.addEventListener("drop", function (e) {
        e.preventDefault(); card.classList.remove("drag-over");
        if (!dragging || dragging === card) return;
        var a = matById(dragging.getAttribute("data-mat")), b2 = matById(card.getAttribute("data-mat"));
        var t = a.order; a.order = b2.order; b2.order = t;
        renderView("materials");
        toast("排序已保存", false, "#" + b2.order + " ↔ #" + a.order + " · 即时对前台生效");
      });
    });
  }

  /* 分享管理 */
  function bindShares(root) {
    $$("[data-share]", root).forEach(function (tr) {
      tr.addEventListener("click", function () {
        var s = D.SHARES.filter(function (x) { return x.id === tr.getAttribute("data-share"); })[0];
        var down = s.state === "已下架";
        openDrawer("分享详情", ADVIEWS.helpers.copyCode(s.id),
          (down
            ? '<div class="adx-empty" style="border:1px dashed var(--ad-border-strong); border-radius:10px; padding:28px"><div class="glyph">🚫</div><h4>内容已下架</h4><p>下架内容不再提供原图预览；如需恢复请点下方按钮。</p></div>'
            : '<img src="' + s.img + '" style="width:100%; border-radius:10px; border:1px solid var(--ad-border)" alt="分享大图">') +
          '<dl class="ad-kv" style="margin-top:16px"><dt>标题</dt><dd>' + s.title + "</dd><dt>作者</dt><dd>" + s.author + "</dd><dt>状态</dt><dd>" + s.state + "</dd><dt>举报数</dt><dd>" + s.reports + (s.reports > 0 ? '<span class="ad-sub">（举报理由后端暂未存储，此处为扩展位）</span>' : "") + "</dd><dt>创建</dt><dd>" + s.time + "</dd></dl>" +
          "<h4>提示词</h4><pre class=\"ad-codeblock\" style=\"background:var(--ad-ground); color:var(--ad-ink)\">" + s.prompt + "</pre>" +
          '<div style="display:flex; gap:8px; margin-top:20px">' +
          (down
            ? '<button type="button" class="ad-btn primary" id="share-restore">恢复上架</button>'
            : '<button type="button" class="ad-btn danger" id="share-down">下架该分享</button>') +
          "</div>");
        var btn = $("#share-down");
        if (btn) btn.addEventListener("click", function () {
          confirmDialog({
            title: "下架「" + s.title + "」？", desc: "适用于违规或被多次举报的内容。", crit: true,
            impact: "下架后分享链接立即失效，访客将看到「已失效或已下架」页；作者不会收到通知。", ok: "确认下架",
            onOk: function () { s.state = "已下架"; closeDrawer(); renderView("shares"); toast("已下架", false, s.id + " · 已记入审计日志"); }
          });
        });
        var rbtn = $("#share-restore");
        if (rbtn) rbtn.addEventListener("click", function () {
          s.state = "正常"; closeDrawer(); renderView("shares"); toast("已恢复上架", false, "分享链接重新可访问");
        });
      });
    });
  }

  /* 内容安全 */
  function bindSafety(root) {
    $$("[data-safety-tab]", root).forEach(function (t) {
      t.addEventListener("click", function () {
        var isQ = t.getAttribute("data-safety-tab") === "queue";
        $("#safety-queue").hidden = !isQ;
        $("#safety-words").hidden = isQ;
      });
    });
    $$("[data-review]", root).forEach(function (tr) {
      tr.addEventListener("click", function () {
        var r = D.REVIEWS.filter(function (x) { return x.id === tr.getAttribute("data-review"); })[0];
        openDrawer("复审 · 命中「" + r.word + "」", ADVIEWS.helpers.copyCode(r.id) + " · " + r.time,
          '<dl class="ad-kv"><dt>用户</dt><dd>' + r.email + "</dd><dt>命中词</dt><dd>「" + r.word + "」（标记复审档）</dd></dl>" +
          "<h4>提示词原文</h4><pre class=\"ad-codeblock\" style=\"background:var(--ad-ground); color:var(--ad-ink)\">" + r.prompt + "</pre>" +
          '<p class="ad-sub" style="margin-top:14px">复审结论仅记入审计日志，v1 不改变任务状态。</p>' +
          '<div style="display:flex; gap:8px; margin-top:12px">' +
          '<button type="button" class="ad-btn primary" data-verdict="pass">判定通过</button>' +
          '<button type="button" class="ad-btn danger" data-verdict="down">下架并标记</button></div>');
        $$("[data-verdict]").forEach(function (b) {
          b.addEventListener("click", function () {
            var pass = b.getAttribute("data-verdict") === "pass";
            function done() {
              closeDrawer();
              var row = $('[data-review="' + r.id + '"]');
              if (row) {
                row.classList.add("adx-row-leaving");
                setTimeout(function () {
                  D.REVIEWS.splice(D.REVIEWS.indexOf(r), 1);
                  row.remove();
                  var c = $("#review-count"); if (c) c.textContent = D.REVIEWS.length;
                  var badge = $('[data-badge="safety"]'); if (badge) badge.textContent = D.REVIEWS.length;
                  if (!D.REVIEWS.length) $("#review-tbody").innerHTML = '<tr><td colspan="4">' + ADVIEWS.helpers.emptyState("celebrate", "复审队列清空了 🎉", "新命中的请求会自动出现在这里。") + "</td></tr>";
                }, 280);
              }
              toast(pass ? "已判定通过" : "已下架并标记", false, r.id + " · 已记入审计日志");
            }
            if (pass) return done();
            confirmDialog({
              title: "下架并标记？", desc: "对应分享（如有）将下架，该提示词计入命中统计。", crit: true,
              impact: "分享链接立即失效；复审结论记入审计日志，不撤回已生成图片。", ok: "下架并标记", onOk: done
            });
          });
        });
      });
    });
    var addBtn = $("#word-add");
    if (addBtn) addBtn.addEventListener("click", function () {
      var w = $("#word-input").value.trim();
      if (!w) { toast("请输入违禁词", true); return; }
      D.WORDS.unshift({ w: w, action: $("#word-mode").value, hits: 0, time: "今天" });
      renderView("safety");
      toast("已添加违禁词", false, "「" + w + "」· " + D.DICT.wordAction[$("#word-mode") ? "flag" : "flag"]);
    });
    $$("[data-word-del]", root).forEach(function (b) {
      b.addEventListener("click", function () {
        var w = b.getAttribute("data-word-del");
        confirmDialog({
          title: "删除违禁词「" + w + "」？", desc: "词库暂不支持编辑，如需修改动作请删除后重加。", crit: true,
          impact: "删除后新请求不再按此词命中；历史命中统计保留。", ok: "确认删除",
          onOk: function () {
            D.WORDS = D.WORDS.filter(function (x) { return x.w !== w; });
            renderView("safety");
            $$('[data-safety-tab]').forEach(function (t) { t.classList.toggle("on", t.getAttribute("data-safety-tab") === "words"); });
            $("#safety-queue").hidden = true; $("#safety-words").hidden = false;
            toast("已删除违禁词", false, "「" + w + "」");
          }
        });
      });
    });
  }

  /* 公告运营 */
  function bindAnnouncements(root) {
    $$("[data-announce]", root).forEach(function (el) {
      el.addEventListener("click", function () {
        var a = D.ANNOUNCES.filter(function (x) { return x.id === el.getAttribute("data-announce"); })[0];
        openDrawer("编辑公告", D.DICT.announceState[a.state] + " · " + a.id,
          '<div class="adx-statemachine"><span class="st' + (a.state === "draft" ? " on" : "") + '">草稿</span>→<span class="st' + (a.state === "active" ? " on" : "") + '">生效中</span>→<span class="st' + (a.state === "ended" ? " on" : "") + '">已结束</span></div>' +
          '<label class="ad-form-label">标题</label><input class="ad-field" id="an-title" value="' + a.title + '"></input>' +
          '<label class="ad-form-label">内容</label><textarea class="ad-field" id="an-body">' + a.body + "</textarea>" +
          '<label class="ad-form-label">位置</label><select class="ad-field"><option>顶栏下通栏</option><option>生图站侧栏</option><option>画布落地页</option><option>分享页</option></select>' +
          '<label class="ad-form-label">生效起止</label>' +
          '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px"><input class="ad-field" id="an-from" type="datetime-local" value="' + a.from.replace(" ", "T") + '"></input><input class="ad-field" id="an-to" type="datetime-local" value="' + a.to.replace(" ", "T") + '"></input></div>' +
          '<p class="ad-field-error" id="an-time-err" hidden>结束时间必须晚于开始时间</p>' +
          '<h4>前台预览（所见即所得 · 浅色态）</h4>' +
          '<div class="adx-banner-preview"><p class="cap">生图站顶栏下通栏</p>' +
          '<div class="lumio-announce"><span class="tag">公告</span><p id="an-preview">' + a.body + '</p><span class="x">✕</span></div></div>' +
          '<div style="display:flex; gap:8px; margin-top:20px"><button type="button" class="ad-btn primary" id="an-save">保存</button><button type="button" class="ad-btn" id="an-cancel">取消</button></div>');
        $("#an-body").addEventListener("input", function () { $("#an-preview").textContent = this.value; });
        function validTime() {
          var ok = $("#an-from").value < $("#an-to").value;
          $("#an-time-err").hidden = ok;
          $("#an-to").classList.toggle("invalid", !ok);
          return ok;
        }
        $("#an-from").addEventListener("change", validTime);
        $("#an-to").addEventListener("change", validTime);
        $("#an-save").addEventListener("click", function () {
          if (!validTime()) { toast("结束时间早于开始时间，请修正", true); return; }
          closeDrawer(); toast("公告已保存", false, "按生效区间自动流转状态");
        });
        $("#an-cancel").addEventListener("click", closeDrawer);
      });
    });
    $$("[data-announce-del]", root).forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var a = D.ANNOUNCES.filter(function (x) { return x.id === b.getAttribute("data-announce-del"); })[0];
        confirmDialog({
          title: "删除公告「" + a.title + "」？", desc: "删除不可恢复。", crit: true,
          impact: a.state === "active" ? "该公告正在生效中，删除后前台横幅立即消失。" : "该公告未在生效中，删除仅影响后台记录。",
          ok: "确认删除",
          onOk: function () { D.ANNOUNCES.splice(D.ANNOUNCES.indexOf(a), 1); renderView("announcements"); toast("已删除公告"); }
        });
      });
    });
  }

  /* 用户记录 */
  function bindUsers(root) {
    $$("[data-user]", root).forEach(function (tr) {
      tr.addEventListener("click", function () {
        var u = D.USERS[+tr.getAttribute("data-user")];
        openDrawer("用户详情", u.email + " · 只读",
          '<div class="ad-mini-kpi"><div><div class="l">生成量</div><div class="v ad-tnum">' + u.gens + '</div></div><div><div class="l">成功率</div><div class="v ad-tnum">' + u.ok + '</div></div><div><div class="l">累计消费</div><div class="v ad-tnum">' + u.spend + "</div></div></div>" +
          '<dl class="ad-kv"><dt>注册时间</dt><dd>' + u.reg + "</dd><dt>额度来源</dt><dd>" + D.DICT.spendSource[u.src] + "</dd><dt>最近活跃</dt><dd>" + u.last + "</dd><dt>设备数</dt><dd>" + u.device + "</dd></dl>" +
          "<h4>最近生成</h4><ul class=\"ad-timeline\"><li>✦ 银河星空 · gpt-image-2<span class=\"tt\">12 分钟前</span></li><li>✦ 流动的丝绸渐变 · gpt-image-2<span class=\"tt\">1 小时前</span></li><li>✦ 彩虹光晕（失败 · 上游服务报错）<span class=\"tt\">2 小时前</span></li></ul>" +
          "<h4>设备 / IP 风控</h4><ul class=\"ad-timeline\"><li>" + ADVIEWS.helpers.copyCode("fp_a91c30cd7e2f…") + '<span class="tt">设备指纹</span></li><li>' + ADVIEWS.helpers.copyCode("203.0.113.**") + '<span class="tt">最近 IP</span></li></ul>' +
          '<p class="ad-sub" style="margin-top:16px">禁用账号 / 重置额度为后端规划能力，本模块只读。</p>');
      });
    });
  }

  /* 报错监控 */
  function bindErrors(root) {
    $$("[data-error]", root).forEach(function (tr) {
      tr.addEventListener("click", function () {
        var e2 = D.ERRORS.filter(function (x) { return x.id === tr.getAttribute("data-error"); })[0];
        openDrawer("报错详情", ADVIEWS.helpers.copyCode(e2.id) + " · " + e2.time,
          '<dl class="ad-kv"><dt>类型</dt><dd>' + D.DICT.errorType[e2.type] + ' <span class="ad-sub ad-mono">(' + e2.type + ")</span></dd><dt>用户</dt><dd>" + e2.email + ' <a href="#" data-goto-user>查看该用户 →</a></dd><dt>模型</dt><dd class="ad-mono">' + e2.model + "</dd><dt>摘要</dt><dd>" + e2.msg + "</dd></dl>" +
          '<div style="border:1px solid var(--ad-border); border-radius:10px; padding:12px 14px; display:flex; align-items:center; gap:10px; margin-bottom:8px"><span class="ad-pill crit">HTTP ' + e2.http + '</span><span class="ad-sub">上游返回状态码</span></div>' +
          '<details class="ad-reveal crit"><summary>上游响应原文<span class="tag">JSON</span></summary><div class="reveal-body"><pre class="ad-codeblock">{\n  "error": {\n    "message": "upstream gateway returned non-JSON body",\n    "status": ' + e2.http + '\n  }\n}</pre></div></details>' +
          '<details class="ad-reveal"><summary>请求参数<span class="tag">JSON</span></summary><div class="reveal-body"><pre class="ad-codeblock">{\n  "model": "' + e2.model + '",\n  "size": "1024x1024",\n  "n": 1\n}</pre></div></details>' +
          '<details class="ad-reveal"><summary>站内上下文<span class="tag">JSON</span></summary><div class="reveal-body"><pre class="ad-codeblock">{\n  "task_id": "' + e2.id + '",\n  "spend_source": "paid",\n  "retry": 0\n}</pre></div></details>');
        var link = $("[data-goto-user]");
        if (link) link.addEventListener("click", function (ev) { ev.preventDefault(); closeDrawer(); goto("users"); });
      });
    });
  }

  /* 审计日志 */
  function bindAudit(root) {
    $$("[data-audit]", root).forEach(function (tr) {
      tr.addEventListener("click", function () {
        var a = D.AUDITS[+tr.getAttribute("data-audit")];
        openDrawer("审计详情", a.act + " · " + a.time,
          '<dl class="ad-kv"><dt>操作者</dt><dd>' + a.who + "</dd><dt>对象</dt><dd>" + ADVIEWS.helpers.copyCode(a.target) + "</dd><dt>摘要</dt><dd>" + a.summary + "</dd></dl>" +
          '<details class="ad-reveal" open><summary>原始记录<span class="tag">JSON</span></summary><div class="reveal-body"><pre class="ad-codeblock">' + a.raw + "</pre></div></details>" +
          '<p class="ad-sub" style="margin-top:14px">审计日志只读、不可撤销。</p>');
      });
    });
  }

  /* ---------- 演示控制 ---------- */
  $$("[data-demo]").forEach(function (b) {
    b.addEventListener("click", function () {
      var d = b.getAttribute("data-demo");
      var el = $("#view-" + current);
      if (d === "403") { $("#forbidden").classList.add("open"); return; }
      if (d === "loading") {
        el.innerHTML = '<div class="ad-kpi-row cols-4">' + new Array(4).fill('<div class="ad-kpi"><div class="label" style="background:#EEF0F4; color:transparent; border-radius:6px; width:60%">…</div><div class="val" style="background:#EEF0F4; color:transparent; border-radius:8px; width:40%">…</div></div>').join("") + '</div><div class="ad-panel"><div class="ad-loading">正在加载数据…</div></div>';
        setTimeout(function () { renderView(current); }, 1200);
        return;
      }
      if (d === "error") {
        el.innerHTML = '<div class="ad-panel">' + ADVIEWS.helpers.emptyState("error", "数据拉取失败", "接口返回 502。这不是空数据——请重试；持续失败请查报错监控。", '<button type="button" class="ad-btn primary" id="retry-view">重试</button>') + "</div>";
        $("#retry-view").addEventListener("click", function () { renderView(current); toast("已重新加载"); });
        return;
      }
      if (d === "empty") {
        el.innerHTML = '<div class="ad-panel">' + ADVIEWS.helpers.emptyState("", "暂无数据", "这个时间范围内没有记录，换个筛选条件试试。") + "</div>";
        return;
      }
      if (d === "celebrate") {
        el.innerHTML = '<div class="ad-panel">' + ADVIEWS.helpers.emptyState("celebrate", "复审队列清空了 🎉", "所有命中项都处理完了。新命中的请求会自动出现在这里。") + "</div>";
        return;
      }
      if (d === "badge-fail") {
        $$(".ad-badge").forEach(function (x) { x.remove(); });
        toast("徽标计数加载失败", true, "best-effort：静默隐藏徽标，不阻塞导航（本轮定稿方案）");
      }
    });
  });
  $("#forbidden-close").addEventListener("click", function () { $("#forbidden").classList.remove("open"); });

  /* 初始渲染 */
  Object.keys(TITLES).forEach(function (v) { if (v === "overview") renderView(v); });
})();
