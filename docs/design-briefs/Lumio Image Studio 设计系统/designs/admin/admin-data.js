/* Lumio Admin 原型 · 示例数据 + 词表（01-admin §4.4 工程枚举中文化，逐字执行） */
var ADX = (function () {
  "use strict";

  var DICT = {
    errorType: { provider_error: "上游服务报错", quota_exhausted: "额度耗尽", rate_limited: "触发限流", internal_error: "站内错误" },
    spendSource: { paid: "付费", invite: "邀请奖励", login: "登录赠送", anonymous: "匿名试用" },
    announceState: { draft: "草稿", active: "生效中", ended: "已结束" },
    wordAction: { flag: "标记复审", block: "直接拦截" },
    auditTone: { "share.takedown": "crit", "material.create": "accent", "material.update": "accent", "material.hide": "accent", "safety.review": "warn", "safety.word.add": "warn", "announcement.create": "good", "announcement.update": "good" }
  };

  var A = "../assets/";
  var MATERIALS = [
    { id: "m-101", title: "城市生命系统图谱", cat: "场景", order: 1, img: A + "case1.jpg", hidden: false, prompt: "城市基础设施剖面信息图，手绘混写实风格，中英双语标注" },
    { id: "m-102", title: "夜市大排档人像海报", cat: "人物", order: 2, img: A + "case15.jpg", hidden: false, prompt: "夜市大排档人像海报，霓虹灼热氛围，毛笔字标题排版" },
    { id: "m-103", title: "流动的丝绸渐变", cat: "风格", order: 3, img: A + "community-2.jpg", hidden: false, prompt: "流动的丝绸质感渐变，紫罗兰与青蓝交织，柔和体积光" },
    { id: "m-104", title: "国风美食图鉴", cat: "风格", order: 4, img: A + "case14.jpg", hidden: true, prompt: "国风水彩美食步骤图鉴，毛笔标题，米色纸纹底" },
    { id: "m-105", title: "成都吃货暴走地图", cat: "场景", order: 5, img: A + "case17.jpg", hidden: false, prompt: "手绘水彩城市美食地图，地标与小吃插画，编号标注式排版" },
    { id: "m-106", title: "彩虹光晕", cat: "风格", order: 6, img: A + "community-4.jpg", hidden: false, prompt: "彩虹色柔焦光晕渐变，梦幻氛围，超高清壁纸" }
  ];

  var SHARES = [
    { id: "sh-9f2a", title: "流动的丝绸渐变", author: "c***r@lumio.games", state: "正常", reports: 0, time: "3 天前", img: A + "community-2.jpg", prompt: "流动的丝绸质感渐变，紫罗兰、青蓝与暖橙交织，柔和体积光" },
    { id: "sh-8e11", title: "周末清晨的咖啡", author: "n***o@qq.com", state: "正常", reports: 2, time: "5 小时前", img: A + "community-5.jpg", prompt: "床上的笔记本电脑与拿铁，俯拍视角，暖调生活摄影" },
    { id: "sh-77c0", title: "彩虹光晕", author: "s***y@gmail.com", state: "已下架", reports: 4, time: "昨天", img: A + "community-4.jpg", prompt: "彩虹色柔焦光晕渐变，梦幻氛围，超高清壁纸" },
    { id: "sh-6b3d", title: "银河星空", author: "b***k@163.com", state: "正常", reports: 0, time: "2 天前", img: A + "community-6.jpg", prompt: "深空银河核心，璨璨星云与尘埃，长曝光摄影质感" }
  ];

  var REVIEWS = [
    { id: "rv-501", word: "枪支", prompt: "一把老式左轮枪支静物素描，博物馆展品风格", email: "a***e@gmail.com", time: "26 分钟前" },
    { id: "rv-502", word: "血", prompt: "万圣节舞台妆容，假血浆特效教程配图", email: "h***w@qq.com", time: "1 小时前" },
    { id: "rv-503", word: "裸", prompt: "裸眼 3D 大屏效果演示，城市地标", email: "d***g@lumio.games", time: "2 小时前" },
    { id: "rv-504", word: "暴力", prompt: "反对校园暴力公益海报，插画风格", email: "p***a@163.com", time: "4 小时前" },
    { id: "rv-505", word: "枪支", prompt: "水枪大战夏日活动海报", email: "k***m@gmail.com", time: "昨天" }
  ];

  var WORDS = [
    { w: "枪支", action: "flag", hits: 34, time: "2026-05-12" },
    { w: "血", action: "flag", hits: 21, time: "2026-05-12" },
    { w: "裸", action: "flag", hits: 18, time: "2026-06-02" },
    { w: "暴力", action: "flag", hits: 9, time: "2026-06-02" },
    { w: "毒品", action: "block", hits: 3, time: "2026-06-20" }
  ];

  var ANNOUNCES = [
    { id: "an-1", title: "4K 档开放公告", body: "gpt-image-2 · 4K 档已开放，登录后即可使用账户余额生成。", pos: "顶栏下通栏", state: "active", from: "2026-07-01 00:00", to: "2026-07-15 00:00" },
    { id: "an-2", title: "周五凌晨维护", body: "本周五 02:00–03:00 系统维护，期间生成可能排队。", pos: "顶栏下通栏", state: "draft", from: "2026-07-10 00:00", to: "2026-07-11 00:00" },
    { id: "an-3", title: "端午活动", body: "端午期间邀请好友双方各得 30 次。", pos: "顶栏下通栏", state: "ended", from: "2026-06-18 00:00", to: "2026-06-25 00:00" }
  ];

  var USERS = [
    { email: "c***r@lumio.games", reg: "2026-03-02", gens: 412, ok: "97.6%", spend: "$38.20", src: "paid", last: "12 分钟前", device: 2 },
    { email: "n***o@qq.com", reg: "2026-05-14", gens: 129, ok: "94.1%", spend: "$6.40", src: "paid", last: "2 小时前", device: 1 },
    { email: "s***y@gmail.com", reg: "2026-06-01", gens: 46, ok: "91.3%", spend: "$0", src: "invite", last: "昨天", device: 3 },
    { email: "h***w@qq.com", reg: "2026-06-20", gens: 23, ok: "95.7%", spend: "$0", src: "login", last: "3 天前", device: 1 },
    { email: "（匿名设备 fp_a91…）", reg: "—", gens: 3, ok: "100%", spend: "$0", src: "anonymous", last: "5 天前", device: 1 }
  ];

  var INVITES = [
    { inviter: "c***r@lumio.games", invitee: "s***y@gmail.com", state: "已发放", reward: "20 次", time: "2026-06-01" },
    { inviter: "c***r@lumio.games", invitee: "t***p@163.com", state: "待发放", reward: "20 次", time: "今天" },
    { inviter: "n***o@qq.com", invitee: "q***z@qq.com", state: "已发放", reward: "20 次", time: "2026-06-28" },
    { inviter: "x***v@gmail.com", invitee: "x***v+1@gmail.com", state: "作弊拦截", reward: "—", time: "2026-07-02" }
  ];

  var ERRORS = [
    { id: "er-2201", type: "provider_error", email: "n***o@qq.com", model: "gpt-image-2-4k", http: 502, time: "8 分钟前", msg: "上游网关返回非 JSON 错误" },
    { id: "er-2200", type: "rate_limited", email: "h***w@qq.com", model: "gemini-3.1-flash", http: 429, time: "22 分钟前", msg: "触发上游限流，已排队重试" },
    { id: "er-2199", type: "quota_exhausted", email: "（匿名设备）", model: "gpt-image-2", http: 402, time: "1 小时前", msg: "免费额度用尽后继续请求" },
    { id: "er-2198", type: "provider_error", email: "c***r@lumio.games", model: "gpt-image-2-2k", http: 504, time: "2 小时前", msg: "2K 生成 240 秒超时" },
    { id: "er-2197", type: "internal_error", email: "s***y@gmail.com", model: "gpt-image-2", http: 500, time: "昨天", msg: "S3 上传失败：连接重置" }
  ];

  var AUDITS = [
    { act: "share.takedown", who: "ops@lumio.games", target: "sh-77c0", time: "10 分钟前", summary: "下架分享「彩虹光晕」（举报 4 次，命中复审）", raw: '{"action":"share.takedown","target":"sh-77c0","reason":"reports>=3","operator":"ops@lumio.games"}' },
    { act: "material.update", who: "ops@lumio.games", target: "m-103", time: "1 小时前", summary: "更新素材「流动的丝绸渐变」排序 5 → 3", raw: '{"action":"material.update","target":"m-103","changes":{"sortOrder":[5,3]}}' },
    { act: "safety.word.add", who: "ops@lumio.games", target: "毒品", time: "昨天", summary: "新增违禁词「毒品」，动作：直接拦截", raw: '{"action":"safety.word.add","word":"毒品","mode":"block"}' },
    { act: "announcement.update", who: "ops@lumio.games", target: "an-1", time: "昨天", summary: "公告「4K 档开放公告」由草稿改为生效中", raw: '{"action":"announcement.update","target":"an-1","changes":{"state":["draft","active"]}}' },
    { act: "safety.review", who: "ops@lumio.games", target: "rv-498", time: "2 天前", summary: "复审判定通过（水枪大战海报，误命中「枪支」）", raw: '{"action":"safety.review","target":"rv-498","verdict":"pass"}' }
  ];

  var TREND = [
    { d: "6/26", ok: 512, fail: 22 }, { d: "6/27", ok: 548, fail: 18 }, { d: "6/28", ok: 601, fail: 35 },
    { d: "6/29", ok: 577, fail: 26 }, { d: "6/30", ok: 640, fail: 19 }, { d: "7/1", ok: 731, fail: 41 },
    { d: "7/2", ok: 702, fail: 24 }, { d: "7/3", ok: 688, fail: 21 }, { d: "7/4", ok: 745, fail: 30 },
    { d: "7/5", ok: 791, fail: 27 }, { d: "7/6", ok: 812, fail: 44 }, { d: "7/7", ok: 856, fail: 25 },
    { d: "7/8", ok: 901, fail: 33 }, { d: "7/9", ok: 486, fail: 12 }
  ];
  var COSTD = [
    { d: "7/3", v: 41.2 }, { d: "7/4", v: 44.8 }, { d: "7/5", v: 47.5 }, { d: "7/6", v: 48.9 },
    { d: "7/7", v: 51.4 }, { d: "7/8", v: 54.1 }, { d: "7/9", v: 29.3 }
  ];
  var MODELS = [
    { n: "gpt-image-2", v: 5120 }, { n: "gpt-image-2 · 2K", v: 1830 }, { n: "gemini-3.1-flash", v: 1490 },
    { n: "gpt-image-2 · 4K", v: 410 }
  ];

  return { DICT: DICT, MATERIALS: MATERIALS, SHARES: SHARES, REVIEWS: REVIEWS, WORDS: WORDS, ANNOUNCES: ANNOUNCES, USERS: USERS, INVITES: INVITES, ERRORS: ERRORS, AUDITS: AUDITS, TREND: TREND, COSTD: COSTD, MODELS: MODELS };
})();
