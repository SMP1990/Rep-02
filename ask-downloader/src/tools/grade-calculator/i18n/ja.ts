// Grade Calculator, Japanese.
import type { Strings } from './en';

export const ja: Strings = {
  title: '成績計算ツール - Swift Score',
  subtitle: '問題数と不正解の数を入力するだけで、得点・正答率・レターグレードがすぐにわかります。先生にも生徒にも無料です。',
  privacy: '計算はすべてお使いの端末で行われます。入力した内容は送信も保存もされません。',

  modeLabel: '採点の方法',
  modeQuestions: '問題数',
  modePoints: '点数',
  totalQuestions: '問題数',
  totalPoints: '満点',
  wrongQuestions: '不正解の数',
  wrongPoints: '減点',
  addWrong: '不正解 +1',
  addHalf: '不正解 +½',
  resetWrong: 'リセット',
  totalHint: '1〜{max}の範囲で入力。',

  resultLine: '{score}/{total} = {percent}',
  letterLabel: 'レターグレード',

  scaleLabel: '評価基準',
  scaleStandard: 'プラス/マイナスあり（A+〜F）',
  scaleTen: '10点刻み（A, B, C, D, F）',
  decimalsLabel: '小数点以下',
  decimals0: '整数',
  decimals1: '小数第1位まで',
  decimals2: '小数第2位まで',
  halfPoints: '0.5点刻みを使う',
  showChart: '採点表をすべて表示',
  shortcuts: 'たくさんの答案を採点中ですか？ W で不正解を1つ追加、R で次の答案に移ります。',

  chartTitle: '採点表',
  colWrong: '不正解',
  colLost: '減点',
  colScore: '得点',
  colPercent: '正答率',
  colGrade: '評価',

  scaleTitle: 'レターグレードの範囲',

  moreTools: 'その他の無料ツール',

  howTitle: '成績計算ツールの使い方',
  step1Title: 'テストの大きさを入力',
  step1Desc: 'テストの問題数を入力します。点数で採点する場合は「点数」に切り替えて満点を入力してください。',
  step2Title: '不正解を追加',
  step2Desc: '不正解の数を入力するか、間違い1つにつき「不正解 +1」（または W キー）を1回押します。部分点がある答えには0.5点刻みをオンにします。',
  step3Title: '成績を確認',
  step3Desc: '得点・正答率・レターグレードは入力と同時に変わります。採点表を開くと、このテストで考えられるすべての結果を一度に確認できます。',
  faqTitle: 'よくある質問',
  faq1Q: '正答率はどう計算しますか？',
  faq1A: '正解数を問題数で割り、100を掛けます。たとえば20問中17問正解なら、17 ÷ 20 = 0.85 で85%です。',
  faq2Q: 'どの評価基準を選べばいいですか？',
  faq2A: 'プラス/マイナスありの基準は、各文字をさらに細かく分けます。A+ は97%から、A は93%から、A- は90%から、同様に D- は60%からです。10点刻みの基準は文字だけを使い、90%以上が A、80%が B、70%が C、60%が D です。どちらも60%未満は F です。学校によって異なるので、所属校の規定に従ってください。',
  faq3Q: '評価は四捨五入した正答率で決まりますか？',
  faq3A: 'いいえ。評価は常に正確な正答率で決まります。整数表示で90%と出る89.6%は B+ のままで、A- にはなりません。正確な値を見るには小数第1位か第2位を選んでください。',
  faq4Q: '問題数ではなく点数で採点できますか？',
  faq4A: 'できます。「点数」に切り替え、テストの満点と生徒の減点を入力してください。計算は同じで、得点を満点で割って100を掛けます。',
  faq5Q: '入力した数字はどこかに保存されますか？',
  faq5A: 'いいえ。成績はお使いのブラウザ内で計算されます。入力した内容はサーバーに送信されず、保存も記録もされません。',
};
