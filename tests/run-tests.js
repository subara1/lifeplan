#!/usr/bin/env node
// ライフプランOS 計算エンジンの自動テスト
//
// 実行方法:  node tests/run-tests.js
// index.html から計算エンジン部分（DOM非依存の純粋関数）を抽出してテストする。
// CIでも同じコマンドが走る（.github/workflows/ci.yml）。

const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const script = html.match(/<script>([\s\S]*)<\/script>\s*<\/body>/)[1];

const grab = (name) => {
  const m = script.match(new RegExp(`function ${name}\\([^)]*\\)\\{[\\s\\S]*?\\n\\}`));
  if (!m) throw new Error(`関数が見つかりません: ${name}`);
  return m[0];
};

const w = v => Math.round(v / 10000); // lifeEventsOf が参照するグローバル
const grabConst = (name) => {
  const m = script.match(new RegExp(`const ${name}=\\{[\\s\\S]*?\\n\\};`));
  if (!m) throw new Error(`定数が見つかりません: ${name}`);
  return m[0];
};
eval(['const LIFE_END_AGE=90;',
  grab('penAdjust'), grab('pensionAnnual'), grab('annualMortgage'),
  grab('eduChild'), grab('calculate'), grab('getMetrics'),
  grab('lifeEventsOf'), grab('stageLabel'), grab('riskLevel'),
  grabConst('MF_CAT_MAP'), grabConst('MF_SKIP_REASON'),
  grab('parseCSVLine'), grab('parseMFCSV'), grab('mfAggregateToFields'),
].join('\n'));

// ── テストヘルパー ──
let pass = 0, fail = 0;
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ✅ ' + name); }
  else { fail++; console.log('  ❌ ' + name + (detail ? `  [${detail}]` : '')); }
}
function section(t) { console.log('\n■ ' + t); }
const near = (a, b, tol = 1) => Math.abs(a - b) <= tol;

// デフォルト値相当のパラメータ（index.htmlの初期値と揃えること）
function baseP(over = {}) {
  return {
    Y0: 2026, uBY: 1993, wBY: 1996, c1BY: 2026, c2BY: 2028,
    hasSp: true, hasC1: true, hasC2: true,
    spLabel: '妻', c1Label: '長女', c2Label: '次子',
    UA0: 33, WA0: 30, RET: 2058, WRET: 2058, YEND: 2083,
    uMon: 320000, uBon: 1460000, uGrow: 0.01,
    hAllow: 27000, depAllow: 10000, otherAllow: 0,
    reemployM: 0, reemployY: 0,
    wMon: 100000, wBon: 300000, wret: 2031, inflRate: 0.02,
    food: 70000, util: 15000, ent: 20000, cloth: 10000,
    aself: 20000, awife: 15000, kids: 10000, misc: 10000,
    tBaby: 20, tSchool: 30, tEmpty: 45, tRetire: 35,
    ins: 20000, tel: 10000, carM: 20000, sub: 10000, oth: 6000,
    carLoanAnn: 416000, carLoanYears: 6,
    rent: 84000, hyr: 2033, hprc: 5000, hdp: 5000000,
    hrate: 0.7, hper: 35, hmgmt: 20000, hTax: 120000,
    penSlide: 0.015,
    c1edu: { el: 32, mid: 48, hi: 51, uni: 54, uni0: 28, dorm: 0, extra: 0 },
    c2edu: { el: 32, mid: 48, hi: 51, uni: 54, uni0: 28, dorm: 0, extra: 0 },
    cashAmt: 2000000, cashRate: 0.001, investAmt: 1000000, investRate: 0.05,
    sev: 20000000, investMon: 30000,
    uPenStart: 65, wPenStart: 65,
    uPenAmt: pensionAnnual(0, 550, 38, 40, 65),
    wPenAmt: pensionAnnual(0, 200, 20, 40, 65),
    customEvents: [],
    ...over,
  };
}

// ══════════════════════════════════════════
section('住宅ローン（元利均等）');
// 3000万・0.7%・35年 → 月々約80,556円（市販シミュレーターと一致すること）
check('3000万/0.7%/35年 ≒ 月8.06万円', near(annualMortgage(30000000, 0.7, 35) / 12, 80556, 60));
check('金利0なら元本/年数', near(annualMortgage(35000000, 0, 35), 1000000));
check('元本0なら0', annualMortgage(0, 1, 35) === 0);

section('年金の推計');
check('基礎年金満額 = 81.6万円/年', near(pensionAnnual(0, 0, 0, 40, 65), 816000));
check('納付20年なら基礎年金半額', near(pensionAnnual(0, 0, 0, 20, 65), 408000));
check('厚生年金: 年収550万×38年 ≒ 114.5万円/年', near(pensionAnnual(0, 550, 38, 0, 65), 5500000 * 0.005481 * 38, 100));
check('直接入力は推計より優先', near(pensionAnnual(200, 550, 38, 40, 65), 2000000));
check('60歳繰上げ = 76%', near(penAdjust(60), 0.76, 1e-9));
check('70歳繰下げ = 142%', near(penAdjust(70), 1.42, 1e-9));
check('75歳繰下げ = 184%', near(penAdjust(75), 1.84, 1e-9));
check('範囲外はクランプ（59→60扱い）', near(penAdjust(59), 0.76, 1e-9));

section('教育費');
check('大学(国公立54+入学金28) 18歳 = 82万円', near(eduChild(18, baseP().c1edu), 820000));
check('大学19-21歳 = 54万円/年', near(eduChild(19, baseP().c1edu), 540000));
check('22歳以降は0', eduChild(22, baseP().c1edu) === 0);

// ══════════════════════════════════════════
const p = baseP();
const rows = calculate(p);
const at = (ua) => rows.find(r => r.ua === ua);

section('会計の恒等式（全年）');
check('総資産 = 現金 + 投資', rows.every(r => near(r.totalAsset, r.cash + r.invest)));
check('収入合計 = 内訳の和', rows.every(r =>
  near(r.totalInc, r.uInc + r.wInc + r.pen + r.sev + r.reemploy + r.custInc)));
check('支出合計 = 内訳の和', rows.every(r =>
  near(r.totalExp, r.varExp + r.fixExp + r.housing + r.childcare + r.edu + r.otherExp)));

section('監査で修正した4点の回帰テスト');
// 1. 住居手当は賃貸中のみ（購入年2033: 基本給×1.01^7 + 扶養手当2人分のみ、住居手当なし）
const afterBuy = rows.find(r => r.yr === p.hyr);
const expAfterBuy = (p.uMon * 12 + p.uBon) * Math.pow(1 + p.uGrow, p.hyr - p.Y0) + p.depAllow * 2 * 12;
check('住宅購入年から住居手当が消える', near(afterBuy.uInc, expAfterBuy, 50),
  `実際=${Math.round(afterBuy.uInc)} 期待=${Math.round(expAfterBuy)}`);
// 2. 固定資産税: ローン完済後の住居費 = 管理費 + 固定資産税
const afterLoan = rows.find(r => r.yr === p.hyr + p.hper);
check('完済後の住居費 = 管理費24万 + 固定資産税12万', near(afterLoan.housing, 20000 * 12 + 120000));
// 3. 教育費インフレ: 子①6歳=小学校32万 + 子②4歳=幼稚園2.2万、合計×1.02^dy
const c1at6 = rows.find(r => r.c1a === 6);
check('教育費がインフレ連動（(32万+2.2万)×1.02^dy）',
  near(c1at6.edu, (320000 + 22000) * Math.pow(1.02, c1at6.yr - p.Y0), 10),
  `実際=${Math.round(c1at6.edu)}`);
// 4. 年金スライド: 65歳時点の年金 = 見込額×1.015^32
const pen65 = at(65);
check('年金が物価スライドで増額される',
  near(pen65.pen, p.uPenAmt * Math.pow(1.015, 65 - 33), 100),
  `実際=${Math.round(pen65.pen)}`);

section('資産エンジン（取り崩し・積立）');
check('投資が残っているのに現金マイナスの年はない',
  rows.filter(r => r.cash < -1 && r.invest > 1).length === 0);
check('取り崩しは現金不足の年のみ発生',
  rows.every(r => r.withdrawal === 0 || r.balance < 0 || r.withdrawal > 0));
check('積立は現役中のみ・年36万円以下',
  rows.every(r => r.contribution === 0 || (r.yr < p.RET && r.contribution <= 360001)));
check('取り崩し年の現金は非負（投資枯渇時を除く）',
  rows.filter(r => r.withdrawal > 0).every(r => r.cash >= -1 || r.invest < 1));

section('収入イベント');
check('退職年に退職金2000万', near(rows.find(r => r.yr === p.RET).sev, 20000000));
check('退職前年に退職金なし', rows.find(r => r.yr === p.RET - 1).sev === 0);
check('本人64歳では年金なし', at(64).pen === 0);
const wAt65 = rows.find(r => r.wa === 65);
check('妻65歳で夫婦合計の年金',
  near(wAt65.pen, (p.uPenAmt + p.wPenAmt) * Math.pow(1.015, wAt65.yr - p.Y0), 100));
const reP = baseP({ reemployM: 200000, reemployY: 3 });
const reRows = calculate(reP);
check('再任用収入が定年後3年間だけ入る',
  reRows.filter(r => r.reemploy > 0).length === 3 &&
  reRows.filter(r => r.reemploy > 0).every(r => r.yr >= reP.RET && r.yr < reP.RET + 3));

section('カスタムイベント');
const ceRows = calculate(baseP({
  customEvents: [
    { year: 2035, amt: 500, type: 'income', rec: false },
    { year: 2036, endYear: 2038, amt: 100, type: 'expense', rec: true },
  ],
}));
check('一度きりの収入イベント', near(ceRows.find(r => r.yr === 2035).custInc, 5000000));
check('毎年の支出イベントが3年間', ceRows.filter(r => r.custExp > 0 || (r.yr >= 2036 && r.yr <= 2038 && r.otherExp > 0)).length >= 3 &&
  near(ceRows.find(r => r.yr === 2037).totalExp - calculate(baseP()).find(r => r.yr === 2037).totalExp, 1000000, 10));

section('家族構成バリエーション');
const noSp = calculate(baseP({ hasSp: false, wBY: 0 }));
check('配偶者なし: 配偶者収入ゼロ', noSp.every(r => r.wInc === 0));
check('配偶者なし: 年金は本人分のみ',
  near(noSp.find(r => r.ua === 70).pen, p.uPenAmt * Math.pow(1.015, 70 - 33), 100));
const noKids = calculate(baseP({ hasC1: false, hasC2: false, c1BY: 0, c2BY: 0 }));
check('子なし: 教育費・保育費ゼロ', noKids.every(r => r.edu === 0 && r.childcare === 0));
check('子なしのほうが最終資産が多い',
  noKids[noKids.length - 1].totalAsset > rows[rows.length - 1].totalAsset);

section('ライフイベント生成（描画関数のランタイムエラー検知）');
let evErr = null, penEvts = 0;
try {
  for (const r of rows) {
    for (const [, t] of lifeEventsOf(r.yr, r.ua, r.wa, r.c1a, r.c2a, p)) {
      if (t.includes('年金受給開始')) penEvts++;
    }
  }
} catch (e) { evErr = e.message; }
check('全行でエラーなし', evErr === null, evErr);
check('年金開始イベントが本人+妻で2回', penEvts === 2);

section('マネーフォワードCSV取り込み');
check('CSV行パース: 引用符内カンマ', JSON.stringify(parseCSVLine('a,"1,234",b')) === '["a","1,234","b"]');
check('CSV行パース: エスケープされた引用符', parseCSVLine('"say ""hi""",x')[0] === 'say "hi"');
const MF_SAMPLE = [
  '計算対象,日付,内容,金額（円）,保有金融機関,大項目,中項目,メモ,振替,ID',
  '1,2026/05/01,スーパー,-30000,カード,食費,食料品,,0,a1',
  '1,2026/05/10,ドラッグストア,"-10,000",カード,日用品,消耗品,,0,a2',
  '1,2026/05/15,電気代,-8000,口座,水道・光熱費,電気,,0,a3',
  '1,2026/05/20,家賃,-84000,口座,住宅,家賃,,0,a4',
  '1,2026/05/25,給与,300000,口座,収入,給与,,0,a5',
  '0,2026/05/26,対象外の買い物,-99999,カード,食費,食料品,,0,a6',
  '1,2026/05/27,口座振替,-50000,口座,現金・カード,,,1,a7',
  '1,2026/06/01,スーパー,-34000,カード,食費,食料品,,0,b1',
  '1,2026/06/15,住民税,-20000,口座,税・社会保障,住民税,,0,b2',
].join('\n');
const mfP = parseMFCSV(MF_SAMPLE);
check('月数を正しく検出（2ヶ月）', mfP.months === 2);
check('計算対象=0 の行を除外', mfP.sums['食費'] === 64000);
check('振替=1 の行を除外', !('現金・カード' in mfP.sums));
check('引用符付き金額を読める', mfP.sums['日用品'] === 10000);
check('収入は月平均で参考値化', mfP.incomeAvg === 150000);
const mfF = mfAggregateToFields(mfP);
check('食費+日用品→e_food 月平均（100円丸め）', mfF.fields.e_food === 37000);
check('住宅→h_rent 月平均', mfF.fields.h_rent === 42000);
check('税・社会保障はスキップされ理由つき', mfF.skipped.some(([c]) => c === '税・社会保障'));
check('ヘッダーなしCSVはエラーを返す', !!parseMFCSV('a,b,c\n1,2,3').error);

section('メトリクス');
const m = getMetrics(rows, p);
check('asset65が数値', typeof m.asset65 === 'number');
check('資産寿命の型が正しい', typeof m.assetLife === 'number' || typeof m.assetLife === 'string');
if (typeof m.assetLife === 'number') {
  const dep = rows.find(r => r.totalAsset < 0);
  check('資産寿命 = 枯渇年齢−1', m.assetLife === dep.ua - 1);
}

// ══════════════════════════════════════════
console.log(`\n合計: ✅ ${pass} / ❌ ${fail}`);
process.exit(fail ? 1 : 0);
