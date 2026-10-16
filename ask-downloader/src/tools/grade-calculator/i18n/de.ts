// Grade Calculator, German.
import type { Strings } from './en';

export const de: Strings = {
  title: 'Notenrechner - Swift Score',
  subtitle: 'Gib die Zahl der Fragen und der falschen Antworten ein und sieh sofort Punktzahl, Prozentsatz und Buchstabennote. Kostenlos für Lehrkräfte und Schüler.',
  privacy: 'Alles wird auf deinem Gerät berechnet. Nichts, was du eingibst, wird gesendet oder gespeichert.',

  modeLabel: 'Bewerten nach',
  modeQuestions: 'Fragen',
  modePoints: 'Punkten',
  totalQuestions: 'Anzahl der Fragen',
  totalPoints: 'Gesamtpunktzahl',
  wrongQuestions: 'Falsche Antworten',
  wrongPoints: 'Abgezogene Punkte',
  addWrong: '+1 falsch',
  addHalf: '+½ falsch',
  resetWrong: 'Zurücksetzen',
  totalHint: 'Von 1 bis {max}.',

  resultLine: '{score}/{total} = {percent}',
  letterLabel: 'Buchstabennote',

  scaleLabel: 'Notenskala',
  scaleStandard: 'Mit Plus/Minus (A+ bis F)',
  scaleTen: '10-Punkte-Skala (A, B, C, D, F)',
  decimalsLabel: 'Nachkommastellen',
  decimals0: 'Ganze Zahl',
  decimals1: '1 Nachkommastelle',
  decimals2: '2 Nachkommastellen',
  halfPoints: 'Halbe Punkte erlauben (0,5)',
  showChart: 'Vollständige Notentabelle anzeigen',
  shortcuts: 'Ein Stapel Arbeiten zu korrigieren? Drücke W für einen Fehler mehr und R für die nächste Arbeit.',

  chartTitle: 'Notentabelle',
  colWrong: 'Fehler',
  colLost: 'Abzug',
  colScore: 'Punkte',
  colPercent: 'Prozent',
  colGrade: 'Note',

  scaleTitle: 'Bereiche der Buchstabennoten',

  moreTools: 'Weitere kostenlose Tools',

  howTitle: 'So benutzt du den Notenrechner',
  step1Title: 'Gib die Größe des Tests ein',
  step1Desc: 'Tippe ein, wie viele Fragen der Test hat. Du bewertest nach Punkten? Wechsle zu „Punkten“ und gib die Gesamtpunktzahl ein.',
  step2Title: 'Füge die falschen Antworten hinzu',
  step2Desc: 'Gib die Zahl der falschen Antworten ein oder tippe für jeden Fehler einmal auf „+1 falsch“ (oder drücke W). Schalte halbe Punkte für teilweise richtige Antworten ein.',
  step3Title: 'Lies die Note ab',
  step3Desc: 'Punktzahl, Prozentsatz und Buchstabennote ändern sich beim Tippen. Öffne die Notentabelle, um alle möglichen Ergebnisse dieses Tests auf einmal zu sehen.',
  faqTitle: 'Häufige Fragen',
  faq1Q: 'Wie wird der Prozentsatz berechnet?',
  faq1A: 'Die richtigen Antworten werden durch die Gesamtzahl der Fragen geteilt und mit 100 multipliziert. Zum Beispiel: 17 von 20 richtig ergibt 17 ÷ 20 = 0,85, also 85 %.',
  faq2Q: 'Welche Notenskala soll ich wählen?',
  faq2A: 'Die Skala mit Plus/Minus teilt jeden Buchstaben in Stufen: A+ ab 97 %, A ab 93 %, A- ab 90 % und so weiter bis D- ab 60 %. Die 10-Punkte-Skala nutzt nur ganze Buchstaben: ab 90 % A, ab 80 % B, ab 70 % C, ab 60 % D. Unter 60 % ist es bei beiden ein F. Schulen handhaben das unterschiedlich – richte dich nach den Regeln deiner Schule.',
  faq3Q: 'Hängt die Note vom gerundeten Prozentsatz ab?',
  faq3A: 'Nein. Der Buchstabe ergibt sich immer aus dem genauen Prozentsatz. 89,6 %, als ganze Zahl mit 90 % angezeigt, bleibt ein B+ und wird kein A-. Wähle eine oder zwei Nachkommastellen, um den genauen Wert zu sehen.',
  faq4Q: 'Kann ich nach Punkten statt nach Fragen bewerten?',
  faq4A: 'Ja. Wechsle zu „Punkten“ und gib die Gesamtpunktzahl des Tests und die abgezogenen Punkte ein. Die Rechnung bleibt gleich: erreichte Punkte geteilt durch Gesamtpunkte, mal 100.',
  faq5Q: 'Werden meine Zahlen irgendwo gespeichert?',
  faq5A: 'Nein. Die Note wird in deinem Browser berechnet. Nichts, was du eingibst, wird an unseren Server gesendet, gespeichert oder protokolliert.',
};
