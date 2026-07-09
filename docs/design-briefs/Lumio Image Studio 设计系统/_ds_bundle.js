/* @ds-bundle: {"format":4,"namespace":"DesignSystem_81e047","components":[],"sourceHashes":{"designs/admin/admin-app.js":"5a631d905ea5","designs/admin/admin-data.js":"1b2e1c102b07","designs/admin/admin-views.js":"3d225847f0a4","designs/unified-shell/app.js":"640f851ba340"},"inlinedExternals":[],"unexposedExports":[]} */

(() => {

const __ds_ns = (window.DesignSystem_81e047 = window.DesignSystem_81e047 || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// designs/admin/admin-app.js
try { (() => {
/* Lumio Admin 原型 · Shell 交互（导航 / 抽屉 / ConfirmDialog / Toast / 图表 tooltip / 拖拽 / 演示） */
(function () {
  "use strict";

  var $ = function (s, r) {
    return (r || document).querySelector(s);
  };
  var $$ = function (s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  };
  var D = ADX;
  var TITLES = {
    overview: "总览",
    materials: "素材库",
    shares: "分享管理",
    safety: "内容安全",
    announcements: "公告运营",
    users: "用户记录",
    invites: "邀请裂变",
    errors: "报错监控",
    cost: "成本看板",
    audit: "审计日志"
  };

  /* ---------- Toast / Confirm ---------- */
  function toast(msg, isErr, sub) {
    var el = document.createElement("div");
    el.className = "adx-toast" + (isErr ? " err" : "");
    el.innerHTML = msg + (sub ? " <small>" + sub + "</small>" : "");
    $("#toast-wrap").appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 3000);
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
  $("#dialog-cancel").addEventListener("click", function () {
    $("#dialog-scrim").classList.remove("open");
  });
  $("#dialog-ok").addEventListener("click", function () {
    $("#dialog-scrim").classList.remove("open");
    if (confirmCb) confirmCb();
    confirmCb = null;
  });
  $("#dialog-scrim").addEventListener("click", function (e) {
    if (e.target === this) this.classList.remove("open");
  });

  /* ---------- Drawer ---------- */
  function openDrawer(title, sub, bodyHTML) {
    $("#drawer-title").textContent = title;
    $("#drawer-sub").innerHTML = sub || "";
    $("#drawer-body").innerHTML = bodyHTML;
    $("#drawer").classList.add("open");
    $("#drawer-scrim").classList.add("open");
    bindCommon($("#drawer-body"));
  }
  function closeDrawer() {
    $("#drawer").classList.remove("open");
    $("#drawer-scrim").classList.remove("open");
  }
  $("#drawer-close").addEventListener("click", closeDrawer);
  $("#drawer-scrim").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeDrawer();
      $("#dialog-scrim").classList.remove("open");
    }
  });

  /* ---------- 导航 ---------- */
  var current = "overview";
  function goto(view) {
    current = view;
    $$(".ad-view").forEach(function (v) {
      v.classList.toggle("active", v.id === "view-" + view);
    });
    $$(".ad-nav-item").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === view);
    });
    $("#topbar-title").textContent = TITLES[view];
    $("#topbar-crumb").textContent = "Lumio Admin / " + TITLES[view];
    $("#ad-side").classList.remove("open");
    renderView(view);
  }
  $$(".ad-nav-item").forEach(function (b) {
    b.addEventListener("click", function () {
      goto(b.getAttribute("data-view"));
    });
  });
  $("#menu-btn").addEventListener("click", function () {
    $("#ad-side").classList.add("open");
  });
  function renderView(view) {
    var el = $("#view-" + view);
    el.innerHTML = ADVIEWS[view]();
    bindCommon(el);
    bindModule(view, el);
  }

  /* ---------- 公共绑定：复制 / toast 链接 / 深链 / 图表 ---------- */
  function bindCommon(root) {
    $$("[data-copy]", root).forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        toast("已复制", false, b.getAttribute("data-copy").slice(0, 24) + "…");
      });
    });
    $$("[data-toast]", root).forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        toast(b.getAttribute("data-toast"));
      });
    });
    $$("[data-goto]", root).forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.preventDefault();
        goto(b.getAttribute("data-goto"));
      });
    });
    $$(".adx-chart", root).forEach(bindChart);
    $$(".ad-chip", root).forEach(function (c) {
      if (c.tagName === "SELECT" || c.closest(".ad-panel-head")) return;
      c.addEventListener("click", function () {
        $$(".ad-chip", c.parentElement).forEach(function (x) {
          x.classList.remove("on");
        });
        c.classList.add("on");
      });
    });
    $$(".ad-tab", root).forEach(function (t) {
      t.addEventListener("click", function () {
        $$(".ad-tab", t.parentElement).forEach(function (x) {
          x.classList.remove("on");
        });
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
    var series = id === "trend" ? [{
      key: "ok",
      label: "成功",
      color: "#5B61E8"
    }, {
      key: "fail",
      label: "失败",
      color: "#D9484C"
    }] : [{
      key: "v",
      label: "估算成本 $",
      color: "#5B61E8"
    }];
    svg.addEventListener("mousemove", function (e) {
      var rect = svg.getBoundingClientRect();
      var i = Math.round(((e.clientX - rect.left) / rect.width * 640 - 36) / ((640 - 46) / (data.length - 1)));
      i = Math.max(0, Math.min(data.length - 1, i));
      $$("[data-chart-dot]", svg).forEach(function (d) {
        d.setAttribute("opacity", d.getAttribute("data-chart-dot") == i ? 1 : 0);
      });
      var row = data[i];
      tip.innerHTML = '<span class="d">' + row.d + "</span>" + series.map(function (s) {
        return '<div class="row"><span class="dot" style="background:' + s.color + '"></span>' + s.label + " " + row[s.key] + "</div>";
      }).join("");
      tip.style.left = (36 + i * ((640 - 46) / (data.length - 1))) / 640 * 100 + "%";
      tip.style.top = "36px";
      tip.classList.add("show");
    });
    svg.addEventListener("mouseleave", function () {
      tip.classList.remove("show");
      $$("[data-chart-dot]", svg).forEach(function (d) {
        d.setAttribute("opacity", 0);
      });
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
  function matById(id) {
    return D.MATERIALS.filter(function (m) {
      return m.id === id;
    })[0];
  }
  function bindMaterials(root) {
    $$("[data-mat-edit]", root).forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-mat-edit");
        var m = matById(id) || {
          id: "新建",
          title: "",
          cat: "场景",
          img: "",
          prompt: ""
        };
        openDrawer(id === "new" ? "新建素材" : "编辑素材", '<span class="ad-mono">' + m.id + "</span> · 保存后即时对前台生效", '<label class="ad-form-label">标题</label><input class="ad-field" value="' + m.title + '"></input>' + '<label class="ad-form-label">分类</label><select class="ad-field"><option>热门</option><option' + (m.cat === "人物" ? " selected" : "") + ">人物</option><option" + (m.cat === "场景" ? " selected" : "") + ">场景</option><option" + (m.cat === "风格" ? " selected" : "") + ">风格</option></select>" + '<label class="ad-form-label">提示词</label><textarea class="ad-field">' + m.prompt + "</textarea>" + '<label class="ad-form-label">图片 URL（暂仅支持粘贴 URL，直传为后端规划能力）</label>' + '<input class="ad-field" id="mat-url" value="' + (m.img || "") + '" placeholder="https://…/cover.jpg"></input>' + '<p class="ad-field-error" id="mat-url-err" hidden>URL 需以 http(s) 开头且指向图片文件</p>' + '<h4>预览</h4><div id="mat-preview">' + (m.img ? '<img src="' + m.img + '" style="width:100%; border-radius:10px; border:1px solid var(--ad-border)" alt="封面预览">' : '<p class="ad-sub">粘贴 URL 后此处出现预览</p>') + "</div>" + '<div style="display:flex; gap:8px; margin-top:20px"><button type="button" class="ad-btn primary" id="mat-save">保存</button><button type="button" class="ad-btn" id="mat-cancel">取消</button></div>');
        $("#mat-url").addEventListener("input", function () {
          var ok = /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)(\?.*)?$/i.test(this.value) || /^\.\.\//.test(this.value);
          $("#mat-url-err").hidden = ok || !this.value;
          this.classList.toggle("invalid", !ok && !!this.value);
          if (ok) $("#mat-preview").innerHTML = '<img src="' + this.value + '" style="width:100%; border-radius:10px; border:1px solid var(--ad-border)" alt="封面预览">';
        });
        $("#mat-save").addEventListener("click", function () {
          closeDrawer();
          toast("素材已保存", false, "已即时对前台生效");
        });
        $("#mat-cancel").addEventListener("click", closeDrawer);
      });
    });
    $$("[data-mat-hide]", root).forEach(function (b) {
      b.addEventListener("click", function () {
        var m = matById(b.getAttribute("data-mat-hide"));
        if (m.hidden) {
          m.hidden = false;
          renderView("materials");
          toast("已恢复显示", false, "前台立即可见");
          return;
        }
        confirmDialog({
          title: "隐藏素材「" + m.title + "」？",
          desc: "隐藏后前台提示词库立即看不到这条素材，数据保留，可随时恢复。",
          impact: "即时对前台生效；已套用该提示词的用户不受影响。",
          ok: "隐藏",
          onOk: function () {
            m.hidden = true;
            renderView("materials");
            toast("已隐藏", false, "前台不再展示");
          }
        });
      });
    });
    $$("[data-mat-del]", root).forEach(function (b) {
      b.addEventListener("click", function () {
        var m = matById(b.getAttribute("data-mat-del"));
        confirmDialog({
          title: "删除素材「" + m.title + "」？",
          desc: "删除不可恢复，序号将自动顺延。",
          crit: true,
          impact: "即时对前台生效；这条提示词从提示词库彻底消失。",
          ok: "确认删除",
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
      card.addEventListener("dragstart", function () {
        dragging = card;
        card.classList.add("dragging");
      });
      card.addEventListener("dragend", function () {
        card.classList.remove("dragging");
        dragging = null;
      });
      card.addEventListener("dragover", function (e) {
        e.preventDefault();
        card.classList.add("drag-over");
      });
      card.addEventListener("dragleave", function () {
        card.classList.remove("drag-over");
      });
      card.addEventListener("drop", function (e) {
        e.preventDefault();
        card.classList.remove("drag-over");
        if (!dragging || dragging === card) return;
        var a = matById(dragging.getAttribute("data-mat")),
          b2 = matById(card.getAttribute("data-mat"));
        var t = a.order;
        a.order = b2.order;
        b2.order = t;
        renderView("materials");
        toast("排序已保存", false, "#" + b2.order + " ↔ #" + a.order + " · 即时对前台生效");
      });
    });
  }

  /* 分享管理 */
  function bindShares(root) {
    $$("[data-share]", root).forEach(function (tr) {
      tr.addEventListener("click", function () {
        var s = D.SHARES.filter(function (x) {
          return x.id === tr.getAttribute("data-share");
        })[0];
        var down = s.state === "已下架";
        openDrawer("分享详情", ADVIEWS.helpers.copyCode(s.id), (down ? '<div class="adx-empty" style="border:1px dashed var(--ad-border-strong); border-radius:10px; padding:28px"><div class="glyph">🚫</div><h4>内容已下架</h4><p>下架内容不再提供原图预览；如需恢复请点下方按钮。</p></div>' : '<img src="' + s.img + '" style="width:100%; border-radius:10px; border:1px solid var(--ad-border)" alt="分享大图">') + '<dl class="ad-kv" style="margin-top:16px"><dt>标题</dt><dd>' + s.title + "</dd><dt>作者</dt><dd>" + s.author + "</dd><dt>状态</dt><dd>" + s.state + "</dd><dt>举报数</dt><dd>" + s.reports + (s.reports > 0 ? '<span class="ad-sub">（举报理由后端暂未存储，此处为扩展位）</span>' : "") + "</dd><dt>创建</dt><dd>" + s.time + "</dd></dl>" + "<h4>提示词</h4><pre class=\"ad-codeblock\" style=\"background:var(--ad-ground); color:var(--ad-ink)\">" + s.prompt + "</pre>" + '<div style="display:flex; gap:8px; margin-top:20px">' + (down ? '<button type="button" class="ad-btn primary" id="share-restore">恢复上架</button>' : '<button type="button" class="ad-btn danger" id="share-down">下架该分享</button>') + "</div>");
        var btn = $("#share-down");
        if (btn) btn.addEventListener("click", function () {
          confirmDialog({
            title: "下架「" + s.title + "」？",
            desc: "适用于违规或被多次举报的内容。",
            crit: true,
            impact: "下架后分享链接立即失效，访客将看到「已失效或已下架」页；作者不会收到通知。",
            ok: "确认下架",
            onOk: function () {
              s.state = "已下架";
              closeDrawer();
              renderView("shares");
              toast("已下架", false, s.id + " · 已记入审计日志");
            }
          });
        });
        var rbtn = $("#share-restore");
        if (rbtn) rbtn.addEventListener("click", function () {
          s.state = "正常";
          closeDrawer();
          renderView("shares");
          toast("已恢复上架", false, "分享链接重新可访问");
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
        var r = D.REVIEWS.filter(function (x) {
          return x.id === tr.getAttribute("data-review");
        })[0];
        openDrawer("复审 · 命中「" + r.word + "」", ADVIEWS.helpers.copyCode(r.id) + " · " + r.time, '<dl class="ad-kv"><dt>用户</dt><dd>' + r.email + "</dd><dt>命中词</dt><dd>「" + r.word + "」（标记复审档）</dd></dl>" + "<h4>提示词原文</h4><pre class=\"ad-codeblock\" style=\"background:var(--ad-ground); color:var(--ad-ink)\">" + r.prompt + "</pre>" + '<p class="ad-sub" style="margin-top:14px">复审结论仅记入审计日志，v1 不改变任务状态。</p>' + '<div style="display:flex; gap:8px; margin-top:12px">' + '<button type="button" class="ad-btn primary" data-verdict="pass">判定通过</button>' + '<button type="button" class="ad-btn danger" data-verdict="down">下架并标记</button></div>');
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
                  var c = $("#review-count");
                  if (c) c.textContent = D.REVIEWS.length;
                  var badge = $('[data-badge="safety"]');
                  if (badge) badge.textContent = D.REVIEWS.length;
                  if (!D.REVIEWS.length) $("#review-tbody").innerHTML = '<tr><td colspan="4">' + ADVIEWS.helpers.emptyState("celebrate", "复审队列清空了 🎉", "新命中的请求会自动出现在这里。") + "</td></tr>";
                }, 280);
              }
              toast(pass ? "已判定通过" : "已下架并标记", false, r.id + " · 已记入审计日志");
            }
            if (pass) return done();
            confirmDialog({
              title: "下架并标记？",
              desc: "对应分享（如有）将下架，该提示词计入命中统计。",
              crit: true,
              impact: "分享链接立即失效；复审结论记入审计日志，不撤回已生成图片。",
              ok: "下架并标记",
              onOk: done
            });
          });
        });
      });
    });
    var addBtn = $("#word-add");
    if (addBtn) addBtn.addEventListener("click", function () {
      var w = $("#word-input").value.trim();
      if (!w) {
        toast("请输入违禁词", true);
        return;
      }
      D.WORDS.unshift({
        w: w,
        action: $("#word-mode").value,
        hits: 0,
        time: "今天"
      });
      renderView("safety");
      toast("已添加违禁词", false, "「" + w + "」· " + D.DICT.wordAction[$("#word-mode") ? "flag" : "flag"]);
    });
    $$("[data-word-del]", root).forEach(function (b) {
      b.addEventListener("click", function () {
        var w = b.getAttribute("data-word-del");
        confirmDialog({
          title: "删除违禁词「" + w + "」？",
          desc: "词库暂不支持编辑，如需修改动作请删除后重加。",
          crit: true,
          impact: "删除后新请求不再按此词命中；历史命中统计保留。",
          ok: "确认删除",
          onOk: function () {
            D.WORDS = D.WORDS.filter(function (x) {
              return x.w !== w;
            });
            renderView("safety");
            $$('[data-safety-tab]').forEach(function (t) {
              t.classList.toggle("on", t.getAttribute("data-safety-tab") === "words");
            });
            $("#safety-queue").hidden = true;
            $("#safety-words").hidden = false;
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
        var a = D.ANNOUNCES.filter(function (x) {
          return x.id === el.getAttribute("data-announce");
        })[0];
        openDrawer("编辑公告", D.DICT.announceState[a.state] + " · " + a.id, '<div class="adx-statemachine"><span class="st' + (a.state === "draft" ? " on" : "") + '">草稿</span>→<span class="st' + (a.state === "active" ? " on" : "") + '">生效中</span>→<span class="st' + (a.state === "ended" ? " on" : "") + '">已结束</span></div>' + '<label class="ad-form-label">标题</label><input class="ad-field" id="an-title" value="' + a.title + '"></input>' + '<label class="ad-form-label">内容</label><textarea class="ad-field" id="an-body">' + a.body + "</textarea>" + '<label class="ad-form-label">位置</label><select class="ad-field"><option>顶栏下通栏</option><option>生图站侧栏</option><option>画布落地页</option><option>分享页</option></select>' + '<label class="ad-form-label">生效起止</label>' + '<div style="display:grid; grid-template-columns:1fr 1fr; gap:8px"><input class="ad-field" id="an-from" type="datetime-local" value="' + a.from.replace(" ", "T") + '"></input><input class="ad-field" id="an-to" type="datetime-local" value="' + a.to.replace(" ", "T") + '"></input></div>' + '<p class="ad-field-error" id="an-time-err" hidden>结束时间必须晚于开始时间</p>' + '<h4>前台预览（所见即所得 · 浅色态）</h4>' + '<div class="adx-banner-preview"><p class="cap">生图站顶栏下通栏</p>' + '<div class="lumio-announce"><span class="tag">公告</span><p id="an-preview">' + a.body + '</p><span class="x">✕</span></div></div>' + '<div style="display:flex; gap:8px; margin-top:20px"><button type="button" class="ad-btn primary" id="an-save">保存</button><button type="button" class="ad-btn" id="an-cancel">取消</button></div>');
        $("#an-body").addEventListener("input", function () {
          $("#an-preview").textContent = this.value;
        });
        function validTime() {
          var ok = $("#an-from").value < $("#an-to").value;
          $("#an-time-err").hidden = ok;
          $("#an-to").classList.toggle("invalid", !ok);
          return ok;
        }
        $("#an-from").addEventListener("change", validTime);
        $("#an-to").addEventListener("change", validTime);
        $("#an-save").addEventListener("click", function () {
          if (!validTime()) {
            toast("结束时间早于开始时间，请修正", true);
            return;
          }
          closeDrawer();
          toast("公告已保存", false, "按生效区间自动流转状态");
        });
        $("#an-cancel").addEventListener("click", closeDrawer);
      });
    });
    $$("[data-announce-del]", root).forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var a = D.ANNOUNCES.filter(function (x) {
          return x.id === b.getAttribute("data-announce-del");
        })[0];
        confirmDialog({
          title: "删除公告「" + a.title + "」？",
          desc: "删除不可恢复。",
          crit: true,
          impact: a.state === "active" ? "该公告正在生效中，删除后前台横幅立即消失。" : "该公告未在生效中，删除仅影响后台记录。",
          ok: "确认删除",
          onOk: function () {
            D.ANNOUNCES.splice(D.ANNOUNCES.indexOf(a), 1);
            renderView("announcements");
            toast("已删除公告");
          }
        });
      });
    });
  }

  /* 用户记录 */
  function bindUsers(root) {
    $$("[data-user]", root).forEach(function (tr) {
      tr.addEventListener("click", function () {
        var u = D.USERS[+tr.getAttribute("data-user")];
        openDrawer("用户详情", u.email + " · 只读", '<div class="ad-mini-kpi"><div><div class="l">生成量</div><div class="v ad-tnum">' + u.gens + '</div></div><div><div class="l">成功率</div><div class="v ad-tnum">' + u.ok + '</div></div><div><div class="l">累计消费</div><div class="v ad-tnum">' + u.spend + "</div></div></div>" + '<dl class="ad-kv"><dt>注册时间</dt><dd>' + u.reg + "</dd><dt>额度来源</dt><dd>" + D.DICT.spendSource[u.src] + "</dd><dt>最近活跃</dt><dd>" + u.last + "</dd><dt>设备数</dt><dd>" + u.device + "</dd></dl>" + "<h4>最近生成</h4><ul class=\"ad-timeline\"><li>✦ 银河星空 · gpt-image-2<span class=\"tt\">12 分钟前</span></li><li>✦ 流动的丝绸渐变 · gpt-image-2<span class=\"tt\">1 小时前</span></li><li>✦ 彩虹光晕（失败 · 上游服务报错）<span class=\"tt\">2 小时前</span></li></ul>" + "<h4>设备 / IP 风控</h4><ul class=\"ad-timeline\"><li>" + ADVIEWS.helpers.copyCode("fp_a91c30cd7e2f…") + '<span class="tt">设备指纹</span></li><li>' + ADVIEWS.helpers.copyCode("203.0.113.**") + '<span class="tt">最近 IP</span></li></ul>' + '<p class="ad-sub" style="margin-top:16px">禁用账号 / 重置额度为后端规划能力，本模块只读。</p>');
      });
    });
  }

  /* 报错监控 */
  function bindErrors(root) {
    $$("[data-error]", root).forEach(function (tr) {
      tr.addEventListener("click", function () {
        var e2 = D.ERRORS.filter(function (x) {
          return x.id === tr.getAttribute("data-error");
        })[0];
        openDrawer("报错详情", ADVIEWS.helpers.copyCode(e2.id) + " · " + e2.time, '<dl class="ad-kv"><dt>类型</dt><dd>' + D.DICT.errorType[e2.type] + ' <span class="ad-sub ad-mono">(' + e2.type + ")</span></dd><dt>用户</dt><dd>" + e2.email + ' <a href="#" data-goto-user>查看该用户 →</a></dd><dt>模型</dt><dd class="ad-mono">' + e2.model + "</dd><dt>摘要</dt><dd>" + e2.msg + "</dd></dl>" + '<div style="border:1px solid var(--ad-border); border-radius:10px; padding:12px 14px; display:flex; align-items:center; gap:10px; margin-bottom:8px"><span class="ad-pill crit">HTTP ' + e2.http + '</span><span class="ad-sub">上游返回状态码</span></div>' + '<details class="ad-reveal crit"><summary>上游响应原文<span class="tag">JSON</span></summary><div class="reveal-body"><pre class="ad-codeblock">{\n  "error": {\n    "message": "upstream gateway returned non-JSON body",\n    "status": ' + e2.http + '\n  }\n}</pre></div></details>' + '<details class="ad-reveal"><summary>请求参数<span class="tag">JSON</span></summary><div class="reveal-body"><pre class="ad-codeblock">{\n  "model": "' + e2.model + '",\n  "size": "1024x1024",\n  "n": 1\n}</pre></div></details>' + '<details class="ad-reveal"><summary>站内上下文<span class="tag">JSON</span></summary><div class="reveal-body"><pre class="ad-codeblock">{\n  "task_id": "' + e2.id + '",\n  "spend_source": "paid",\n  "retry": 0\n}</pre></div></details>');
        var link = $("[data-goto-user]");
        if (link) link.addEventListener("click", function (ev) {
          ev.preventDefault();
          closeDrawer();
          goto("users");
        });
      });
    });
  }

  /* 审计日志 */
  function bindAudit(root) {
    $$("[data-audit]", root).forEach(function (tr) {
      tr.addEventListener("click", function () {
        var a = D.AUDITS[+tr.getAttribute("data-audit")];
        openDrawer("审计详情", a.act + " · " + a.time, '<dl class="ad-kv"><dt>操作者</dt><dd>' + a.who + "</dd><dt>对象</dt><dd>" + ADVIEWS.helpers.copyCode(a.target) + "</dd><dt>摘要</dt><dd>" + a.summary + "</dd></dl>" + '<details class="ad-reveal" open><summary>原始记录<span class="tag">JSON</span></summary><div class="reveal-body"><pre class="ad-codeblock">' + a.raw + "</pre></div></details>" + '<p class="ad-sub" style="margin-top:14px">审计日志只读、不可撤销。</p>');
      });
    });
  }

  /* ---------- 演示控制 ---------- */
  $$("[data-demo]").forEach(function (b) {
    b.addEventListener("click", function () {
      var d = b.getAttribute("data-demo");
      var el = $("#view-" + current);
      if (d === "403") {
        $("#forbidden").classList.add("open");
        return;
      }
      if (d === "loading") {
        el.innerHTML = '<div class="ad-kpi-row cols-4">' + new Array(4).fill('<div class="ad-kpi"><div class="label" style="background:#EEF0F4; color:transparent; border-radius:6px; width:60%">…</div><div class="val" style="background:#EEF0F4; color:transparent; border-radius:8px; width:40%">…</div></div>').join("") + '</div><div class="ad-panel"><div class="ad-loading">正在加载数据…</div></div>';
        setTimeout(function () {
          renderView(current);
        }, 1200);
        return;
      }
      if (d === "error") {
        el.innerHTML = '<div class="ad-panel">' + ADVIEWS.helpers.emptyState("error", "数据拉取失败", "接口返回 502。这不是空数据——请重试；持续失败请查报错监控。", '<button type="button" class="ad-btn primary" id="retry-view">重试</button>') + "</div>";
        $("#retry-view").addEventListener("click", function () {
          renderView(current);
          toast("已重新加载");
        });
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
        $$(".ad-badge").forEach(function (x) {
          x.remove();
        });
        toast("徽标计数加载失败", true, "best-effort：静默隐藏徽标，不阻塞导航（本轮定稿方案）");
      }
    });
  });
  $("#forbidden-close").addEventListener("click", function () {
    $("#forbidden").classList.remove("open");
  });

  /* 初始渲染 */
  Object.keys(TITLES).forEach(function (v) {
    if (v === "overview") renderView(v);
  });
})();
})(); } catch (e) { __ds_ns.__errors.push({ path: "designs/admin/admin-app.js", error: String((e && e.message) || e) }); }

// designs/admin/admin-data.js
try { (() => {
/* Lumio Admin 原型 · 示例数据 + 词表（01-admin §4.4 工程枚举中文化，逐字执行） */
var ADX = function () {
  "use strict";

  var DICT = {
    errorType: {
      provider_error: "上游服务报错",
      quota_exhausted: "额度耗尽",
      rate_limited: "触发限流",
      internal_error: "站内错误"
    },
    spendSource: {
      paid: "付费",
      invite: "邀请奖励",
      login: "登录赠送",
      anonymous: "匿名试用"
    },
    announceState: {
      draft: "草稿",
      active: "生效中",
      ended: "已结束"
    },
    wordAction: {
      flag: "标记复审",
      block: "直接拦截"
    },
    auditTone: {
      "share.takedown": "crit",
      "material.create": "accent",
      "material.update": "accent",
      "material.hide": "accent",
      "safety.review": "warn",
      "safety.word.add": "warn",
      "announcement.create": "good",
      "announcement.update": "good"
    }
  };
  var A = "../assets/";
  var MATERIALS = [{
    id: "m-101",
    title: "城市生命系统图谱",
    cat: "场景",
    order: 1,
    img: A + "case1.jpg",
    hidden: false,
    prompt: "城市基础设施剖面信息图，手绘混写实风格，中英双语标注"
  }, {
    id: "m-102",
    title: "夜市大排档人像海报",
    cat: "人物",
    order: 2,
    img: A + "case15.jpg",
    hidden: false,
    prompt: "夜市大排档人像海报，霓虹灼热氛围，毛笔字标题排版"
  }, {
    id: "m-103",
    title: "流动的丝绸渐变",
    cat: "风格",
    order: 3,
    img: A + "community-2.jpg",
    hidden: false,
    prompt: "流动的丝绸质感渐变，紫罗兰与青蓝交织，柔和体积光"
  }, {
    id: "m-104",
    title: "国风美食图鉴",
    cat: "风格",
    order: 4,
    img: A + "case14.jpg",
    hidden: true,
    prompt: "国风水彩美食步骤图鉴，毛笔标题，米色纸纹底"
  }, {
    id: "m-105",
    title: "成都吃货暴走地图",
    cat: "场景",
    order: 5,
    img: A + "case17.jpg",
    hidden: false,
    prompt: "手绘水彩城市美食地图，地标与小吃插画，编号标注式排版"
  }, {
    id: "m-106",
    title: "彩虹光晕",
    cat: "风格",
    order: 6,
    img: A + "community-4.jpg",
    hidden: false,
    prompt: "彩虹色柔焦光晕渐变，梦幻氛围，超高清壁纸"
  }];
  var SHARES = [{
    id: "sh-9f2a",
    title: "流动的丝绸渐变",
    author: "c***r@lumio.games",
    state: "正常",
    reports: 0,
    time: "3 天前",
    img: A + "community-2.jpg",
    prompt: "流动的丝绸质感渐变，紫罗兰、青蓝与暖橙交织，柔和体积光"
  }, {
    id: "sh-8e11",
    title: "周末清晨的咖啡",
    author: "n***o@qq.com",
    state: "正常",
    reports: 2,
    time: "5 小时前",
    img: A + "community-5.jpg",
    prompt: "床上的笔记本电脑与拿铁，俯拍视角，暖调生活摄影"
  }, {
    id: "sh-77c0",
    title: "彩虹光晕",
    author: "s***y@gmail.com",
    state: "已下架",
    reports: 4,
    time: "昨天",
    img: A + "community-4.jpg",
    prompt: "彩虹色柔焦光晕渐变，梦幻氛围，超高清壁纸"
  }, {
    id: "sh-6b3d",
    title: "银河星空",
    author: "b***k@163.com",
    state: "正常",
    reports: 0,
    time: "2 天前",
    img: A + "community-6.jpg",
    prompt: "深空银河核心，璨璨星云与尘埃，长曝光摄影质感"
  }];
  var REVIEWS = [{
    id: "rv-501",
    word: "枪支",
    prompt: "一把老式左轮枪支静物素描，博物馆展品风格",
    email: "a***e@gmail.com",
    time: "26 分钟前"
  }, {
    id: "rv-502",
    word: "血",
    prompt: "万圣节舞台妆容，假血浆特效教程配图",
    email: "h***w@qq.com",
    time: "1 小时前"
  }, {
    id: "rv-503",
    word: "裸",
    prompt: "裸眼 3D 大屏效果演示，城市地标",
    email: "d***g@lumio.games",
    time: "2 小时前"
  }, {
    id: "rv-504",
    word: "暴力",
    prompt: "反对校园暴力公益海报，插画风格",
    email: "p***a@163.com",
    time: "4 小时前"
  }, {
    id: "rv-505",
    word: "枪支",
    prompt: "水枪大战夏日活动海报",
    email: "k***m@gmail.com",
    time: "昨天"
  }];
  var WORDS = [{
    w: "枪支",
    action: "flag",
    hits: 34,
    time: "2026-05-12"
  }, {
    w: "血",
    action: "flag",
    hits: 21,
    time: "2026-05-12"
  }, {
    w: "裸",
    action: "flag",
    hits: 18,
    time: "2026-06-02"
  }, {
    w: "暴力",
    action: "flag",
    hits: 9,
    time: "2026-06-02"
  }, {
    w: "毒品",
    action: "block",
    hits: 3,
    time: "2026-06-20"
  }];
  var ANNOUNCES = [{
    id: "an-1",
    title: "4K 档开放公告",
    body: "gpt-image-2 · 4K 档已开放，登录后即可使用账户余额生成。",
    pos: "顶栏下通栏",
    state: "active",
    from: "2026-07-01 00:00",
    to: "2026-07-15 00:00"
  }, {
    id: "an-2",
    title: "周五凌晨维护",
    body: "本周五 02:00–03:00 系统维护，期间生成可能排队。",
    pos: "顶栏下通栏",
    state: "draft",
    from: "2026-07-10 00:00",
    to: "2026-07-11 00:00"
  }, {
    id: "an-3",
    title: "端午活动",
    body: "端午期间邀请好友双方各得 30 次。",
    pos: "顶栏下通栏",
    state: "ended",
    from: "2026-06-18 00:00",
    to: "2026-06-25 00:00"
  }];
  var USERS = [{
    email: "c***r@lumio.games",
    reg: "2026-03-02",
    gens: 412,
    ok: "97.6%",
    spend: "$38.20",
    src: "paid",
    last: "12 分钟前",
    device: 2
  }, {
    email: "n***o@qq.com",
    reg: "2026-05-14",
    gens: 129,
    ok: "94.1%",
    spend: "$6.40",
    src: "paid",
    last: "2 小时前",
    device: 1
  }, {
    email: "s***y@gmail.com",
    reg: "2026-06-01",
    gens: 46,
    ok: "91.3%",
    spend: "$0",
    src: "invite",
    last: "昨天",
    device: 3
  }, {
    email: "h***w@qq.com",
    reg: "2026-06-20",
    gens: 23,
    ok: "95.7%",
    spend: "$0",
    src: "login",
    last: "3 天前",
    device: 1
  }, {
    email: "（匿名设备 fp_a91…）",
    reg: "—",
    gens: 3,
    ok: "100%",
    spend: "$0",
    src: "anonymous",
    last: "5 天前",
    device: 1
  }];
  var INVITES = [{
    inviter: "c***r@lumio.games",
    invitee: "s***y@gmail.com",
    state: "已发放",
    reward: "20 次",
    time: "2026-06-01"
  }, {
    inviter: "c***r@lumio.games",
    invitee: "t***p@163.com",
    state: "待发放",
    reward: "20 次",
    time: "今天"
  }, {
    inviter: "n***o@qq.com",
    invitee: "q***z@qq.com",
    state: "已发放",
    reward: "20 次",
    time: "2026-06-28"
  }, {
    inviter: "x***v@gmail.com",
    invitee: "x***v+1@gmail.com",
    state: "作弊拦截",
    reward: "—",
    time: "2026-07-02"
  }];
  var ERRORS = [{
    id: "er-2201",
    type: "provider_error",
    email: "n***o@qq.com",
    model: "gpt-image-2-4k",
    http: 502,
    time: "8 分钟前",
    msg: "上游网关返回非 JSON 错误"
  }, {
    id: "er-2200",
    type: "rate_limited",
    email: "h***w@qq.com",
    model: "gemini-3.1-flash",
    http: 429,
    time: "22 分钟前",
    msg: "触发上游限流，已排队重试"
  }, {
    id: "er-2199",
    type: "quota_exhausted",
    email: "（匿名设备）",
    model: "gpt-image-2",
    http: 402,
    time: "1 小时前",
    msg: "免费额度用尽后继续请求"
  }, {
    id: "er-2198",
    type: "provider_error",
    email: "c***r@lumio.games",
    model: "gpt-image-2-2k",
    http: 504,
    time: "2 小时前",
    msg: "2K 生成 240 秒超时"
  }, {
    id: "er-2197",
    type: "internal_error",
    email: "s***y@gmail.com",
    model: "gpt-image-2",
    http: 500,
    time: "昨天",
    msg: "S3 上传失败：连接重置"
  }];
  var AUDITS = [{
    act: "share.takedown",
    who: "ops@lumio.games",
    target: "sh-77c0",
    time: "10 分钟前",
    summary: "下架分享「彩虹光晕」（举报 4 次，命中复审）",
    raw: '{"action":"share.takedown","target":"sh-77c0","reason":"reports>=3","operator":"ops@lumio.games"}'
  }, {
    act: "material.update",
    who: "ops@lumio.games",
    target: "m-103",
    time: "1 小时前",
    summary: "更新素材「流动的丝绸渐变」排序 5 → 3",
    raw: '{"action":"material.update","target":"m-103","changes":{"sortOrder":[5,3]}}'
  }, {
    act: "safety.word.add",
    who: "ops@lumio.games",
    target: "毒品",
    time: "昨天",
    summary: "新增违禁词「毒品」，动作：直接拦截",
    raw: '{"action":"safety.word.add","word":"毒品","mode":"block"}'
  }, {
    act: "announcement.update",
    who: "ops@lumio.games",
    target: "an-1",
    time: "昨天",
    summary: "公告「4K 档开放公告」由草稿改为生效中",
    raw: '{"action":"announcement.update","target":"an-1","changes":{"state":["draft","active"]}}'
  }, {
    act: "safety.review",
    who: "ops@lumio.games",
    target: "rv-498",
    time: "2 天前",
    summary: "复审判定通过（水枪大战海报，误命中「枪支」）",
    raw: '{"action":"safety.review","target":"rv-498","verdict":"pass"}'
  }];
  var TREND = [{
    d: "6/26",
    ok: 512,
    fail: 22
  }, {
    d: "6/27",
    ok: 548,
    fail: 18
  }, {
    d: "6/28",
    ok: 601,
    fail: 35
  }, {
    d: "6/29",
    ok: 577,
    fail: 26
  }, {
    d: "6/30",
    ok: 640,
    fail: 19
  }, {
    d: "7/1",
    ok: 731,
    fail: 41
  }, {
    d: "7/2",
    ok: 702,
    fail: 24
  }, {
    d: "7/3",
    ok: 688,
    fail: 21
  }, {
    d: "7/4",
    ok: 745,
    fail: 30
  }, {
    d: "7/5",
    ok: 791,
    fail: 27
  }, {
    d: "7/6",
    ok: 812,
    fail: 44
  }, {
    d: "7/7",
    ok: 856,
    fail: 25
  }, {
    d: "7/8",
    ok: 901,
    fail: 33
  }, {
    d: "7/9",
    ok: 486,
    fail: 12
  }];
  var COSTD = [{
    d: "7/3",
    v: 41.2
  }, {
    d: "7/4",
    v: 44.8
  }, {
    d: "7/5",
    v: 47.5
  }, {
    d: "7/6",
    v: 48.9
  }, {
    d: "7/7",
    v: 51.4
  }, {
    d: "7/8",
    v: 54.1
  }, {
    d: "7/9",
    v: 29.3
  }];
  var MODELS = [{
    n: "gpt-image-2",
    v: 5120
  }, {
    n: "gpt-image-2 · 2K",
    v: 1830
  }, {
    n: "gemini-3.1-flash",
    v: 1490
  }, {
    n: "gpt-image-2 · 4K",
    v: 410
  }];
  return {
    DICT: DICT,
    MATERIALS: MATERIALS,
    SHARES: SHARES,
    REVIEWS: REVIEWS,
    WORDS: WORDS,
    ANNOUNCES: ANNOUNCES,
    USERS: USERS,
    INVITES: INVITES,
    ERRORS: ERRORS,
    AUDITS: AUDITS,
    TREND: TREND,
    COSTD: COSTD,
    MODELS: MODELS
  };
}();
})(); } catch (e) { __ds_ns.__errors.push({ path: "designs/admin/admin-data.js", error: String((e && e.message) || e) }); }

// designs/admin/admin-views.js
try { (() => {
/* Lumio Admin 原型 · 各模块视图渲染 */
var ADVIEWS = function () {
  "use strict";

  var D = ADX;

  /* ---------- 小工具 ---------- */
  function pill(tone, text) {
    return '<span class="ad-pill ' + tone + '">' + text + "</span>";
  }
  function copyCode(v) {
    return '<span class="adx-copy"><code>' + v + '</code><button type="button" data-copy="' + v + '" aria-label="复制">' + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button></span>';
  }
  function emptyState(kind, title, desc, action) {
    var glyph = kind === "celebrate" ? "🎉" : kind === "error" ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4M12 16h.01"></path></svg>' : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12H3M21 6H3M15 18H3"></path></svg>';
    return '<div class="adx-empty ' + kind + '"><div class="glyph">' + glyph + "</div><h4>" + title + "</h4><p>" + desc + "</p>" + (action || "") + "</div>";
  }
  function truncateStrip(n, total, note) {
    return '<div class="adx-truncate-strip"><strong>仅显示最近 ' + n + " 条</strong><span>" + note + "</span><a href=\"#\" data-toast=\"原型内不含更早数据\">查看更早 →</a></div>";
  }
  function pager(total) {
    return '<div class="adx-pager"><span class="total">共 ' + total + ' 条 · 每页 20 条</span>' + '<button type="button" disabled>‹</button><button type="button" class="on">1</button><button type="button">2</button><button type="button">3</button><button type="button">›</button></div>';
  }

  /* ---------- 折线图（SVG + tooltip） ---------- */
  function lineChart(id, data, series, h) {
    h = h || 180;
    var w = 640,
      padL = 36,
      padB = 22,
      padT = 12;
    var max = 0;
    data.forEach(function (row) {
      series.forEach(function (s) {
        max = Math.max(max, row[s.key]);
      });
    });
    max = Math.ceil(max / 100) * 100 || 10;
    var iw = w - padL - 10,
      ih = h - padT - padB;
    function x(i) {
      return padL + i / (data.length - 1) * iw;
    }
    function y(v) {
      return padT + ih - v / max * ih;
    }
    var grid = "",
      labels = "";
    for (var g = 0; g <= 3; g++) {
      var gy = padT + ih * g / 3;
      grid += '<line x1="' + padL + '" x2="' + (w - 10) + '" y1="' + gy + '" y2="' + gy + '" stroke="#EEF0F4"></line>';
      labels += '<text x="' + (padL - 6) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="10" fill="#969BA8">' + Math.round(max - max * g / 3) + "</text>";
    }
    data.forEach(function (row, i) {
      if (i % Math.ceil(data.length / 7) === 0 || i === data.length - 1) labels += '<text x="' + x(i) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="10" fill="#969BA8">' + row.d + "</text>";
    });
    var paths = series.map(function (s) {
      var dstr = data.map(function (row, i) {
        return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(row[s.key]).toFixed(1);
      }).join(" ");
      return '<path d="' + dstr + '" fill="none" stroke="' + s.color + '" stroke-width="2" stroke-linejoin="round"></path>';
    }).join("");
    var hits = data.map(function (row, i) {
      return '<rect x="' + (x(i) - iw / data.length / 2) + '" y="0" width="' + iw / data.length + '" height="' + h + '" fill="transparent" data-chart-i="' + i + '"></rect>' + series.map(function (s) {
        return '<circle cx="' + x(i) + '" cy="' + y(row[s.key]) + '" r="3" fill="' + s.color + '" opacity="0" data-chart-dot="' + i + '"></circle>';
      }).join("");
    }).join("");
    var legend = '<div class="adx-legend">' + series.map(function (s) {
      return "<span><i style=\"background:" + s.color + "\"></i>" + s.label + "</span>";
    }).join("") + "</div>";
    return '<div class="adx-chart" data-chart="' + id + '" data-chart-max="' + max + '">' + '<svg viewBox="0 0 ' + w + " " + h + '">' + grid + labels + paths + hits + "</svg>" + '<div class="adx-chart-tip" data-chart-tip></div>' + legend + "</div>";
  }
  function bars(rows, unit) {
    var max = Math.max.apply(null, rows.map(function (r) {
      return r.v;
    }));
    return '<div class="ad-bars">' + rows.map(function (r) {
      return '<div class="ad-bar-row"><span class="bn">' + r.n + '</span><div class="ad-bar-track"><div class="ad-bar-fill" style="width:' + r.v / max * 100 + '%"></div></div><span class="bv ad-tnum">' + r.v.toLocaleString() + (unit || "") + "</span></div>";
    }).join("") + "</div>";
  }

  /* ---------- 总览 ---------- */
  function overview() {
    return '' + '<div class="adx-attention" data-screen-label="总览·待处理主角区">' + '<a href="#" data-goto="shares"><span class="n">3</span><span><span class="t">待复核分享举报</span><br><span class="s">最早 5 小时前 · 举报≥2 自动进入</span></span><span class="go">→</span></a>' + '<a href="#" data-goto="safety"><span class="n">5</span><span><span class="t">内容安全复审队列</span><br><span class="s">最早 26 分钟前 · 命中违禁词</span></span><span class="go">→</span></a>' + '<a href="#" data-goto="errors"><span class="n">12</span><span><span class="t">今日未读报错</span><br><span class="s">上游服务报错为主</span></span><span class="go">→</span></a>' + "</div>" + '<div class="ad-kpi-row">' + '<div class="ad-kpi"><div class="label">今日成功生成</div><div class="val ad-tnum">486</div><span class="ad-delta up">▲ 12.4% 较昨日同时段</span></div>' + '<div class="ad-kpi"><div class="label">今日成功率</div><div class="val ad-tnum">97.6<small>%</small></div><span class="ad-delta up">▲ 0.8pt</span></div>' + '<div class="ad-kpi"><div class="label">累计用户</div><div class="val ad-tnum">8,204</div><span class="ad-delta up">▲ 今日新增 36</span></div>' + '<div class="ad-kpi"><div class="label">今日活跃</div><div class="val ad-tnum">512</div><span class="ad-delta flat">— 与昨日持平</span></div>' + '<div class="ad-kpi"><div class="label">今日估算成本</div><div class="val ad-tnum">$29.3</div><span class="ad-delta down">▼ 失败损耗 $1.2</span></div>' + "</div>" + '<div class="ad-grid-2">' + '<div class="ad-panel"><div class="ad-panel-head"><h3>近 14 天生成趋势</h3></div><div class="ad-panel-body">' + lineChart("trend", D.TREND, [{
      key: "ok",
      label: "成功",
      color: "#5B61E8"
    }, {
      key: "fail",
      label: "失败",
      color: "#D9484C"
    }]) + "</div></div>" + '<div class="ad-panel"><div class="ad-panel-head"><h3>模型用量（近 14 天）</h3><span class="ad-sub" style="margin-left:auto">Top 4 · 共 4 个模型</span></div><div class="ad-panel-body">' + bars(D.MODELS) + "</div></div>" + "</div>";
  }

  /* ---------- 素材库 ---------- */
  function materials() {
    var cards = D.MATERIALS.slice().sort(function (a, b) {
      return a.order - b.order;
    }).map(function (m) {
      return '<div class="ad-mat-card' + (m.hidden ? " hidden-state" : "") + '" draggable="true" data-mat="' + m.id + '">' + (m.hidden ? '<span class="adx-hidden-badge">已隐藏 · 前台不可见</span>' : "") + '<div class="ad-mat-thumb" style="background-image:url(' + m.img + ')"><span class="order">#' + m.order + "</span></div>" + '<div class="ad-mat-body"><div class="mt">' + m.title + '</div><div class="mc">' + m.cat + " · " + m.id + "</div></div>" + '<div class="ad-mat-actions"><button type="button" class="ad-btn sm" data-mat-edit="' + m.id + '">编辑</button>' + '<button type="button" class="ad-btn sm ghost" data-mat-hide="' + m.id + '">' + (m.hidden ? "恢复显示" : "隐藏") + "</button>" + '<button type="button" class="ad-btn sm danger" data-mat-del="' + m.id + '">删除</button></div></div>';
    }).join("");
    return '' + '<div class="ad-note-strip warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 9v4M12 17h.01"></path><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path></svg>' + "<span><strong>改动即时对前台生效。</strong>没有草稿或发布流程——保存、隐藏、排序会立刻反映在生图站提示词库中，操作前请确认内容无误。</span></div>" + '<div class="ad-section-head"><div class="lead"><h2>官方提示词素材 · 335 条</h2><p>拖拽卡片调整前台展示顺序（自动保存）；隐藏的素材保留数据但前台不可见。</p></div>' + '<span class="adx-drag-hint">⠿ 按住卡片拖拽排序</span>' + '<button type="button" class="ad-btn primary" data-mat-edit="new">＋ 新建素材</button></div>' + '<div class="ad-filters"><button type="button" class="ad-chip on">全部</button><button type="button" class="ad-chip">热门</button><button type="button" class="ad-chip">人物</button><button type="button" class="ad-chip">场景</button><button type="button" class="ad-chip">风格</button></div>' + '<div class="ad-mat-grid" id="mat-grid">' + cards + "</div>";
  }

  /* ---------- 分享管理 ---------- */
  function shares() {
    var rows = D.SHARES.map(function (s) {
      var tone = s.state === "正常" ? "good" : "neutral";
      return '<tr class="clickable" data-share="' + s.id + '"><td><div class="ad-row-flex"><span class="ad-thumb-sq" style="background-image:url(' + s.img + ')"></span><div><div class="ad-email">' + s.title + '</div><div class="ad-sub ad-mono">' + s.id + "</div></div></div></td>" + "<td>" + s.author + "</td><td>" + pill(tone, s.state) + '</td><td class="num ad-tnum">' + (s.reports > 0 ? '<span class="ad-pill warn plain">' + s.reports + " 次举报</span>" : "0") + "</td><td>" + s.time + "</td></tr>";
    }).join("");
    return '' + '<div class="ad-section-head"><div class="lead"><h2>分享卡片</h2><p>用户生成的公开分享短链。举报 ≥ 2 会出现在总览待处理。</p></div><div class="ad-tabs"><button type="button" class="ad-tab on">分享列表</button><button type="button" class="ad-tab" data-toast="「乐于分享排行」与列表同规格，原型略">乐于分享排行</button></div></div>' + '<div class="ad-filters"><select class="ad-chip"><option>全部状态</option><option>正常</option><option>已下架</option></select><select class="ad-chip"><option>近 7 天</option><option>近 30 天</option></select>' + '<div class="ad-searchbox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg><input placeholder="搜索标题 / 短链 ID"></input></div></div>' + '<div class="ad-panel"><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>内容</th><th>作者</th><th>状态</th><th class="num">举报</th><th>创建时间</th></tr></thead><tbody>' + rows + "</tbody></table></div>" + pager(211) + "</div>";
  }

  /* ---------- 内容安全 ---------- */
  function safety() {
    var q = D.REVIEWS.map(function (r) {
      return '<tr class="clickable" data-review="' + r.id + '"><td>' + pill("warn", "命中「" + r.word + "」") + '</td><td style="max-width:380px"><div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap">' + r.prompt + "</div></td><td>" + r.email + "</td><td>" + r.time + "</td></tr>";
    }).join("");
    var w = D.WORDS.map(function (x) {
      return "<tr><td><strong>" + x.w + "</strong></td><td>" + pill(x.action === "block" ? "crit" : "warn", D.DICT.wordAction[x.action]) + '</td><td class="num ad-tnum">' + x.hits + "</td><td>" + x.time + '</td><td class="num"><button type="button" class="ad-btn sm danger" data-word-del="' + x.w + '">删除</button></td></tr>';
    }).join("");
    return '' + '<div class="ad-note-strip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>' + "<span>复审结论<strong>仅记入审计日志</strong>，v1 不改变任务状态——「下架并标记」会下架对应分享并把提示词计入命中统计，但不会撤回已生成的图片。</span></div>" + '<div class="ad-section-head"><div class="lead"><h2>复审队列 · <span id="review-count">5</span> 条待处理</h2><p>命中违禁词（标记复审档）的生成请求，按时间正序处理。</p></div>' + '<div class="ad-tabs"><button type="button" class="ad-tab on" data-safety-tab="queue">复审队列</button><button type="button" class="ad-tab" data-safety-tab="words">违禁词库</button></div></div>' + '<div id="safety-queue"><div class="ad-panel"><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>命中词</th><th>提示词</th><th>用户</th><th>时间</th></tr></thead><tbody id="review-tbody">' + q + "</tbody></table></div></div></div>" + '<div id="safety-words" hidden><div class="ad-panel"><div class="ad-panel-head"><h3>违禁词 · 5 个</h3><div class="ad-spacer"></div>' + '<input class="ad-field" id="word-input" placeholder="新增词…" style="width:140px"></input>' + '<select class="ad-chip" id="word-mode"><option value="flag">标记复审</option><option value="block">直接拦截</option></select>' + '<button type="button" class="ad-btn primary sm" id="word-add">添加</button></div>' + '<div class="ad-panel-body" style="padding:0 16px 6px; color:var(--ad-muted); font-size:12.5px">「标记复审」：请求正常生成，但进入复审队列人工核查；「直接拦截」：请求被拒绝，用户会看到内容安全提示。词库暂不支持编辑，需删除后重加。</div>' + '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>词</th><th>动作</th><th class="num">近 30 天命中</th><th>添加时间</th><th></th></tr></thead><tbody>' + w + "</tbody></table></div></div></div>";
  }

  /* ---------- 公告运营 ---------- */
  function announcements() {
    var rows = D.ANNOUNCES.map(function (a) {
      var tone = a.state === "active" ? "good" : a.state === "draft" ? "neutral" : "plain neutral";
      return '<tr class="clickable" data-announce="' + a.id + '"><td><div class="ad-email">' + a.title + '</div><div class="ad-sub">' + a.body.slice(0, 30) + "…</div></td><td>" + a.pos + "</td><td>" + pill(tone, D.DICT.announceState[a.state]) + '</td><td class="ad-tnum">' + a.from + " → " + a.to + '</td><td class="num"><button type="button" class="ad-btn sm danger" data-announce-del="' + a.id + '">删除</button></td></tr>';
    }).join("");
    return '' + '<div class="ad-section-head"><div class="lead"><h2>营销公告</h2><p>公告展示在生图站顶栏下通栏（00 号定稿位）；同时段多条按创建顺序排队，用户关闭一条后显示下一条。</p></div>' + '<button type="button" class="ad-btn primary" data-announce="an-2">＋ 新建公告</button></div>' + '<div class="ad-panel"><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>公告</th><th>位置</th><th>状态</th><th>生效区间</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div></div>";
  }

  /* ---------- 用户记录 ---------- */
  function users() {
    var rows = D.USERS.map(function (u, i) {
      return '<tr class="clickable" data-user="' + i + '"><td class="ad-email">' + u.email + "</td><td>" + u.reg + '</td><td class="num ad-tnum">' + u.gens + '</td><td class="num ad-tnum">' + u.ok + '</td><td class="num ad-tnum">' + u.spend + "</td><td>" + pill(u.src === "paid" ? "good" : u.src === "anonymous" ? "neutral" : "accent", D.DICT.spendSource[u.src]) + '</td><td class="num ad-tnum">' + u.device + "</td><td>" + u.last + "</td></tr>";
    }).join("");
    return '' + '<div class="ad-note-strip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>' + "<span>本模块<strong>只读</strong>。禁用账号、重置额度等能力后端尚未提供，界面不设操作按钮；账号与余额的权威在 Lumio 账户中心。</span></div>" + '<div class="ad-filters"><div class="ad-searchbox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg><input placeholder="按邮箱搜索（300ms 防抖）"></input></div>' + '<select class="ad-chip"><option>按最近活跃排序</option><option>按生成量排序</option><option>按注册时间排序</option></select></div>' + '<div class="ad-panel"><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>用户</th><th>注册</th><th class="num">生成量</th><th class="num">成功率</th><th class="num">消费</th><th>主要额度来源</th><th class="num">设备数</th><th>最近活跃</th></tr></thead><tbody>' + rows + "</tbody></table></div>" + pager(8204) + "</div>";
  }

  /* ---------- 邀请裂变 ---------- */
  function invites() {
    var rows = D.INVITES.map(function (v) {
      var tone = v.state === "已发放" ? "good" : v.state === "待发放" ? "warn" : "crit";
      return "<tr><td>" + v.inviter + "</td><td>" + v.invitee + "</td><td>" + pill(tone, v.state) + '</td><td class="num ad-tnum">' + v.reward + "</td><td>" + v.time + "</td></tr>";
    }).join("");
    return '' + '<div class="ad-kpi-row cols-4">' + '<div class="ad-kpi"><div class="label">累计邀请</div><div class="val ad-tnum">1,842</div></div>' + '<div class="ad-kpi"><div class="label">成功奖励 / 转化率</div><div class="val ad-tnum">1,573<small> · 85.4%</small></div><span class="ad-delta up">▲ 1.2pt 较上周</span></div>' + '<div class="ad-kpi"><div class="label">待发放</div><div class="val ad-tnum" style="color:var(--ad-warn)">27</div><span class="ad-sub">按账户中心批次发放，无手动发放能力</span></div>' + '<div class="ad-kpi"><div class="label">作弊拦截</div><div class="val ad-tnum" style="color:var(--ad-crit)">42</div><span class="ad-sub">同设备 / 同 IP 自邀</span></div>' + "</div>" + '<div class="ad-filters"><button type="button" class="ad-chip on">全部</button><button type="button" class="ad-chip">已发放</button><button type="button" class="ad-chip">待发放</button><button type="button" class="ad-chip">作弊拦截</button></div>' + '<div class="ad-panel"><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>邀请人</th><th>被邀请人</th><th>状态</th><th class="num">奖励</th><th>时间</th></tr></thead><tbody>' + rows + "</tbody></table></div>" + pager(1842) + "</div>";
  }

  /* ---------- 报错监控 ---------- */
  function errors() {
    var rows = D.ERRORS.map(function (e) {
      var tone = e.type === "internal_error" ? "crit" : e.type === "provider_error" ? "crit" : "warn";
      return '<tr class="clickable" data-error="' + e.id + '"><td>' + pill(tone, D.DICT.errorType[e.type]) + "</td><td>" + e.msg + "</td><td>" + e.email + '</td><td class="ad-mono ad-sub">' + e.model + '</td><td class="num ad-tnum">' + e.http + "</td><td>" + e.time + "</td></tr>";
    }).join("");
    return '' + '<div class="ad-kpi-row cols-4">' + '<div class="ad-kpi"><div class="label">今日报错</div><div class="val ad-tnum">12</div><span class="ad-delta down">▼ 33% 较昨日</span></div>' + '<div class="ad-kpi"><div class="label">上游服务报错</div><div class="val ad-tnum">7</div></div>' + '<div class="ad-kpi"><div class="label">触发限流</div><div class="val ad-tnum">3</div></div>' + '<div class="ad-kpi"><div class="label">站内错误</div><div class="val ad-tnum">2</div></div>' + "</div>" + '<div class="ad-filters"><div class="ad-tabs"><button type="button" class="ad-tab on">全部类型</button><button type="button" class="ad-tab">上游服务报错</button><button type="button" class="ad-tab">额度耗尽</button><button type="button" class="ad-tab">触发限流</button><button type="button" class="ad-tab">站内错误</button></div>' + '<div class="ad-searchbox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg><input placeholder="按邮箱 / 模型过滤"></input></div>' + '<select class="ad-chip"><option>近 24 小时</option><option>近 7 天</option></select></div>' + '<div class="ad-panel"><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>类型</th><th>摘要</th><th>用户</th><th>模型</th><th class="num">HTTP</th><th>时间</th></tr></thead><tbody>' + rows + "</tbody></table></div>" + truncateStrip(200, "", "接口单次最多返回 200 条，更早记录请缩小时间范围查询") + "</div>";
  }

  /* ---------- 成本看板 ---------- */
  function cost() {
    return '' + '<div class="ad-note-strip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>' + "<span>成本为<strong>按单价估算</strong>的口径，仅用于趋势判断；对账请以各 provider 账单为准。</span></div>" + '<div class="ad-filters"><button type="button" class="ad-chip on">近 7 天</button><button type="button" class="ad-chip">近 30 天</button><button type="button" class="ad-chip">本月</button></div>' + '<div class="ad-kpi-row cols-4">' + '<div class="ad-kpi"><div class="label">总生成数</div><div class="val ad-tnum">5,279</div></div>' + '<div class="ad-kpi"><div class="label">估算成本</div><div class="val ad-tnum">$317.2</div><span class="ad-delta up">▲ 8.1% 较上周期</span></div>' + '<div class="ad-kpi"><div class="label">单张均价</div><div class="val ad-tnum">$0.060</div></div>' + '<div class="ad-kpi"><div class="label">失败损耗</div><div class="val ad-tnum" style="color:var(--ad-warn)">$7.9</div><span class="ad-sub">失败请求已计费的部分；为 $0 时此卡显示绿色对勾</span></div>' + "</div>" + '<div class="ad-grid-2">' + '<div class="ad-panel"><div class="ad-panel-head"><h3>每日估算成本</h3></div><div class="ad-panel-body">' + lineChart("cost", D.COSTD, [{
      key: "v",
      label: "估算成本 $",
      color: "#5B61E8"
    }], 170) + "</div></div>" + '<div class="ad-panel"><div class="ad-panel-head"><h3>Provider 拆分</h3></div><div class="ad-panel-body">' + bars([{
      n: "OpenAI（gpt-image-2 系）",
      v: 236
    }, {
      n: "Gemini",
      v: 81
    }], " $") + '<h4 style="font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--ad-muted); margin:20px 0 10px">成本 Top 用户</h4>' + bars([{
      n: "c***r@lumio.games",
      v: 38
    }, {
      n: "n***o@qq.com",
      v: 6
    }, {
      n: "s***y@gmail.com",
      v: 4
    }], " $") + "</div></div></div>";
  }

  /* ---------- 审计日志 ---------- */
  function audit() {
    var rows = D.AUDITS.map(function (a, i) {
      var tone = D.DICT.auditTone[a.act] || "neutral";
      return '<tr class="clickable" data-audit="' + i + '"><td>' + pill(tone, a.act) + "</td><td>" + a.summary + "</td><td>" + a.who + '</td><td class="ad-mono ad-sub">' + a.target + "</td><td>" + a.time + "</td></tr>";
    }).join("");
    return '' + '<div class="ad-section-head"><div class="lead"><h2>审计日志</h2><p>只读、不可撤销。摘要为人话表达，点行查看原始 JSON。</p></div></div>' + '<div class="ad-filters"><button type="button" class="ad-chip on">全部</button><button type="button" class="ad-chip">分享治理</button><button type="button" class="ad-chip">素材</button><button type="button" class="ad-chip">内容安全</button><button type="button" class="ad-chip">公告</button></div>' + '<div class="ad-panel"><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>动作</th><th>摘要</th><th>操作者</th><th>对象</th><th>时间</th></tr></thead><tbody>' + rows + "</tbody></table></div>" + truncateStrip(100, 0, "更早日志请按时间范围导出查询（规划中）") + "</div>";
  }
  return {
    overview: overview,
    materials: materials,
    shares: shares,
    safety: safety,
    announcements: announcements,
    users: users,
    invites: invites,
    errors: errors,
    cost: cost,
    audit: audit,
    helpers: {
      pill: pill,
      copyCode: copyCode,
      emptyState: emptyState,
      lineChart: lineChart
    }
  };
}();
})(); } catch (e) { __ds_ns.__errors.push({ path: "designs/admin/admin-views.js", error: String((e && e.message) || e) }); }

// designs/unified-shell/app.js
try { (() => {
/* Lumio 统一工作台原型 · 交互逻辑 */
(function () {
  "use strict";

  var $ = function (s, r) {
    return (r || document).querySelector(s);
  };
  var $$ = function (s, r) {
    return Array.prototype.slice.call((r || document).querySelectorAll(s));
  };

  /* ---------- 数据 ---------- */
  var A = "../assets/";
  var PROMPTS = [{
    img: "case1.jpg",
    t: "城市生命系统图谱",
    n: 1,
    c: "场景"
  }, {
    img: "case15.jpg",
    t: "夜市大排档人像海报",
    n: 15,
    c: "人物"
  }, {
    img: "case17.jpg",
    t: "成都吃货暴走地图",
    n: 17,
    c: "场景"
  }, {
    img: "case14.jpg",
    t: "国风美食图鉴",
    n: 14,
    c: "风格"
  }, {
    img: "community-2.jpg",
    t: "流动的丝绸渐变",
    n: 21,
    c: "风格"
  }, {
    img: "community-4.jpg",
    t: "彩虹光晕",
    n: 22,
    c: "风格"
  }, {
    img: "community-6.jpg",
    t: "银河星空",
    n: 23,
    c: "场景"
  }, {
    img: "community-5.jpg",
    t: "周末清晨的咖啡",
    n: 24,
    c: "人物"
  }, {
    img: "community-1.jpg",
    t: "工坊里的匠人",
    n: 25,
    c: "人物"
  }, {
    img: "case19.jpg",
    t: "图解式故事海报",
    n: 19,
    c: "风格"
  }];
  var SHOWCASE = [{
    img: "community-6.jpg",
    t: "银河星空",
    tag: "长曝光 · 摄影质感"
  }, {
    img: "community-2.jpg",
    t: "流动的丝绸渐变",
    tag: "抽象 · 壁纸"
  }, {
    img: "case17.jpg",
    t: "成都吃货暴走地图",
    tag: "手绘水彩 · 信息图"
  }, {
    img: "community-4.jpg",
    t: "彩虹光晕",
    tag: "抽象 · 渐变"
  }, {
    img: "case14.jpg",
    t: "国风美食图鉴",
    tag: "手绘 · 海报"
  }, {
    img: "community-5.jpg",
    t: "周末清晨的咖啡",
    tag: "生活 · 摄影"
  }];

  /* ---------- 主题（?theme= + localStorage + 顶栏开关） ---------- */
  var THEME_KEY = "lumio-proto-theme";
  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem(THEME_KEY, t);
    } catch (e) {}
  }
  var urlTheme = new URLSearchParams(location.search).get("theme");
  var saved = null;
  try {
    saved = localStorage.getItem(THEME_KEY);
  } catch (e) {}
  applyTheme(urlTheme === "dark" || urlTheme === "light" ? urlTheme : saved || "light");
  function toggleTheme() {
    applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  }
  $("#theme-toggle").addEventListener("click", toggleTheme);
  $$("[data-theme-btn]").forEach(function (b) {
    b.addEventListener("click", toggleTheme);
  });
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
    b.addEventListener("click", function () {
      navigate(b.getAttribute("data-nav"));
    });
  });
  window.addEventListener("hashchange", function () {
    navigate(location.hash.slice(1) || "studio");
  });
  navigate(location.hash.slice(1) || "studio");

  /* ---------- 全站计数 pill：加载态 → 数字 ---------- */
  setTimeout(function () {
    $("#stat-skeleton").hidden = true;
    $("#stat-num").hidden = false;
  }, 1400);

  /* ---------- 公告横幅：排队 + 可关闭 ---------- */
  var ANNOUNCES = [{
    id: "a1",
    html: "gpt-image-2 · 4K 档已开放，登录后即可使用账户余额生成。<a href=\"#studio\">立即体验</a>"
  }, {
    id: "a2",
    html: "本周五 02:00–03:00 系统维护，期间生成可能排队。"
  }];
  var aIdx = 0;
  function renderAnnounce() {
    var bar = $("#announce-bar");
    if (aIdx >= ANNOUNCES.length) {
      bar.classList.add("is-hidden");
      return;
    }
    bar.classList.remove("is-hidden");
    $("#announce-text").innerHTML = ANNOUNCES[aIdx].html;
    $("#announce-queue").textContent = ANNOUNCES.length > 1 ? aIdx + 1 + " / " + ANNOUNCES.length : "";
  }
  $("#announce-close").addEventListener("click", function () {
    aIdx += 1;
    renderAnnounce();
  });
  renderAnnounce();

  /* ---------- Toast / Confirm ---------- */
  function toast(msg, isErr) {
    var el = document.createElement("div");
    el.className = "toast" + (isErr ? " err" : "");
    el.textContent = msg;
    $("#toast-wrap").appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 2800);
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
  function openOverlay(id) {
    closeOverlays();
    $("#" + id).classList.add("open");
  }
  function closeOverlays() {
    $$(".overlay-scrim").forEach(function (o) {
      o.classList.remove("open");
    });
  }
  $$("[data-overlay]").forEach(function (b) {
    b.addEventListener("click", function () {
      openOverlay("ov-" + b.getAttribute("data-overlay"));
    });
  });
  $$("[data-close]").forEach(function (b) {
    b.addEventListener("click", closeOverlays);
  });
  $$(".overlay-scrim").forEach(function (o) {
    o.addEventListener("click", function (e) {
      if (e.target === o) closeOverlays();
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeOverlays();
      $("#account-menu").classList.remove("open");
    }
  });

  /* 账号菜单 */
  $("#account-avatar").addEventListener("click", function (e) {
    e.stopPropagation();
    $("#account-menu").classList.toggle("open");
  });
  document.addEventListener("click", function (e) {
    if (!$("#account-menu").contains(e.target)) $("#account-menu").classList.remove("open");
  });
  $("#menu-config").addEventListener("click", function () {
    toast("偏好配置已收入账号菜单（原 canvas /config）");
  });
  $("#menu-logout").addEventListener("click", function () {
    setSignedIn(false);
  });

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
  $("#invite-copy").addEventListener("click", function () {
    toast("邀请链接已复制");
  });
  function setSignedIn(v) {
    $("#account-signed-in").hidden = !v;
    $("#account-signed-out").hidden = v;
    if (!v) toast("已退出登录");
  }

  /* ---------- 额度状态 ---------- */
  var quotaLeft = 3;
  function renderQuota(state) {
    var pill = $("#quota-pill"),
      hint = $("#quota-hint");
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
      hint.innerHTML = "本次消耗 <strong>1 次免费额度</strong> · 剩 " + quotaLeft + " 次" + (state === "low" ? "，<strong>额度将尽</strong>，登录可再得 3 次" : "");
    }
    $("#spend-left").textContent = quotaLeft;
  }

  /* ---------- 生图流程：空 → 加载 → 成功 / 失败 ---------- */
  var stageEls = ["stage-empty", "stage-loading", "stage-image", "stage-failed"];
  function showStage(id) {
    stageEls.forEach(function (s) {
      $("#" + s).hidden = s !== id;
    });
  }
  var failNext = false;
  var genImgs = ["community-6.jpg", "community-2.jpg", "community-4.jpg"];
  var genIdx = 0;
  function generate() {
    if (quotaLeft <= 0) {
      toast("免费额度已用完：登录、邀请或充值后继续", true);
      return;
    }
    showStage("stage-loading");
    var bar = $("#progress-bar"),
      p = 0;
    bar.style.width = "0%";
    var timer = setInterval(function () {
      p = Math.min(p + 12 + Math.random() * 14, 92);
      bar.style.width = p + "%";
    }, 380);
    setTimeout(function () {
      clearInterval(timer);
      if (failNext) {
        failNext = false;
        showStage("stage-failed");
        return;
      }
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
    $$(".history-thumb", strip).forEach(function (t) {
      t.classList.remove("is-active");
    });
    var b = document.createElement("button");
    b.type = "button";
    b.className = "history-thumb is-active";
    b.innerHTML = '<img src="' + A + img + '" alt="历史结果">';
    b.addEventListener("click", function () {
      $$(".history-thumb", strip).forEach(function (t) {
        t.classList.remove("is-active");
      });
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
    portfolioHas = true;
    renderPortfolio();
    toast("已保存到作品集 · 仅保存在本设备");
  });
  $("#act-canvas").addEventListener("click", function () {
    openOverlay("ov-crossover");
  });
  $("#crossover-new").addEventListener("click", function () {
    closeOverlays();
    navigate("canvas");
    toast("已新建画布项目「未命名 1」，图片已作为节点加入");
  });
  $("#crossover-append").addEventListener("click", function () {
    closeOverlays();
    navigate("canvas");
    toast("已追加到「屋顶花园系列」");
  });
  $("#act-share").addEventListener("click", function () {
    navigate("share");
    toast("分享短链已生成，可复制发送");
  });
  $("#act-download").addEventListener("click", function () {
    toast("已开始下载原图");
  });
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
    if (open) $$("#ratio-grid .ratio-button").forEach(function (b) {
      b.classList.remove("is-selected");
    });
  });
  $$("#ratio-grid .ratio-button").forEach(function (b) {
    b.addEventListener("click", function () {
      $$("#ratio-grid .ratio-button").forEach(function (x) {
        x.classList.remove("is-selected");
      });
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
    return '<button type="button" class="prompt-lib-card" data-prompt="' + p.t + '">' + '<img src="' + A + p.img + '" alt="' + p.t + '" loading="lazy">' + (full ? '<span class="card-fav" aria-label="加入我的素材">☆</span>' : "") + '<span class="t">' + p.t + '</span><span class="m">#' + p.n + " · " + p.c + "</span></button>";
  }
  function renderLibrary() {
    var body = $("#library-body");
    if (libState === "loading") {
      body.innerHTML = '<div class="prompt-lib-grid">' + new Array(6).fill('<div class="skeleton-block" style="aspect-ratio:1/1.16"></div>').join("") + "</div>";
      return;
    }
    if (libState === "error") {
      body.innerHTML = '<div class="lib-state">提示词库暂时拉取失败，不是没有内容。<br><button type="button" class="btn" id="lib-retry">重试</button></div>';
      $("#lib-retry").addEventListener("click", function () {
        libState = "loading";
        renderLibrary();
        setTimeout(function () {
          libState = "ok";
          renderLibrary();
        }, 900);
      });
      return;
    }
    if (libTab === "我的" && libState === "empty") {
      body.innerHTML = '<div class="lib-state">还没有收藏的素材。<br>在提示词库点 ☆，或把好用的提示词保存进来。<br><button type="button" class="btn" id="lib-go">去逛提示词库</button></div>';
      $("#lib-go").addEventListener("click", function () {
        navigate("prompts");
      });
      return;
    }
    var list = libTab === "热门" ? PROMPTS : PROMPTS.filter(function (p) {
      return p.c === libTab;
    });
    if (libTab === "我的") list = PROMPTS.slice(0, 4);
    body.innerHTML = (libTab === "我的" ? '<p class="local-note">🔒 仅保存在本设备 · 可导入导出 ZIP</p>' : "") + '<div class="prompt-lib-grid">' + list.map(function (p) {
      return cardHTML(p, false);
    }).join("") + "</div>";
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
      $$("#library-tabs button").forEach(function (x) {
        x.classList.remove("is-selected");
      });
      b.classList.add("is-selected");
      libTab = b.textContent;
      renderLibrary();
    });
  });
  renderLibrary();

  /* 完整态 */
  $("#prompts-grid").innerHTML = PROMPTS.concat(PROMPTS.slice(0, 5)).map(function (p) {
    return cardHTML(p, true);
  }).join("");
  bindCards($("#prompts-grid"));
  $$("#prompts-filter .chip").forEach(function (c) {
    c.addEventListener("click", function () {
      $$("#prompts-filter .chip").forEach(function (x) {
        x.classList.remove("on");
      });
      c.classList.add("on");
    });
  });

  /* 画布落地页 showcase */
  $("#showcase-grid").innerHTML = SHOWCASE.map(function (s) {
    return '<a href="#prompts"><img src="' + A + s.img + '" alt="' + s.t + '" loading="lazy">' + '<span class="showcase-caption">' + s.t + "<small>" + s.tag + "</small></span></a>";
  }).join("");
  $("#canvas-start").addEventListener("click", function () {
    toast("原型内不含画布编辑器内核，仅 Shell 统一");
  });
  $("#canvas-open").addEventListener("click", function () {
    toast("原型内不含画布编辑器内核，仅 Shell 统一");
  });

  /* 作品集 */
  var portfolioHas = true;
  function renderPortfolio() {
    var grid = $("#portfolio-grid");
    $("#portfolio-empty").hidden = portfolioHas;
    grid.hidden = !portfolioHas;
    if (!portfolioHas) {
      grid.innerHTML = "";
      return;
    }
    grid.innerHTML = SHOWCASE.slice(0, 4).map(function (s, i) {
      return '<div class="portfolio-card"><img src="' + A + s.img + '" alt="' + s.t + '">' + '<div class="pc-meta"><span>' + s.t + "</span><span>" + (i + 1) + " 天前</span></div></div>";
    }).join("");
  }
  renderPortfolio();

  /* 分享页 */
  $("#share-try").addEventListener("click", function () {
    $("#prompt-input").value = "流动的丝绸质感渐变，紫罗兰、青蓝与暖橙交织，柔和体积光，超高清壁纸质感";
    navigate("studio");
    toast("提示词已预填（?prompt= 深链），免费体验 3 次");
  });
  $("#share-copy").addEventListener("click", function () {
    toast("提示词已复制");
  });
  $("#share-download").addEventListener("click", function () {
    toast("已开始下载（含水印预览图）");
  });
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
      if (d === "lib-loading") {
        libState = "loading";
        renderLibrary();
        navigate("studio");
      }
      if (d === "lib-error") {
        libState = "error";
        renderLibrary();
        navigate("studio");
      }
      if (d === "lib-empty") {
        libState = "empty";
        libTab = "我的";
        $$("#library-tabs button").forEach(function (x) {
          x.classList.toggle("is-selected", x.textContent === "我的");
        });
        renderLibrary();
        navigate("studio");
      }
      if (d === "logout") setSignedIn(false);
      if (d === "invited") openOverlay("ov-invited");
      if (d === "share-dead") {
        navigate("share");
        $("#share-normal").hidden = !$("#share-normal").hidden;
        $("#share-unavailable").hidden = !$("#share-normal").hidden;
      }
      if (d === "portfolio-empty") {
        portfolioHas = !portfolioHas;
        renderPortfolio();
        navigate("portfolio");
      }
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
})(); } catch (e) { __ds_ns.__errors.push({ path: "designs/unified-shell/app.js", error: String((e && e.message) || e) }); }

})();
