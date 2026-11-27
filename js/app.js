/* 画面の操作 */
(function () {
  "use strict";

  var DATA = window.LOTTERY_DATA || [];
  var Sim = window.LuckSim;
  var Chart = window.LuckChart;
  var TOP_CAP = 2000000000; // 「1等が出るまで」の安全上限(20億枚)
  var GACHA_CAP = 100000000; // 「出るまで回す」の安全上限(1億回)

  function $(id) { return document.getElementById(id); }

  /* ---------- 書式 ---------- */
  function num(n) { return Math.round(n).toLocaleString("ja-JP"); }

  function yen(n) {
    var sign = n < 0 ? "−" : "";
    var a = Math.round(Math.abs(n));
    if (a >= 1e12) {
      var cho = Math.floor(a / 1e12), oku = Math.floor((a % 1e12) / 1e8);
      return sign + num(cho) + "兆" + (oku ? num(oku) + "億" : "") + "円";
    }
    if (a >= 1e8) {
      var o = Math.floor(a / 1e8), man = Math.floor((a % 1e8) / 1e4);
      return sign + num(o) + "億" + (man ? num(man) + "万" : "") + "円";
    }
    if (a >= 1e4) {
      var m = Math.floor(a / 1e4), r = a % 1e4;
      return sign + num(m) + "万" + (r ? num(r) : "") + "円";
    }
    return sign + num(a) + "円";
  }

  function yenShort(n) {
    var sign = n < 0 ? "−" : "";
    var a = Math.abs(n);
    if (a >= 1e12) return sign + (a / 1e12).toFixed(a >= 1e13 ? 0 : 1) + "兆";
    if (a >= 1e8) return sign + (a / 1e8).toFixed(a >= 1e9 ? 0 : 1) + "億";
    if (a >= 1e4) return sign + num(a / 1e4) + "万";
    return sign + num(a);
  }

  function countShort(n) {
    if (n >= 1e8) return (n / 1e8).toFixed(n >= 1e9 ? 0 : 1) + "億枚";
    if (n >= 1e4) return num(n / 1e4) + "万枚";
    return num(n) + "枚";
  }

  function duration(tickets, perDay) {
    var days = tickets / perDay;
    if (days < 1) return "1日以内";
    if (days < 365) return num(Math.ceil(days)) + "日";
    var years = days / 365;
    if (years < 10) return years.toFixed(1) + "年";
    return num(years) + "年";
  }

  function odds(p) {
    if (p <= 0) return "-";
    var d = 1 / p;
    return "1/" + (d >= 100 ? num(d) : d.toFixed(1));
  }

  function pct(x) {
    if (!isFinite(x)) return "-";
    return (x * 100).toFixed(x < 0.1 ? 2 : 1) + "%";
  }

  /* ---------- 保存(この端末だけ・失敗しても動く) ---------- */
  function load(key, def) {
    try { var v = localStorage.getItem("luck_sim_" + key); return v === null ? def : v; } catch (e) { return def; }
  }
  function save(key, v) {
    try { localStorage.setItem("luck_sim_" + key, String(v)); } catch (e) { /* 無視 */ }
  }

  /* ---------- タブ ---------- */
  function showTab(name) {
    document.querySelectorAll(".tab").forEach(function (b) {
      var on = b.dataset.tab === name;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
    });
    document.querySelectorAll(".panel").forEach(function (p) {
      var on = p.id === "panel-" + name;
      p.hidden = !on;
      p.classList.toggle("is-active", on);
    });
    if (name === "lottery") drawLotteryChart();
    if (name === "gacha") updateCrowd();
    save("tab", name);
  }
  document.querySelectorAll(".tab").forEach(function (b) {
    b.addEventListener("click", function () { showTab(b.dataset.tab); });
  });
  document.querySelectorAll("[data-tab-link]").forEach(function (a) {
    a.addEventListener("click", function (e) {
      e.preventDefault();
      showTab(a.dataset.tabLink);
      window.scrollTo(0, 0);
    });
  });

  function share(text) {
    var url = "https://x.com/intent/tweet?text=" + encodeURIComponent(text);
    window.open(url, "_blank", "noopener");
  }

  /* =========================================================
   * 宝くじ
   * ========================================================= */
  var current = null; // prepare() の結果
  var run = null;
  var loop = { id: 0, target: 0, untilTop: false, startTickets: 0 };

  function perDay() {
    var v = parseInt($("per-day").value, 10);
    if (!(v >= 1)) v = 1;
    if (v > 100000) v = 100000;
    return v;
  }

  function speed() {
    var el = document.querySelector('input[name="speed"]:checked');
    return el ? el.value : "normal";
  }

  function buildChips() {
    var box = $("lottery-chips");
    box.innerHTML = "";
    DATA.forEach(function (e) {
      var b = document.createElement("button");
      b.className = "chip";
      b.type = "button";
      b.textContent = e.name;
      b.dataset.id = e.id;
      b.addEventListener("click", function () { selectLottery(e.id); });
      box.appendChild(b);
    });
  }

  function selectLottery(id) {
    stopLoop();
    var entry = DATA.filter(function (e) { return e.id === id; })[0] || DATA[0];
    if (!entry) return;
    current = Sim.prepare(entry);
    document.querySelectorAll(".chip").forEach(function (c) {
      c.classList.toggle("is-active", c.dataset.id === entry.id);
    });
    save("lottery", entry.id);
    setRunning(false);
    resetRun();
    renderInfo();
    renderNotes();
  }

  function renderInfo() {
    var e = current.entry;
    var top = e.tiers[e.topTierIndex || 0];
    var avgTickets = 1 / current.topProb;
    var back = e.price * current.expectedReturnRate;
    $("lottery-info").innerHTML =
      '<div class="info-name"></div>' +
      '<div class="info-grid">' +
      "<div>1枚の値段<b>" + yen(e.price) + "</b></div>" +
      "<div>" + esc(top.name) + "の当せん金<b>" + yen(top.prize) + (top.approx ? "<small>(理論値)</small>" : "") + "</b></div>" +
      "<div>" + esc(top.name) + "の確率<b>" + odds(current.topProb) + "</b></div>" +
      "<div>理論上の回収率<b>約" + (current.expectedReturnRate * 100).toFixed(1) + "%</b></div>" +
      "</div>" +
      '<p class="info-edition">1枚' + yen(e.price) + "買うと、平均で約" + yen(back) + "しか戻らない計算。" +
      esc(top.name) + "が出るまでの平均は約" + countShort(avgTickets) + "(約" + yen(avgTickets * e.price) + ")、毎日" + num(perDay()) + "枚なら約" + duration(avgTickets, perDay()) + "。</p>" +
      '<p class="info-edition">データ: ' + esc(e.source.edition) + "</p>";
    $("lottery-info").querySelector(".info-name").textContent = e.name;
  }

  function renderNotes() {
    var ul = $("lottery-notes");
    ul.innerHTML = "";
    (current.entry.notes || []).concat(["抽せんはこの端末の乱数で行っています。実際の宝くじとは関係ありません。"]).forEach(function (t) {
      var li = document.createElement("li");
      li.textContent = t;
      ul.appendChild(li);
    });
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function resetRun() {
    stopLoop();
    run = Sim.createRun(current);
    $("lottery-banner").hidden = true;
    renderTierTable(true);
    renderStats();
    drawLotteryChart();
  }

  function renderTierTable(rebuild) {
    var tbody = $("tier-table").querySelector("tbody");
    var e = current.entry;
    if (rebuild || tbody.children.length !== e.tiers.length) {
      tbody.innerHTML = "";
      e.tiers.forEach(function (t, i) {
        var tr = document.createElement("tr");
        tr.innerHTML = "<td></td><td>" + yen(t.prize) + (t.approx ? "*" : "") + "</td><td>" + odds(current.probs[i]) + "</td><td class=\"hits\">0</td>";
        tr.firstChild.textContent = t.name;
        tbody.appendChild(tr);
      });
    }
    var cells = tbody.querySelectorAll(".hits");
    for (var i = 0; i < cells.length; i++) cells[i].textContent = num(run.hits[i]) + "回";
  }

  function renderStats() {
    var bal = run.won - run.spent;
    $("s-tickets").textContent = num(run.tickets) + "枚";
    $("s-spent").textContent = yen(run.spent);
    $("s-won").textContent = yen(run.won);
    var b = $("s-balance");
    b.textContent = (bal > 0 ? "+" : "") + yen(bal);
    b.className = "stat-value " + (bal > 0 ? "is-gain" : bal < 0 ? "is-loss" : "");
    $("s-rate").textContent = run.spent ? pct(run.won / run.spent) : "-";
    $("s-time-label").textContent = "毎日" + num(perDay()) + "枚なら";
    $("s-time").textContent = run.tickets ? duration(run.tickets, perDay()) : "-";
  }

  function drawLotteryChart() {
    if (!run || $("panel-lottery").hidden) return;
    Chart.drawBalance($("lottery-chart"), run.points, yenShort, countShort);
  }

  function showTopBanner() {
    var e = current.entry;
    var top = e.tiers[e.topTierIndex || 0];
    var n = run.topHitAt;
    var spentAt = n * e.price;
    var banner = $("lottery-banner");
    banner.hidden = false;
    banner.innerHTML =
      "<strong>" + esc(top.name) + "が出ました: " + num(n) + "枚目</strong><br>" +
      "ここまでに使った金額 " + yen(spentAt) + "。毎日" + num(perDay()) + "枚買い続けたら " + duration(n, perDay()) + " かかる計算です。" +
      "<br>平均は" + countShort(1 / current.topProb) + "なので、今回は" + (n < 1 / current.topProb ? "平均より早い「運のいい」ほう" : "平均より遅いほう") + "でした。";
  }

  function showCapBanner(msg) {
    var banner = $("lottery-banner");
    banner.hidden = false;
    banner.textContent = msg;
  }

  function setRunning(on) {
    $("btn-stop").disabled = !on;
    var top = current ? current.entry.tiers[current.entry.topTierIndex || 0].name : "1等";
    $("btn-until-top").textContent = on && loop.untilTop ? "回しています…" : top + "が出るまで回す";
  }

  function startLoop(count, untilTop) {
    stopLoop();
    if (untilTop && run.topHitAt) resetRun();
    loop.untilTop = untilTop;
    loop.target = untilTop ? TOP_CAP : run.tickets + count;
    loop.startTickets = run.tickets;
    setRunning(true);
    loop.id = requestAnimationFrame(tick);
  }

  function stopLoop() {
    if (loop.id) cancelAnimationFrame(loop.id);
    loop.id = 0;
    setRunning(false);
  }

  function tick() {
    var remaining = loop.target - run.tickets;
    var done = false;
    if (speed() === "max") {
      var t0 = performance.now();
      while (performance.now() - t0 < 24 && remaining > 0) {
        Sim.buy(run, Math.min(200000, remaining), loop.untilTop);
        remaining = loop.target - run.tickets;
        if (loop.untilTop && run.topHitAt) break;
      }
    } else {
      // ふつう: だんだん速くなる(買った枚数の4%ずつ増える)
      var sofar = run.tickets - loop.startTickets;
      var batch = Math.max(loop.untilTop ? 50 : Math.ceil((loop.target - loop.startTickets) / 60), Math.floor(sofar * 0.04));
      batch = Math.min(batch, 3000000, remaining);
      if (batch > 0) Sim.buy(run, batch, loop.untilTop);
      remaining = loop.target - run.tickets;
    }
    if (loop.untilTop && run.topHitAt) { done = true; showTopBanner(); }
    else if (remaining <= 0) {
      done = true;
      if (loop.untilTop) showCapBanner(current.entry.tiers[current.entry.topTierIndex || 0].name + "が出ないまま" + countShort(TOP_CAP) + "に達したので止めました。");
    }
    renderStats();
    renderTierTable(false);
    drawLotteryChart();
    if (done) { loop.id = 0; setRunning(false); return; }
    loop.id = requestAnimationFrame(tick);
  }

  $("btn-until-top").addEventListener("click", function () { startLoop(0, true); });
  document.querySelectorAll("[data-buy]").forEach(function (b) {
    b.addEventListener("click", function () { startLoop(parseInt(b.dataset.buy, 10), false); });
  });
  $("btn-stop").addEventListener("click", stopLoop);
  $("btn-reset").addEventListener("click", resetRun);
  $("per-day").addEventListener("input", function () {
    save("perDay", perDay());
    renderStats();
    renderInfo();
  });
  document.querySelectorAll('input[name="speed"]').forEach(function (r) {
    r.addEventListener("change", function () { save("speed", speed()); });
  });

  $("share-lottery").addEventListener("click", function () {
    var e = current.entry;
    var top = e.tiers[e.topTierIndex || 0];
    var text;
    if (!run.tickets) {
      text = e.name + "の" + top.name + "は" + odds(current.topProb) + "。出るまでの平均は約" + countShort(1 / current.topProb) +
        "(約" + yen(e.price / current.topProb) + ")。";
    } else if (run.topHitAt) {
      text = e.name + "を" + top.name + "が出るまで買い続けたら、" + num(run.topHitAt) + "枚目で出た。使った金額" +
        yen(run.topHitAt * e.price) + "、毎日" + num(perDay()) + "枚なら" + duration(run.topHitAt, perDay()) + "。回収率" + pct(run.won / run.spent) + "。";
    } else {
      text = e.name + "を" + num(run.tickets) + "枚(" + yen(run.spent) + ")買ってみたら、当たりは" + yen(run.won) +
        "、回収率" + pct(run.won / run.spent) + "。" + top.name + "は出ず。";
    }
    share(text + "\n#当たるまで回す機 (非公式シミュレーター・お金は使っていません)");
  });

  window.addEventListener("resize", function () { drawLotteryChart(); drawGachaChart(); });

  /* =========================================================
   * ガチャ
   * ========================================================= */
  var g = { pulls: 0, spent: 0, hits: [], since: 0, lastUntil: 0 };
  var crowd = null;
  var crowdKey = "";

  function gParams() {
    var rate = parseFloat($("g-rate").value);
    if (!(rate > 0)) rate = 0.0001;
    if (rate > 100) rate = 100;
    var cost = parseInt($("g-cost").value, 10);
    if (!(cost >= 1)) cost = 1;
    var pity = parseInt($("g-pity").value, 10);
    if (!(pity >= 0)) pity = 0;
    return { rate: rate / 100, ratePct: rate, cost: cost, pity: pity };
  }

  function gPull(prm) {
    g.pulls++;
    g.spent += prm.cost;
    g.since++;
    var hit = Math.random() < prm.rate || (prm.pity > 0 && g.since >= prm.pity);
    if (hit) {
      g.hits.push({ at: g.pulls, gap: g.since, pity: prm.pity > 0 && g.since >= prm.pity });
      g.since = 0;
    }
    return hit;
  }

  function gRender(prm) {
    $("g-pulls").textContent = num(g.pulls) + "回";
    $("g-spent").textContent = yen(g.spent);
    $("g-hits").textContent = num(g.hits.length) + "回";
    $("g-to-pity").textContent = prm.pity > 0 ? "あと" + num(prm.pity - g.since) + "回" : "天井なし";
    var log = $("g-log");
    log.innerHTML = "";
    if (!g.hits.length) {
      log.innerHTML = '<li class="muted">まだ当たりはありません</li>';
      return;
    }
    var start = Math.max(0, g.hits.length - 50);
    for (var i = g.hits.length - 1; i >= start; i--) {
      var h = g.hits[i];
      var li = document.createElement("li");
      li.value = i + 1;
      li.textContent = num(h.at) + "回目(前の当たりから" + num(h.gap) + "回・" + yen(h.gap * prm.cost) + ")" + (h.pity ? " 天井" : "");
      log.appendChild(li);
    }
  }

  function gBanner(html) {
    var b = $("gacha-banner");
    b.hidden = !html;
    b.innerHTML = html || "";
  }

  $("g-single").addEventListener("click", function () {
    var prm = gParams();
    var hit = gPull(prm);
    gBanner(hit ? "<strong>当たり!</strong> " + num(g.pulls) + "回目" : "");
    gRender(prm);
  });
  $("g-ten").addEventListener("click", function () {
    var prm = gParams();
    var c = 0;
    for (var i = 0; i < 10; i++) if (gPull(prm)) c++;
    gBanner(c ? "<strong>10連で当たり" + c + "回</strong>" : "10連、当たりなし。");
    gRender(prm);
  });
  $("g-until").addEventListener("click", function () {
    var prm = gParams();
    var start = g.pulls;
    var hit = false;
    while (!hit && g.pulls - start < GACHA_CAP) hit = gPull(prm);
    var n = g.pulls - start;
    g.lastUntil = n;
    if (!hit) {
      gBanner(num(GACHA_CAP) + "回回しても出なかったので止めました。");
    } else {
      updateCrowd();
      var faster = 0;
      if (crowd) {
        // 自分より早く出た人の割合
        var lo = 0, hi = crowd.sorted.length;
        while (lo < hi) { var mid = (lo + hi) >> 1; if (crowd.sorted[mid] < n) lo = mid + 1; else hi = mid; }
        faster = lo / crowd.sorted.length;
      }
      gBanner("<strong>" + num(n) + "回目で出ました(" + yen(n * prm.cost) + ")</strong><br>1万人のうち、あなたより早く出た人は約" +
        (faster * 100).toFixed(0) + "%。" + (faster > 0.5 ? "平均より運が悪いほうでした。" : "運がいいほうでした。"));
    }
    gRender(prm);
    drawGachaChart();
  });
  $("g-reset").addEventListener("click", function () {
    g = { pulls: 0, spent: 0, hits: [], since: 0, lastUntil: 0 };
    gBanner("");
    gRender(gParams());
    drawGachaChart();
  });
  ["g-rate", "g-cost", "g-pity"].forEach(function (id) {
    $(id).addEventListener("input", function () {
      var prm = gParams();
      save(id, $(id).value);
      gRender(prm);
      updateCrowd();
    });
  });

  function updateCrowd() {
    var prm = gParams();
    var key = prm.rate + "|" + prm.pity + "|" + prm.cost;
    if (key !== crowdKey) {
      crowdKey = key;
      crowd = Sim.gachaCrowd(prm.rate, prm.pity, 10000);
    }
    var c = crowd;
    var expected = prm.pity > 0 ? (1 - Math.pow(1 - prm.rate, prm.pity)) / prm.rate : 1 / prm.rate;
    function slow(v) {
      if (prm.pity > 0 && v >= prm.pity) return "天井の" + num(prm.pity) + "回(" + yen(prm.pity * prm.cost) + ")まで行く";
      return num(v) + "回(" + yen(v * prm.cost) + ")以上かかる";
    }
    var html = "<dl>" +
      "<dt>半分の人</dt><dd>" + num(c.p50) + "回(" + yen(c.p50 * prm.cost) + ")以内に出る</dd>" +
      "<dt>10人に1人</dt><dd>" + slow(c.p90) + "</dd>" +
      "<dt>100人に1人</dt><dd>" + slow(c.p99) + "</dd>" +
      "<dt>いちばん遅い人</dt><dd>" + num(c.max) + "回(" + yen(c.max * prm.cost) + ")</dd>" +
      "<dt>理論上の平均</dt><dd>" + num(expected) + "回(" + yen(expected * prm.cost) + ")</dd>";
    if (prm.pity > 0) html += "<dt>天井まで行った人</dt><dd>" + (c.pityShare * 100).toFixed(1) + "%</dd>";
    html += "<dt>100回で出る確率</dt><dd>" + pct(Sim.chanceWithin(prm.rate, prm.pity, 100)) + "</dd>";
    html += "</dl>";
    $("g-crowd").innerHTML = html;
    drawGachaChart();
  }

  function drawGachaChart() {
    if (!crowd || $("panel-gacha").hidden) return;
    Chart.drawHistogram($("gacha-chart"), crowd.sorted, [
      { x: crowd.p50, label: "半分" },
      { x: crowd.p90, label: "90%" }
    ], g.lastUntil || 0);
  }

  $("share-gacha").addEventListener("click", function () {
    var prm = gParams();
    var cond = "排出率" + prm.ratePct + "%・" + (prm.pity > 0 ? "天井" + num(prm.pity) + "回" : "天井なし") + "・1回" + yen(prm.cost) + "のガチャ";
    var text;
    if (g.lastUntil) {
      text = cond + "、出るまで" + num(g.lastUntil) + "回・" + yen(g.lastUntil * prm.cost) + "かかった。";
    } else if (g.pulls) {
      text = cond + "を" + num(g.pulls) + "回(" + yen(g.spent) + ")回して、当たり" + num(g.hits.length) + "回。";
    } else {
      text = cond + "、半分の人は" + num(crowd.p50) + "回で出るけど、10人に1人は" + num(crowd.p90) + "回以上かかる。";
    }
    share(text + "\n#当たるまで回す機 (非公式シミュレーター・お金は使っていません)");
  });

  /* =========================================================
   * 出典
   * ========================================================= */
  function renderSources() {
    var ul = $("source-list");
    ul.innerHTML = "";
    DATA.forEach(function (e) {
      var li = document.createElement("li");
      var b = document.createElement("b");
      b.textContent = e.name;
      var info = document.createElement("div");
      info.textContent = e.source.edition + "(確認日 " + e.source.checked + ")";
      var a = document.createElement("a");
      a.href = e.source.url;
      a.target = "_blank";
      a.rel = "noopener";
      a.textContent = e.source.title;
      li.appendChild(b); li.appendChild(info); li.appendChild(a);
      ul.appendChild(li);
    });
  }

  /* ---------- 起動 ---------- */
  $("per-day").value = load("perDay", "10");
  var sp = load("speed", "normal");
  document.querySelectorAll('input[name="speed"]').forEach(function (r) { r.checked = r.value === sp; });
  ["g-rate", "g-cost", "g-pity"].forEach(function (id) { var v = load(id, null); if (v !== null && v !== "") $(id).value = v; });

  buildChips();
  renderSources();
  var hashId = (location.hash || "").slice(1);
  var startId = DATA.some(function (e) { return e.id === hashId; }) ? hashId : load("lottery", DATA[0] && DATA[0].id);
  selectLottery(startId);
  gRender(gParams());
  var tab = hashId === "sources" ? "sources" : load("tab", "lottery");
  showTab(["lottery", "gacha", "sources"].indexOf(tab) >= 0 ? tab : "lottery");
})();
