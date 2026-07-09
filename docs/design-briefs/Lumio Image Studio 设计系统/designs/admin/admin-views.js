/* Lumio Admin 原型 · 各模块视图渲染 */
var ADVIEWS = (function () {
  "use strict";
  var D = ADX;

  /* ---------- 小工具 ---------- */
  function pill(tone, text) { return '<span class="ad-pill ' + tone + '">' + text + "</span>"; }
  function copyCode(v) {
    return '<span class="adx-copy"><code>' + v + '</code><button type="button" data-copy="' + v + '" aria-label="复制">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg></button></span>';
  }
  function emptyState(kind, title, desc, action) {
    var glyph = kind === "celebrate" ? "🎉" : kind === "error"
      ? '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v4M12 16h.01"></path></svg>'
      : '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12H3M21 6H3M15 18H3"></path></svg>';
    return '<div class="adx-empty ' + kind + '"><div class="glyph">' + glyph + "</div><h4>" + title + "</h4><p>" + desc + "</p>" + (action || "") + "</div>";
  }
  function truncateStrip(n, total, note) {
    return '<div class="adx-truncate-strip"><strong>仅显示最近 ' + n + " 条</strong><span>" + note + "</span><a href=\"#\" data-toast=\"原型内不含更早数据\">查看更早 →</a></div>";
  }
  function pager(total) {
    return '<div class="adx-pager"><span class="total">共 ' + total + ' 条 · 每页 20 条</span>' +
      '<button type="button" disabled>‹</button><button type="button" class="on">1</button><button type="button">2</button><button type="button">3</button><button type="button">›</button></div>';
  }

  /* ---------- 折线图（SVG + tooltip） ---------- */
  function lineChart(id, data, series, h) {
    h = h || 180;
    var w = 640, padL = 36, padB = 22, padT = 12;
    var max = 0;
    data.forEach(function (row) { series.forEach(function (s) { max = Math.max(max, row[s.key]); }); });
    max = Math.ceil(max / 100) * 100 || 10;
    var iw = w - padL - 10, ih = h - padT - padB;
    function x(i) { return padL + (i / (data.length - 1)) * iw; }
    function y(v) { return padT + ih - (v / max) * ih; }
    var grid = "", labels = "";
    for (var g = 0; g <= 3; g++) {
      var gy = padT + (ih * g) / 3;
      grid += '<line x1="' + padL + '" x2="' + (w - 10) + '" y1="' + gy + '" y2="' + gy + '" stroke="#EEF0F4"></line>';
      labels += '<text x="' + (padL - 6) + '" y="' + (gy + 4) + '" text-anchor="end" font-size="10" fill="#969BA8">' + Math.round(max - (max * g) / 3) + "</text>";
    }
    data.forEach(function (row, i) {
      if (i % Math.ceil(data.length / 7) === 0 || i === data.length - 1)
        labels += '<text x="' + x(i) + '" y="' + (h - 6) + '" text-anchor="middle" font-size="10" fill="#969BA8">' + row.d + "</text>";
    });
    var paths = series.map(function (s) {
      var dstr = data.map(function (row, i) { return (i ? "L" : "M") + x(i).toFixed(1) + " " + y(row[s.key]).toFixed(1); }).join(" ");
      return '<path d="' + dstr + '" fill="none" stroke="' + s.color + '" stroke-width="2" stroke-linejoin="round"></path>';
    }).join("");
    var hits = data.map(function (row, i) {
      return '<rect x="' + (x(i) - iw / data.length / 2) + '" y="0" width="' + (iw / data.length) + '" height="' + h + '" fill="transparent" data-chart-i="' + i + '"></rect>' +
        series.map(function (s) { return '<circle cx="' + x(i) + '" cy="' + y(row[s.key]) + '" r="3" fill="' + s.color + '" opacity="0" data-chart-dot="' + i + '"></circle>'; }).join("");
    }).join("");
    var legend = '<div class="adx-legend">' + series.map(function (s) { return "<span><i style=\"background:" + s.color + "\"></i>" + s.label + "</span>"; }).join("") + "</div>";
    return '<div class="adx-chart" data-chart="' + id + '" data-chart-max="' + max + '">' +
      '<svg viewBox="0 0 ' + w + " " + h + '">' + grid + labels + paths + hits + "</svg>" +
      '<div class="adx-chart-tip" data-chart-tip></div>' + legend + "</div>";
  }
  function bars(rows, unit) {
    var max = Math.max.apply(null, rows.map(function (r) { return r.v; }));
    return '<div class="ad-bars">' + rows.map(function (r) {
      return '<div class="ad-bar-row"><span class="bn">' + r.n + '</span><div class="ad-bar-track"><div class="ad-bar-fill" style="width:' + (r.v / max) * 100 + '%"></div></div><span class="bv ad-tnum">' + r.v.toLocaleString() + (unit || "") + "</span></div>";
    }).join("") + "</div>";
  }

  /* ---------- 总览 ---------- */
  function overview() {
    return '' +
      '<div class="adx-attention" data-screen-label="总览·待处理主角区">' +
      '<a href="#" data-goto="shares"><span class="n">3</span><span><span class="t">待复核分享举报</span><br><span class="s">最早 5 小时前 · 举报≥2 自动进入</span></span><span class="go">→</span></a>' +
      '<a href="#" data-goto="safety"><span class="n">5</span><span><span class="t">内容安全复审队列</span><br><span class="s">最早 26 分钟前 · 命中违禁词</span></span><span class="go">→</span></a>' +
      '<a href="#" data-goto="errors"><span class="n">12</span><span><span class="t">今日未读报错</span><br><span class="s">上游服务报错为主</span></span><span class="go">→</span></a>' +
      "</div>" +
      '<div class="ad-kpi-row">' +
      '<div class="ad-kpi"><div class="label">今日成功生成</div><div class="val ad-tnum">486</div><span class="ad-delta up">▲ 12.4% 较昨日同时段</span></div>' +
      '<div class="ad-kpi"><div class="label">今日成功率</div><div class="val ad-tnum">97.6<small>%</small></div><span class="ad-delta up">▲ 0.8pt</span></div>' +
      '<div class="ad-kpi"><div class="label">累计用户</div><div class="val ad-tnum">8,204</div><span class="ad-delta up">▲ 今日新增 36</span></div>' +
      '<div class="ad-kpi"><div class="label">今日活跃</div><div class="val ad-tnum">512</div><span class="ad-delta flat">— 与昨日持平</span></div>' +
      '<div class="ad-kpi"><div class="label">今日估算成本</div><div class="val ad-tnum">$29.3</div><span class="ad-delta down">▼ 失败损耗 $1.2</span></div>' +
      "</div>" +
      '<div class="ad-grid-2">' +
      '<div class="ad-panel"><div class="ad-panel-head"><h3>近 14 天生成趋势</h3></div><div class="ad-panel-body">' +
      lineChart("trend", D.TREND, [{ key: "ok", label: "成功", color: "#5B61E8" }, { key: "fail", label: "失败", color: "#D9484C" }]) +
      "</div></div>" +
      '<div class="ad-panel"><div class="ad-panel-head"><h3>模型用量（近 14 天）</h3><span class="ad-sub" style="margin-left:auto">Top 4 · 共 4 个模型</span></div><div class="ad-panel-body">' + bars(D.MODELS) + "</div></div>" +
      "</div>";
  }

  /* ---------- 素材库 ---------- */
  function materials() {
    var cards = D.MATERIALS.slice().sort(function (a, b) { return a.order - b.order; }).map(function (m) {
      return '<div class="ad-mat-card' + (m.hidden ? " hidden-state" : "") + '" draggable="true" data-mat="' + m.id + '">' +
        (m.hidden ? '<span class="adx-hidden-badge">已隐藏 · 前台不可见</span>' : "") +
        '<div class="ad-mat-thumb" style="background-image:url(' + m.img + ')"><span class="order">#' + m.order + "</span></div>" +
        '<div class="ad-mat-body"><div class="mt">' + m.title + '</div><div class="mc">' + m.cat + " · " + m.id + "</div></div>" +
        '<div class="ad-mat-actions"><button type="button" class="ad-btn sm" data-mat-edit="' + m.id + '">编辑</button>' +
        '<button type="button" class="ad-btn sm ghost" data-mat-hide="' + m.id + '">' + (m.hidden ? "恢复显示" : "隐藏") + "</button>" +
        '<button type="button" class="ad-btn sm danger" data-mat-del="' + m.id + '">删除</button></div></div>';
    }).join("");
    return '' +
      '<div class="ad-note-strip warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 9v4M12 17h.01"></path><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path></svg>' +
      "<span><strong>改动即时对前台生效。</strong>没有草稿或发布流程——保存、隐藏、排序会立刻反映在生图站提示词库中，操作前请确认内容无误。</span></div>" +
      '<div class="ad-section-head"><div class="lead"><h2>官方提示词素材 · 335 条</h2><p>拖拽卡片调整前台展示顺序（自动保存）；隐藏的素材保留数据但前台不可见。</p></div>' +
      '<span class="adx-drag-hint">⠿ 按住卡片拖拽排序</span>' +
      '<button type="button" class="ad-btn primary" data-mat-edit="new">＋ 新建素材</button></div>' +
      '<div class="ad-filters"><button type="button" class="ad-chip on">全部</button><button type="button" class="ad-chip">热门</button><button type="button" class="ad-chip">人物</button><button type="button" class="ad-chip">场景</button><button type="button" class="ad-chip">风格</button></div>' +
      '<div class="ad-mat-grid" id="mat-grid">' + cards + "</div>";
  }

  /* ---------- 分享管理 ---------- */
  function shares() {
    var rows = D.SHARES.map(function (s) {
      var tone = s.state === "正常" ? "good" : "neutral";
      return '<tr class="clickable" data-share="' + s.id + '"><td><div class="ad-row-flex"><span class="ad-thumb-sq" style="background-image:url(' + s.img + ')"></span><div><div class="ad-email">' + s.title + '</div><div class="ad-sub ad-mono">' + s.id + "</div></div></div></td>" +
        "<td>" + s.author + "</td><td>" + pill(tone, s.state) + '</td><td class="num ad-tnum">' + (s.reports > 0 ? '<span class="ad-pill warn plain">' + s.reports + " 次举报</span>" : "0") + "</td><td>" + s.time + "</td></tr>";
    }).join("");
    return '' +
      '<div class="ad-section-head"><div class="lead"><h2>分享卡片</h2><p>用户生成的公开分享短链。举报 ≥ 2 会出现在总览待处理。</p></div><div class="ad-tabs"><button type="button" class="ad-tab on">分享列表</button><button type="button" class="ad-tab" data-toast="「乐于分享排行」与列表同规格，原型略">乐于分享排行</button></div></div>' +
      '<div class="ad-filters"><select class="ad-chip"><option>全部状态</option><option>正常</option><option>已下架</option></select><select class="ad-chip"><option>近 7 天</option><option>近 30 天</option></select>' +
      '<div class="ad-searchbox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg><input placeholder="搜索标题 / 短链 ID"></input></div></div>' +
      '<div class="ad-panel"><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>内容</th><th>作者</th><th>状态</th><th class="num">举报</th><th>创建时间</th></tr></thead><tbody>' + rows + "</tbody></table></div>" + pager(211) + "</div>";
  }

  /* ---------- 内容安全 ---------- */
  function safety() {
    var q = D.REVIEWS.map(function (r) {
      return '<tr class="clickable" data-review="' + r.id + '"><td>' + pill("warn", "命中「" + r.word + "」") + '</td><td style="max-width:380px"><div style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap">' + r.prompt + "</div></td><td>" + r.email + "</td><td>" + r.time + "</td></tr>";
    }).join("");
    var w = D.WORDS.map(function (x) {
      return "<tr><td><strong>" + x.w + "</strong></td><td>" + pill(x.action === "block" ? "crit" : "warn", D.DICT.wordAction[x.action]) + '</td><td class="num ad-tnum">' + x.hits + "</td><td>" + x.time + '</td><td class="num"><button type="button" class="ad-btn sm danger" data-word-del="' + x.w + '">删除</button></td></tr>';
    }).join("");
    return '' +
      '<div class="ad-note-strip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>' +
      "<span>复审结论<strong>仅记入审计日志</strong>，v1 不改变任务状态——「下架并标记」会下架对应分享并把提示词计入命中统计，但不会撤回已生成的图片。</span></div>" +
      '<div class="ad-section-head"><div class="lead"><h2>复审队列 · <span id="review-count">5</span> 条待处理</h2><p>命中违禁词（标记复审档）的生成请求，按时间正序处理。</p></div>' +
      '<div class="ad-tabs"><button type="button" class="ad-tab on" data-safety-tab="queue">复审队列</button><button type="button" class="ad-tab" data-safety-tab="words">违禁词库</button></div></div>' +
      '<div id="safety-queue"><div class="ad-panel"><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>命中词</th><th>提示词</th><th>用户</th><th>时间</th></tr></thead><tbody id="review-tbody">' + q + "</tbody></table></div></div></div>" +
      '<div id="safety-words" hidden><div class="ad-panel"><div class="ad-panel-head"><h3>违禁词 · 5 个</h3><div class="ad-spacer"></div>' +
      '<input class="ad-field" id="word-input" placeholder="新增词…" style="width:140px"></input>' +
      '<select class="ad-chip" id="word-mode"><option value="flag">标记复审</option><option value="block">直接拦截</option></select>' +
      '<button type="button" class="ad-btn primary sm" id="word-add">添加</button></div>' +
      '<div class="ad-panel-body" style="padding:0 16px 6px; color:var(--ad-muted); font-size:12.5px">「标记复审」：请求正常生成，但进入复审队列人工核查；「直接拦截」：请求被拒绝，用户会看到内容安全提示。词库暂不支持编辑，需删除后重加。</div>' +
      '<div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>词</th><th>动作</th><th class="num">近 30 天命中</th><th>添加时间</th><th></th></tr></thead><tbody>' + w + "</tbody></table></div></div></div>";
  }

  /* ---------- 公告运营 ---------- */
  function announcements() {
    var rows = D.ANNOUNCES.map(function (a) {
      var tone = a.state === "active" ? "good" : a.state === "draft" ? "neutral" : "plain neutral";
      return '<tr class="clickable" data-announce="' + a.id + '"><td><div class="ad-email">' + a.title + '</div><div class="ad-sub">' + a.body.slice(0, 30) + "…</div></td><td>" + a.pos + "</td><td>" + pill(tone, D.DICT.announceState[a.state]) + '</td><td class="ad-tnum">' + a.from + " → " + a.to + '</td><td class="num"><button type="button" class="ad-btn sm danger" data-announce-del="' + a.id + '">删除</button></td></tr>';
    }).join("");
    return '' +
      '<div class="ad-section-head"><div class="lead"><h2>营销公告</h2><p>公告展示在生图站顶栏下通栏（00 号定稿位）；同时段多条按创建顺序排队，用户关闭一条后显示下一条。</p></div>' +
      '<button type="button" class="ad-btn primary" data-announce="an-2">＋ 新建公告</button></div>' +
      '<div class="ad-panel"><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>公告</th><th>位置</th><th>状态</th><th>生效区间</th><th></th></tr></thead><tbody>' + rows + "</tbody></table></div></div>";
  }

  /* ---------- 用户记录 ---------- */
  function users() {
    var rows = D.USERS.map(function (u, i) {
      return '<tr class="clickable" data-user="' + i + '"><td class="ad-email">' + u.email + "</td><td>" + u.reg + '</td><td class="num ad-tnum">' + u.gens + '</td><td class="num ad-tnum">' + u.ok + '</td><td class="num ad-tnum">' + u.spend + "</td><td>" + pill(u.src === "paid" ? "good" : u.src === "anonymous" ? "neutral" : "accent", D.DICT.spendSource[u.src]) + '</td><td class="num ad-tnum">' + u.device + "</td><td>" + u.last + "</td></tr>";
    }).join("");
    return '' +
      '<div class="ad-note-strip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>' +
      "<span>本模块<strong>只读</strong>。禁用账号、重置额度等能力后端尚未提供，界面不设操作按钮；账号与余额的权威在 Lumio 账户中心。</span></div>" +
      '<div class="ad-filters"><div class="ad-searchbox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg><input placeholder="按邮箱搜索（300ms 防抖）"></input></div>' +
      '<select class="ad-chip"><option>按最近活跃排序</option><option>按生成量排序</option><option>按注册时间排序</option></select></div>' +
      '<div class="ad-panel"><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>用户</th><th>注册</th><th class="num">生成量</th><th class="num">成功率</th><th class="num">消费</th><th>主要额度来源</th><th class="num">设备数</th><th>最近活跃</th></tr></thead><tbody>' + rows + "</tbody></table></div>" + pager(8204) + "</div>";
  }

  /* ---------- 邀请裂变 ---------- */
  function invites() {
    var rows = D.INVITES.map(function (v) {
      var tone = v.state === "已发放" ? "good" : v.state === "待发放" ? "warn" : "crit";
      return "<tr><td>" + v.inviter + "</td><td>" + v.invitee + "</td><td>" + pill(tone, v.state) + '</td><td class="num ad-tnum">' + v.reward + "</td><td>" + v.time + "</td></tr>";
    }).join("");
    return '' +
      '<div class="ad-kpi-row cols-4">' +
      '<div class="ad-kpi"><div class="label">累计邀请</div><div class="val ad-tnum">1,842</div></div>' +
      '<div class="ad-kpi"><div class="label">成功奖励 / 转化率</div><div class="val ad-tnum">1,573<small> · 85.4%</small></div><span class="ad-delta up">▲ 1.2pt 较上周</span></div>' +
      '<div class="ad-kpi"><div class="label">待发放</div><div class="val ad-tnum" style="color:var(--ad-warn)">27</div><span class="ad-sub">按账户中心批次发放，无手动发放能力</span></div>' +
      '<div class="ad-kpi"><div class="label">作弊拦截</div><div class="val ad-tnum" style="color:var(--ad-crit)">42</div><span class="ad-sub">同设备 / 同 IP 自邀</span></div>' +
      "</div>" +
      '<div class="ad-filters"><button type="button" class="ad-chip on">全部</button><button type="button" class="ad-chip">已发放</button><button type="button" class="ad-chip">待发放</button><button type="button" class="ad-chip">作弊拦截</button></div>' +
      '<div class="ad-panel"><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>邀请人</th><th>被邀请人</th><th>状态</th><th class="num">奖励</th><th>时间</th></tr></thead><tbody>' + rows + "</tbody></table></div>" + pager(1842) + "</div>";
  }

  /* ---------- 报错监控 ---------- */
  function errors() {
    var rows = D.ERRORS.map(function (e) {
      var tone = e.type === "internal_error" ? "crit" : e.type === "provider_error" ? "crit" : "warn";
      return '<tr class="clickable" data-error="' + e.id + '"><td>' + pill(tone, D.DICT.errorType[e.type]) + "</td><td>" + e.msg + "</td><td>" + e.email + '</td><td class="ad-mono ad-sub">' + e.model + '</td><td class="num ad-tnum">' + e.http + "</td><td>" + e.time + "</td></tr>";
    }).join("");
    return '' +
      '<div class="ad-kpi-row cols-4">' +
      '<div class="ad-kpi"><div class="label">今日报错</div><div class="val ad-tnum">12</div><span class="ad-delta down">▼ 33% 较昨日</span></div>' +
      '<div class="ad-kpi"><div class="label">上游服务报错</div><div class="val ad-tnum">7</div></div>' +
      '<div class="ad-kpi"><div class="label">触发限流</div><div class="val ad-tnum">3</div></div>' +
      '<div class="ad-kpi"><div class="label">站内错误</div><div class="val ad-tnum">2</div></div>' +
      "</div>" +
      '<div class="ad-filters"><div class="ad-tabs"><button type="button" class="ad-tab on">全部类型</button><button type="button" class="ad-tab">上游服务报错</button><button type="button" class="ad-tab">额度耗尽</button><button type="button" class="ad-tab">触发限流</button><button type="button" class="ad-tab">站内错误</button></div>' +
      '<div class="ad-searchbox"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"></circle><path d="m21 21-4.3-4.3"></path></svg><input placeholder="按邮箱 / 模型过滤"></input></div>' +
      '<select class="ad-chip"><option>近 24 小时</option><option>近 7 天</option></select></div>' +
      '<div class="ad-panel"><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>类型</th><th>摘要</th><th>用户</th><th>模型</th><th class="num">HTTP</th><th>时间</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      truncateStrip(200, "", "接口单次最多返回 200 条，更早记录请缩小时间范围查询") + "</div>";
  }

  /* ---------- 成本看板 ---------- */
  function cost() {
    return '' +
      '<div class="ad-note-strip"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 16v-4M12 8h.01"></path></svg>' +
      "<span>成本为<strong>按单价估算</strong>的口径，仅用于趋势判断；对账请以各 provider 账单为准。</span></div>" +
      '<div class="ad-filters"><button type="button" class="ad-chip on">近 7 天</button><button type="button" class="ad-chip">近 30 天</button><button type="button" class="ad-chip">本月</button></div>' +
      '<div class="ad-kpi-row cols-4">' +
      '<div class="ad-kpi"><div class="label">总生成数</div><div class="val ad-tnum">5,279</div></div>' +
      '<div class="ad-kpi"><div class="label">估算成本</div><div class="val ad-tnum">$317.2</div><span class="ad-delta up">▲ 8.1% 较上周期</span></div>' +
      '<div class="ad-kpi"><div class="label">单张均价</div><div class="val ad-tnum">$0.060</div></div>' +
      '<div class="ad-kpi"><div class="label">失败损耗</div><div class="val ad-tnum" style="color:var(--ad-warn)">$7.9</div><span class="ad-sub">失败请求已计费的部分；为 $0 时此卡显示绿色对勾</span></div>' +
      "</div>" +
      '<div class="ad-grid-2">' +
      '<div class="ad-panel"><div class="ad-panel-head"><h3>每日估算成本</h3></div><div class="ad-panel-body">' +
      lineChart("cost", D.COSTD, [{ key: "v", label: "估算成本 $", color: "#5B61E8" }], 170) + "</div></div>" +
      '<div class="ad-panel"><div class="ad-panel-head"><h3>Provider 拆分</h3></div><div class="ad-panel-body">' +
      bars([{ n: "OpenAI（gpt-image-2 系）", v: 236 }, { n: "Gemini", v: 81 }], " $") +
      '<h4 style="font-size:12px; text-transform:uppercase; letter-spacing:.04em; color:var(--ad-muted); margin:20px 0 10px">成本 Top 用户</h4>' +
      bars([{ n: "c***r@lumio.games", v: 38 }, { n: "n***o@qq.com", v: 6 }, { n: "s***y@gmail.com", v: 4 }], " $") +
      "</div></div></div>";
  }

  /* ---------- 审计日志 ---------- */
  function audit() {
    var rows = D.AUDITS.map(function (a, i) {
      var tone = D.DICT.auditTone[a.act] || "neutral";
      return '<tr class="clickable" data-audit="' + i + '"><td>' + pill(tone, a.act) + "</td><td>" + a.summary + "</td><td>" + a.who + '</td><td class="ad-mono ad-sub">' + a.target + "</td><td>" + a.time + "</td></tr>";
    }).join("");
    return '' +
      '<div class="ad-section-head"><div class="lead"><h2>审计日志</h2><p>只读、不可撤销。摘要为人话表达，点行查看原始 JSON。</p></div></div>' +
      '<div class="ad-filters"><button type="button" class="ad-chip on">全部</button><button type="button" class="ad-chip">分享治理</button><button type="button" class="ad-chip">素材</button><button type="button" class="ad-chip">内容安全</button><button type="button" class="ad-chip">公告</button></div>' +
      '<div class="ad-panel"><div class="ad-table-wrap"><table class="ad-table"><thead><tr><th>动作</th><th>摘要</th><th>操作者</th><th>对象</th><th>时间</th></tr></thead><tbody>' + rows + "</tbody></table></div>" +
      truncateStrip(100, 0, "更早日志请按时间范围导出查询（规划中）") + "</div>";
  }

  return {
    overview: overview, materials: materials, shares: shares, safety: safety,
    announcements: announcements, users: users, invites: invites, errors: errors,
    cost: cost, audit: audit,
    helpers: { pill: pill, copyCode: copyCode, emptyState: emptyState, lineChart: lineChart }
  };
})();
