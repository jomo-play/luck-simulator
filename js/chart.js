/* グラフ描画(canvas、外部ライブラリなし) */
(function (root) {
  "use strict";

  function css(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function setup(canvas) {
    var dpr = window.devicePixelRatio || 1;
    var w = canvas.clientWidth || 300;
    var h = canvas.clientHeight || 200;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.font = "11px -apple-system, 'Hiragino Sans', sans-serif";
    return { ctx: ctx, w: w, h: h };
  }

  // 収支の折れ線。points: [{x, y}]、fmtY / fmtX: 目盛りの書式
  function drawBalance(canvas, points, fmtY, fmtX) {
    var s = setup(canvas), ctx = s.ctx, w = s.w, h = s.h;
    var padL = 64, padR = 10, padT = 10, padB = 22;
    var muted = css("--muted"), grid = css("--chart-grid");
    var loss = css("--loss"), gain = css("--gain"), text = css("--text");

    var maxX = 1, minY = 0, maxY = 0;
    for (var i = 0; i < points.length; i++) {
      var p = points[i];
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }
    if (minY === maxY) { minY -= 1; maxY += 1; }
    var span = maxY - minY;
    minY -= span * 0.05; maxY += span * 0.05;

    function X(v) { return padL + (v / maxX) * (w - padL - padR); }
    function Y(v) { return padT + (1 - (v - minY) / (maxY - minY)) * (h - padT - padB); }

    // 目盛り
    ctx.strokeStyle = grid; ctx.lineWidth = 1; ctx.fillStyle = muted;
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    var ticks = [maxY, (maxY + minY) / 2, minY];
    ticks.forEach(function (t) {
      var y = Math.round(Y(t)) + 0.5;
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(w - padR, y); ctx.stroke();
      ctx.fillText(fmtY(t), padL - 6, y);
    });
    // 0 の線
    if (minY < 0 && maxY > 0) {
      var y0 = Math.round(Y(0)) + 0.5;
      var near = ticks.some(function (t) { return Math.abs(Y(t) - y0) < 14; });
      ctx.strokeStyle = text; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.moveTo(padL, y0); ctx.lineTo(w - padR, y0); ctx.stroke();
      ctx.globalAlpha = 1;
      if (!near) { ctx.fillStyle = muted; ctx.fillText("0", padL - 6, y0); }
    }
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; ctx.fillStyle = muted;
    ctx.fillText("0枚", padL, h - 6);
    ctx.textAlign = "right";
    ctx.fillText(fmtX(maxX), w - padR, h - 6);

    if (points.length < 2) return;
    var last = points[points.length - 1];
    ctx.strokeStyle = last.y >= 0 ? gain : loss;
    ctx.lineWidth = 2; ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(X(points[0].x), Y(points[0].y));
    for (var j = 1; j < points.length; j++) ctx.lineTo(X(points[j].x), Y(points[j].y));
    ctx.stroke();
    // 最後の点
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath(); ctx.arc(X(last.x), Y(last.y), 3.5, 0, Math.PI * 2); ctx.fill();
  }

  // 必要回数の分布(棒グラフ)。sorted: 昇順の配列、marks: [{x, label}]
  function drawHistogram(canvas, sorted, marks, mine) {
    var s = setup(canvas), ctx = s.ctx, w = s.w, h = s.h;
    var padL = 8, padR = 8, padT = 18, padB = 22;
    var muted = css("--muted"), accent = css("--accent"), text = css("--text"), loss = css("--loss");
    if (!sorted.length) return;
    // 上位1%を超える外れ値は最後の棒にまとめる
    var cap = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.99))];
    if (cap < 10) cap = sorted[sorted.length - 1];
    var bins = Math.min(40, Math.max(5, cap));
    var size = cap / bins;
    var counts = new Array(bins).fill(0);
    for (var i = 0; i < sorted.length; i++) {
      var b = Math.min(bins - 1, Math.floor((sorted[i] - 1) / size));
      counts[b]++;
    }
    var maxC = Math.max.apply(null, counts) || 1;
    var bw = (w - padL - padR) / bins;
    ctx.fillStyle = accent; ctx.globalAlpha = 0.75;
    for (var k = 0; k < bins; k++) {
      var bh = (counts[k] / maxC) * (h - padT - padB);
      ctx.fillRect(padL + k * bw + 1, h - padB - bh, Math.max(1, bw - 2), bh);
    }
    ctx.globalAlpha = 1;
    function X(v) { return padL + Math.min(1, v / cap) * (w - padL - padR); }
    ctx.textBaseline = "alphabetic";
    var seen = {};
    (marks || []).filter(function (m) { if (seen[m.x]) return false; seen[m.x] = 1; return true; }).forEach(function (m, idx) {
      var x = Math.round(X(m.x)) + 0.5;
      ctx.strokeStyle = text; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(x, padT - 4); ctx.lineTo(x, h - padB); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = text; ctx.textAlign = x > w * 0.7 ? "right" : "left";
      ctx.fillText(m.label, x + (ctx.textAlign === "left" ? 3 : -3), padT - 6 + (idx % 2) * 12 + 8);
    });
    if (mine) {
      var xm = Math.round(X(mine)) + 0.5;
      ctx.strokeStyle = loss; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(xm, padT); ctx.lineTo(xm, h - padB); ctx.stroke();
      ctx.lineWidth = 1;
    }
    ctx.fillStyle = muted; ctx.textAlign = "left";
    ctx.fillText("1回", padL, h - 6);
    ctx.textAlign = "right";
    ctx.fillText(cap.toLocaleString("ja-JP") + "回" + (cap < sorted[sorted.length - 1] ? "以上" : ""), w - padR, h - 6);
  }

  root.LuckChart = { drawBalance: drawBalance, drawHistogram: drawHistogram };
})(window);
