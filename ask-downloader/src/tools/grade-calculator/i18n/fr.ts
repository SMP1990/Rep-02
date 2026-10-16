// Grade Calculator, French.
import type { Strings } from './en';

export const fr: Strings = {
  title: 'Calculateur de notes - Swift Score',
  subtitle: 'Saisissez le nombre de questions et le nombre de mauvaises réponses pour obtenir aussitôt le score, le pourcentage et la note en lettre. Gratuit pour les enseignants et les élèves.',
  privacy: 'Tout est calculé sur votre appareil. Rien de ce que vous saisissez n’est envoyé ni enregistré.',

  modeLabel: 'Noter par',
  modeQuestions: 'Questions',
  modePoints: 'Points',
  totalQuestions: 'Nombre de questions',
  totalPoints: 'Total des points',
  wrongQuestions: 'Mauvaises réponses',
  wrongPoints: 'Points perdus',
  addWrong: '+1 faute',
  addHalf: '+½ faute',
  resetWrong: 'Remettre à zéro',
  totalHint: 'De 1 à {max}.',

  resultLine: '{score}/{total} = {percent}',
  letterLabel: 'Note en lettre',

  scaleLabel: 'Barème',
  scaleStandard: 'Avec plus/moins (A+ à F)',
  scaleTen: 'Sur 10 points (A, B, C, D, F)',
  decimalsLabel: 'Décimales',
  decimals0: 'Nombre entier',
  decimals1: '1 décimale',
  decimals2: '2 décimales',
  halfPoints: 'Autoriser les demi-points (0,5)',
  showChart: 'Afficher le tableau de notes complet',
  shortcuts: 'Une pile de copies à corriger ? Appuyez sur W pour ajouter une faute et sur R pour passer à la copie suivante.',

  chartTitle: 'Tableau de notes',
  colWrong: 'Fautes',
  colLost: 'Perdus',
  colScore: 'Score',
  colPercent: 'Pourcentage',
  colGrade: 'Note',

  scaleTitle: 'Plages des notes en lettre',

  moreTools: 'Autres outils gratuits',

  howTitle: 'Comment utiliser le calculateur de notes',
  step1Title: 'Indiquez la taille de l’épreuve',
  step1Desc: 'Saisissez le nombre de questions de l’épreuve. Vous notez avec des points ? Passez sur Points et saisissez le total des points.',
  step2Title: 'Ajoutez les mauvaises réponses',
  step2Desc: 'Saisissez le nombre de mauvaises réponses, ou appuyez sur « +1 faute » (ou sur W) une fois par erreur. Activez les demi-points pour les réponses en partie justes.',
  step3Title: 'Lisez la note',
  step3Desc: 'Le score, le pourcentage et la note en lettre changent pendant la saisie. Ouvrez le tableau de notes pour voir d’un coup tous les résultats possibles de cette épreuve.',
  faqTitle: 'Questions fréquentes',
  faq1Q: 'Comment le pourcentage est-il calculé ?',
  faq1A: 'Les bonnes réponses sont divisées par le nombre total de questions, puis multipliées par 100. Par exemple, 17 bonnes réponses sur 20 donnent 17 ÷ 20 = 0,85, soit 85 %.',
  faq2Q: 'Quel barème choisir ?',
  faq2A: 'Le barème avec plus/moins découpe chaque lettre en paliers : A+ dès 97 %, A dès 93 %, A- dès 90 %, et ainsi de suite jusqu’à D- dès 60 %. Le barème sur 10 points n’utilise que des lettres entières : 90 % et plus donne A, 80 % B, 70 % C, 60 % D. En dessous de 60 %, c’est F dans les deux cas. Chaque établissement a ses règles, suivez celles du vôtre.',
  faq3Q: 'La lettre dépend-elle du pourcentage arrondi ?',
  faq3A: 'Non. La lettre vient toujours du pourcentage exact. Un 89,6 % affiché 90 % en nombre entier reste un B+, pas un A-. Choisissez une ou deux décimales pour voir la valeur exacte.',
  faq4Q: 'Puis-je noter avec des points plutôt que des questions ?',
  faq4A: 'Oui. Passez sur Points, saisissez le total des points de l’épreuve et les points perdus par l’élève. Le calcul est le même : points obtenus divisés par le total, multipliés par 100.',
  faq5Q: 'Mes chiffres sont-ils enregistrés quelque part ?',
  faq5A: 'Non. La note est calculée dans votre navigateur. Rien de ce que vous saisissez n’est envoyé à notre serveur, enregistré ni consigné.',
};
