// Grade Calculator, Spanish.
import type { Strings } from './en';

export const es: Strings = {
  title: 'Calculadora de notas - Swift Score',
  subtitle: 'Escribe el número de preguntas y cuántas están mal para ver al instante la puntuación, el porcentaje y la nota en letra. Gratis para docentes y estudiantes.',
  privacy: 'Todo se calcula en tu dispositivo. Nada de lo que escribes se envía ni se guarda.',

  modeLabel: 'Calificar por',
  modeQuestions: 'Preguntas',
  modePoints: 'Puntos',
  totalQuestions: 'Número de preguntas',
  totalPoints: 'Puntos totales',
  wrongQuestions: 'Respuestas incorrectas',
  wrongPoints: 'Puntos perdidos',
  addWrong: '+1 incorrecta',
  addHalf: '+½ incorrecta',
  resetWrong: 'Reiniciar',
  totalHint: 'De 1 a {max}.',

  resultLine: '{score}/{total} = {percent}',
  letterLabel: 'Nota en letra',

  scaleLabel: 'Escala de notas',
  scaleStandard: 'Con más/menos (A+ a F)',
  scaleTen: 'De 10 puntos (A, B, C, D, F)',
  decimalsLabel: 'Decimales',
  decimals0: 'Número entero',
  decimals1: '1 decimal',
  decimals2: '2 decimales',
  halfPoints: 'Permitir medios puntos (0,5)',
  showChart: 'Mostrar la tabla de notas completa',
  shortcuts: '¿Corrigiendo un montón de exámenes? Pulsa W para sumar un error y R para pasar al siguiente.',

  chartTitle: 'Tabla de notas',
  colWrong: 'Errores',
  colLost: 'Perdidos',
  colScore: 'Puntuación',
  colPercent: 'Porcentaje',
  colGrade: 'Nota',

  scaleTitle: 'Rangos de las notas en letra',

  moreTools: 'Más herramientas gratis',

  howTitle: 'Cómo usar la calculadora de notas',
  step1Title: 'Indica el tamaño del examen',
  step1Desc: 'Escribe cuántas preguntas tiene el examen. ¿Calificas por puntos? Cambia a Puntos y escribe el total de puntos.',
  step2Title: 'Añade las respuestas incorrectas',
  step2Desc: 'Escribe el número de respuestas incorrectas o pulsa "+1 incorrecta" (o la tecla W) una vez por cada error. Activa los medios puntos para respuestas parcialmente correctas.',
  step3Title: 'Lee la nota',
  step3Desc: 'La puntuación, el porcentaje y la nota en letra cambian mientras escribes. Abre la tabla de notas para ver de una vez todos los resultados posibles de este examen.',
  faqTitle: 'Preguntas frecuentes',
  faq1Q: '¿Cómo se calcula el porcentaje?',
  faq1A: 'Se dividen las respuestas correctas entre el total de preguntas y se multiplica por 100. Por ejemplo, 17 correctas de 20 es 17 ÷ 20 = 0,85, es decir, 85 %.',
  faq2Q: '¿Qué escala de notas elijo?',
  faq2A: 'La escala con más/menos divide cada letra en escalones: A+ desde 97 %, A desde 93 %, A- desde 90 %, y así hasta D- desde 60 %. La escala de 10 puntos solo usa letras enteras: 90 % o más es A, 80 % B, 70 % C y 60 % D. Por debajo de 60 % es F en ambas. Cada centro es distinto, así que sigue la norma de tu escuela.',
  faq3Q: '¿La letra se basa en el porcentaje redondeado?',
  faq3A: 'No. La letra siempre sale del porcentaje exacto. Un 89,6 % que se muestra como 90 % con números enteros sigue siendo B+, no A-. Elige uno o dos decimales para ver la cifra exacta.',
  faq4Q: '¿Puedo calificar por puntos en lugar de preguntas?',
  faq4A: 'Sí. Cambia a Puntos y escribe el total de puntos del examen y los puntos que perdió el alumno. El cálculo es el mismo: puntos obtenidos entre puntos totales, por 100.',
  faq5Q: '¿Se guardan mis números en algún sitio?',
  faq5A: 'No. La nota se calcula en tu navegador. Nada de lo que escribes se envía a nuestro servidor, se guarda ni se registra.',
};
