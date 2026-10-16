// Every word of the Grade Calculator (tool + its page), English. The other
// 10 languages live next to this file, typed as `Strings`, so TypeScript
// fails if one misses a key. They load only with the tool page.
// Placeholders: {score} {total} {percent} {letter} {max}.
export const en = {
  title: 'Grade Calculator - Swift Score',
  subtitle: 'Type the number of questions and how many were wrong to get the score, percentage and letter grade at once. Free, for teachers and students.',
  privacy: 'Everything is worked out on your device. Nothing you type is sent anywhere or saved.',

  modeLabel: 'Grade by',
  modeQuestions: 'Questions',
  modePoints: 'Points',
  totalQuestions: 'Number of questions',
  totalPoints: 'Total points',
  wrongQuestions: 'Wrong answers',
  wrongPoints: 'Points lost',
  addWrong: '+1 wrong',
  addHalf: '+½ wrong',
  resetWrong: 'Reset',
  totalHint: 'From 1 to {max}.',

  resultLine: '{score}/{total} = {percent}',
  letterLabel: 'Letter grade',

  scaleLabel: 'Grading scale',
  scaleStandard: 'Plus/minus (A+ to F)',
  scaleTen: '10-point (A, B, C, D, F)',
  decimalsLabel: 'Decimals',
  decimals0: 'Whole number',
  decimals1: '1 decimal place',
  decimals2: '2 decimal places',
  halfPoints: 'Allow half points (0.5)',
  showChart: 'Show the full grading chart',
  shortcuts: 'Grading a pile of papers? Press W to add a wrong answer and R to start the next paper.',

  chartTitle: 'Grading chart',
  colWrong: 'Wrong',
  colLost: 'Lost',
  colScore: 'Score',
  colPercent: 'Percent',
  colGrade: 'Grade',

  scaleTitle: 'Letter grade ranges',

  moreTools: 'More free tools',

  howTitle: 'How to use the grade calculator',
  step1Title: 'Enter the size of the test',
  step1Desc: 'Type how many questions the test has. Marking with points instead? Switch to Points and type the total points.',
  step2Title: 'Add the wrong answers',
  step2Desc: 'Type the number of wrong answers, or tap "+1 wrong" (or press W) once for each mistake. Turn on half points for answers that are partly right.',
  step3Title: 'Read the grade',
  step3Desc: 'The score, percentage and letter grade change as you type. Open the grading chart to see every possible result for this test at once.',
  faqTitle: 'Frequently asked questions',
  faq1Q: 'How is the percentage worked out?',
  faq1A: 'The correct answers are divided by the total number of questions, then multiplied by 100. For example, 17 correct out of 20 is 17 ÷ 20 = 0.85, which is 85%.',
  faq2Q: 'Which grading scale should I choose?',
  faq2A: 'The plus/minus scale splits each letter into steps: A+ from 97%, A from 93%, A- from 90%, and so on down to D- from 60%. The 10-point scale only uses whole letters: 90% and above is an A, 80% a B, 70% a C, 60% a D. Below 60% is an F on both. Schools differ, so follow your own school\'s policy.',
  faq3Q: 'Is the letter based on the rounded percentage?',
  faq3A: 'No. The letter always comes from the exact percentage. A score of 89.6% shown as 90% with whole numbers is still a B+, not an A-. Choose one or two decimal places to see the exact figure.',
  faq4Q: 'Can I grade with points instead of questions?',
  faq4A: 'Yes. Switch to Points, type the total points of the test and the points the student lost. The maths is the same: points earned divided by total points, times 100.',
  faq5Q: 'Are my numbers saved anywhere?',
  faq5A: 'No. The grade is calculated in your browser. Nothing you type is sent to our server, saved or logged.',
};

export type Strings = typeof en;

/** Replaces {key} placeholders, like the site's fill() helper. */
export function fill(text: string, values: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (m, k) => (k in values ? String(values[k]) : m));
}
