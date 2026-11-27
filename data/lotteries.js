/*
 * 宝くじデータ(1件 = 配列の要素1つ)
 * ------------------------------------------------------------
 * 追加方法は README.md の「宝くじの種類を追加する」を参照。
 * 数字はすべて宝くじ公式サイトの掲載どおり。出典は sources.md にも記録。
 *
 * 項目:
 *   id           英数字の識別子(URLの #id にも使う)
 *   name         表示名
 *   group        "jumbo"(本数が決まっているくじ) / "number"(数字選択式)
 *   price        1枚(1口)の値段(円)
 *   totalTickets 発売予定の総枚数(本数方式のときだけ。確率 = 本数 / 総枚数)
 *   tiers        等級。上から順に「上位の等級」として判定する
 *                  本数方式: { name, prize, count }
 *                  確率方式: { name, prize, num, den }  (確率 = num / den)
 *                  approx: true … 当せん金が「理論値・約」で、実際は毎回変わる
 *   topTierIndex 「1等」とみなす等級の位置(通常 0)
 *   source       { title, url, edition(回号・年度), checked(確認日) }
 *   notes        画面に出す注意書き(配列)
 */
window.LOTTERY_DATA = [
  {
    id: "nenmatsu_jumbo_2026",
    name: "年末ジャンボ宝くじ",
    group: "jumbo",
    price: 300,
    totalTickets: 460000000, // 23ユニット × 2,000万枚
    topTierIndex: 0,
    tiers: [
      { name: "1等", prize: 700000000, count: 23 },
      { name: "1等の前後賞", prize: 150000000, count: 46 },
      { name: "1等の組違い賞", prize: 100000, count: 4577 },
      { name: "2等", prize: 100000000, count: 23 },
      { name: "3等", prize: 10000000, count: 46 },
      { name: "4等", prize: 1000000, count: 1380 },
      { name: "5等", prize: 10000, count: 1380000 },
      { name: "6等", prize: 3000, count: 4600000 },
      { name: "7等", prize: 300, count: 46000000 }
    ],
    source: {
      title: "宝くじ公式サイト ジャンボ宝くじ(年末ジャンボ宝くじ 第1134回 全国自治宝くじ)",
      url: "https://www.takarakuji-official.jp/brand/jumbo/",
      edition: "2026年 第1134回(発売 11/24〜12/25、抽せん 12/31)",
      checked: "2026-11-20"
    },
    notes: [
      "発売予定額1,380億円(23ユニット)が全部売れた場合の本数で計算。",
      "1枚ずつ別々に抽せんする簡略モデル(連番・バラの買い方や前後賞のつながりは再現していない)。"
    ]
  },
  {
    id: "nenmatsu_jumbo_mini_2026",
    name: "年末ジャンボミニ",
    group: "jumbo",
    price: 300,
    totalTickets: 150000000, // 15ユニット × 1,000万枚
    topTierIndex: 0,
    tiers: [
      { name: "1等", prize: 30000000, count: 150 },
      { name: "1等の前後賞", prize: 10000000, count: 300 },
      { name: "2等", prize: 1000000, count: 150 },
      { name: "3等", prize: 30000, count: 45000 },
      { name: "4等", prize: 10000, count: 450000 },
      { name: "5等", prize: 3000, count: 1500000 },
      { name: "6等", prize: 300, count: 15000000 }
    ],
    source: {
      title: "宝くじ公式サイト ジャンボ宝くじ(年末ジャンボミニ 第1135回 全国自治宝くじ)",
      url: "https://www.takarakuji-official.jp/brand/jumbo/",
      edition: "2026年 第1135回(発売 11/24〜12/25、抽せん 12/31)",
      checked: "2026-11-20"
    },
    notes: [
      "発売予定額450億円(15ユニット)が全部売れた場合の本数で計算。",
      "1枚ずつ別々に抽せんする簡略モデル。"
    ]
  },
  {
    id: "loto6",
    name: "ロト6",
    group: "number",
    price: 200,
    topTierIndex: 0,
    tiers: [
      { name: "1等", prize: 200000000, num: 1, den: 6096454, approx: true },
      { name: "2等", prize: 10000000, num: 6, den: 6096454, approx: true },
      { name: "3等", prize: 300000, num: 216, den: 6096454, approx: true },
      { name: "4等", prize: 6800, num: 9990, den: 6096454, approx: true },
      { name: "5等", prize: 1000, num: 155400, den: 6096454 }
    ],
    source: {
      title: "宝くじ公式サイト ロト6をもっと楽しむには?(当せんパターン例と当せん金額(理論値))",
      url: "https://www.takarakuji-official.jp/kuji/loto/loto6/introduction2.html",
      edition: "2026年11月時点の掲載内容",
      checked: "2026-11-20"
    },
    notes: [
      "1〜4等の当せん金は公式の「理論値」。実際は発売額と当せん口数で毎回変わる(5等は原則固定1,000円)。",
      "キャリーオーバー(1等最高6億円)は再現していない。"
    ]
  },
  {
    id: "loto7",
    name: "ロト7",
    group: "number",
    price: 300,
    topTierIndex: 0,
    tiers: [
      { name: "1等", prize: 700000000, num: 1, den: 10295472, approx: true },
      { name: "2等", prize: 6100000, num: 14, den: 10295472, approx: true },
      { name: "3等", prize: 500000, num: 196, den: 10295472, approx: true },
      { name: "4等", prize: 6500, num: 9135, den: 10295472, approx: true },
      { name: "5等", prize: 1400, num: 142100, den: 10295472, approx: true },
      { name: "6等", prize: 1000, num: 242550, den: 10295472, approx: true }
    ],
    source: {
      title: "宝くじ公式サイト ロト7をもっと楽しむには?(当せんパターン例と当せん金額(理論値))",
      url: "https://www.takarakuji-official.jp/kuji/loto/loto7/introduction2.html",
      edition: "2026年11月時点の掲載内容",
      checked: "2026-11-20"
    },
    notes: [
      "当せん金は公式の「理論値」(2等は「約610万円」)。実際は発売額と当せん口数で毎回変わる。",
      "キャリーオーバー(1等最高12億円)は再現していない。"
    ]
  },
  {
    id: "miniloto",
    name: "ミニロト",
    group: "number",
    price: 200,
    topTierIndex: 0,
    tiers: [
      { name: "1等", prize: 10000000, num: 1, den: 169911, approx: true },
      { name: "2等", prize: 150000, num: 5, den: 169911, approx: true },
      { name: "3等", prize: 10000, num: 125, den: 169911, approx: true },
      { name: "4等", prize: 1000, num: 3250, den: 169911, approx: true }
    ],
    source: {
      title: "宝くじ公式サイト ミニロトをもっと楽しむには?(当せんパターン例と当せん金額(理論値))",
      url: "https://www.takarakuji-official.jp/kuji/loto/miniloto/introduction2.html",
      edition: "2026年11月時点の掲載内容",
      checked: "2026-11-20"
    },
    notes: [
      "当せん金は公式の「理論値」(1等は「約1,000万円」、2等は「約15万円」)。実際は毎回変わる。"
    ]
  },
  {
    id: "numbers3_straight",
    name: "ナンバーズ3(ストレート)",
    group: "number",
    price: 200,
    topTierIndex: 0,
    tiers: [
      { name: "ストレート", prize: 90000, num: 1, den: 1000, approx: true }
    ],
    source: {
      title: "宝くじ公式サイト ナンバーズ3をもっと楽しむには?(当せんパターン例と当せん金額(理論値))",
      url: "https://www.takarakuji-official.jp/kuji/numbers/numbers3/introduction2.html",
      edition: "2026年11月時点の掲載内容",
      checked: "2026-11-20"
    },
    notes: [
      "当せん金は公式の「理論値」9万円(公式の表記は「約10万円」)。実際は毎回変わる。"
    ]
  },
  {
    id: "numbers4_straight",
    name: "ナンバーズ4(ストレート)",
    group: "number",
    price: 200,
    topTierIndex: 0,
    tiers: [
      { name: "ストレート", prize: 900000, num: 1, den: 10000, approx: true }
    ],
    source: {
      title: "宝くじ公式サイト ナンバーズ4をもっと楽しむには?(当せんパターン例と当せん金額(理論値))",
      url: "https://www.takarakuji-official.jp/kuji/numbers/numbers4/introduction2.html",
      edition: "2026年11月時点の掲載内容",
      checked: "2026-11-20"
    },
    notes: [
      "当せん金は公式の「理論値」90万円(公式の表記は「約100万円」)。実際は毎回変わる。"
    ]
  }
];
