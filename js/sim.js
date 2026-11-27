/*
 * 計算部分(画面に依存しない)。ブラウザでは window.LuckSim、Node では module.exports。
 */
(function (root) {
  "use strict";

  var MAX_POINTS = 1500; // グラフに残す点の上限

  /* ---------- 宝くじ ---------- */

  function tierProb(entry, tier) {
    if (typeof tier.count === "number") return tier.count / entry.totalTickets;
    return tier.num / tier.den;
  }

  // データ1件から、抽せんに使う表を作る
  function prepare(entry) {
    var probs = entry.tiers.map(function (t) { return tierProb(entry, t); });
    var cum = [];
    var s = 0;
    for (var i = 0; i < probs.length; i++) { s += probs[i]; cum.push(s); }
    var expected = 0;
    for (var j = 0; j < probs.length; j++) expected += probs[j] * entry.tiers[j].prize;
    return {
      entry: entry,
      probs: probs,
      cum: cum,
      winTotal: s,
      expectedReturnRate: expected / entry.price, // 理論上の回収率(0〜1)
      topProb: probs[entry.topTierIndex || 0]
    };
  }

  function createRun(prepared) {
    return {
      p: prepared,
      tickets: 0,
      spent: 0,
      won: 0,
      hits: prepared.probs.map(function () { return 0; }),
      topHitAt: 0, // 1等が初めて出た枚数(0 = まだ)
      points: [{ x: 0, y: 0 }],
      sampleEvery: 1,
      sinceSample: 0
    };
  }

  function pushPoint(run, force) {
    run.points.push({ x: run.tickets, y: run.won - run.spent, k: !!force });
    if (run.points.length > MAX_POINTS) {
      // 間引く(大きな当たりの点は残す)
      var kept = [run.points[0]];
      for (var i = 1; i < run.points.length - 1; i++) {
        if (run.points[i].k || i % 2 === 0) kept.push(run.points[i]);
      }
      kept.push(run.points[run.points.length - 1]);
      run.points = kept;
      run.sampleEvery *= 2;
    }
  }

  /*
   * n 枚買う。stopOnTop が true なら 1等が出た時点で止める。
   * 戻り値: 今回買った枚数
   */
  function buy(run, n, stopOnTop, rng) {
    rng = rng || Math.random;
    var p = run.p;
    var cum = p.cum;
    var winTotal = p.winTotal;
    var tiers = p.entry.tiers;
    var price = p.entry.price;
    var top = p.entry.topTierIndex || 0;
    var bigLine = price * 3000; // これ以上の当たりはグラフに必ず点を残す
    var bought = 0;
    for (var t = 0; t < n; t++) {
      run.tickets++;
      run.spent += price;
      bought++;
      var r = rng();
      if (r < winTotal) {
        var k = 0;
        while (k < cum.length - 1 && r >= cum[k]) k++;
        run.hits[k]++;
        var prize = tiers[k].prize;
        run.won += prize;
        if (prize >= bigLine) {
          // 当たる直前と直後の点を残して、グラフの跳ね上がりを見せる
          run.points.push({ x: run.tickets - 1, y: run.won - prize - run.spent + price, k: true });
          pushPoint(run, true);
          run.sinceSample = 0;
        }
        if (k === top && !run.topHitAt) {
          run.topHitAt = run.tickets;
          if (stopOnTop) { pushPoint(run, true); return bought; }
        }
      }
      if (++run.sinceSample >= run.sampleEvery) {
        run.sinceSample = 0;
        pushPoint(run, false);
      }
    }
    return bought;
  }

  /* ---------- ガチャ ---------- */

  // 1回分の「当たりが出るまでの回数」をくじ引き(天井 pity: 0 = なし)
  function pullsUntilHit(rate, pity, rng) {
    rng = rng || Math.random;
    var n;
    if (rate >= 1) n = 1;
    else if (rate <= 0) n = Infinity;
    else {
      var u = 1 - rng(); // (0,1]
      n = Math.max(1, Math.ceil(Math.log(u) / Math.log(1 - rate)));
    }
    if (pity > 0 && n > pity) n = pity;
    return n;
  }

  // 何人もが「当たりが出るまで」回した結果の分布
  function gachaCrowd(rate, pity, people, rng) {
    var arr = new Array(people);
    for (var i = 0; i < people; i++) arr[i] = pullsUntilHit(rate, pity, rng);
    arr.sort(function (a, b) { return a - b; });
    function q(f) { return arr[Math.min(arr.length - 1, Math.floor(f * arr.length))]; }
    var pityHit = 0;
    if (pity > 0) for (var j = 0; j < arr.length; j++) if (arr[j] === pity) pityHit++;
    return { sorted: arr, p50: q(0.5), p90: q(0.9), p99: q(0.99), max: arr[arr.length - 1], pityShare: pityHit / people };
  }

  // n 回以内に1回以上当たる確率(天井込み)
  function chanceWithin(rate, pity, n) {
    if (pity > 0 && n >= pity) return 1;
    return 1 - Math.pow(1 - rate, n);
  }

  // 確率 f で当たるのに必要な回数
  function pullsForChance(rate, pity, f) {
    if (rate <= 0) return Infinity;
    if (rate >= 1) return 1;
    var n = Math.ceil(Math.log(1 - f) / Math.log(1 - rate));
    if (pity > 0 && n > pity) n = pity;
    return n;
  }

  var api = {
    prepare: prepare,
    createRun: createRun,
    buy: buy,
    pullsUntilHit: pullsUntilHit,
    gachaCrowd: gachaCrowd,
    chanceWithin: chanceWithin,
    pullsForChance: pullsForChance
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.LuckSim = api;
})(typeof window !== "undefined" ? window : this);
