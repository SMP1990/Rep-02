// Grade Calculator, Portuguese.
import type { Strings } from './en';

export const pt: Strings = {
  title: 'Calculadora de notas - Swift Score',
  subtitle: 'Digite o número de questões e quantas estão erradas para ver na hora a pontuação, a porcentagem e o conceito em letra. Grátis para professores e alunos.',
  privacy: 'Tudo é calculado no seu dispositivo. Nada do que você digita é enviado ou salvo.',

  modeLabel: 'Avaliar por',
  modeQuestions: 'Questões',
  modePoints: 'Pontos',
  totalQuestions: 'Número de questões',
  totalPoints: 'Total de pontos',
  wrongQuestions: 'Respostas erradas',
  wrongPoints: 'Pontos perdidos',
  addWrong: '+1 errada',
  addHalf: '+½ errada',
  resetWrong: 'Zerar',
  totalHint: 'De 1 a {max}.',

  resultLine: '{score}/{total} = {percent}',
  letterLabel: 'Conceito em letra',

  scaleLabel: 'Escala de notas',
  scaleStandard: 'Com mais/menos (A+ a F)',
  scaleTen: 'De 10 pontos (A, B, C, D, F)',
  decimalsLabel: 'Casas decimais',
  decimals0: 'Número inteiro',
  decimals1: '1 casa decimal',
  decimals2: '2 casas decimais',
  halfPoints: 'Permitir meio ponto (0,5)',
  showChart: 'Mostrar a tabela de notas completa',
  shortcuts: 'Corrigindo uma pilha de provas? Aperte W para somar um erro e R para passar à próxima.',

  chartTitle: 'Tabela de notas',
  colWrong: 'Erros',
  colLost: 'Perdidos',
  colScore: 'Pontuação',
  colPercent: 'Porcentagem',
  colGrade: 'Conceito',

  scaleTitle: 'Faixas dos conceitos em letra',

  moreTools: 'Mais ferramentas grátis',

  howTitle: 'Como usar a calculadora de notas',
  step1Title: 'Informe o tamanho da prova',
  step1Desc: 'Digite quantas questões a prova tem. Corrige por pontos? Mude para Pontos e digite o total de pontos.',
  step2Title: 'Adicione as respostas erradas',
  step2Desc: 'Digite o número de respostas erradas ou toque em "+1 errada" (ou aperte W) uma vez para cada erro. Ative o meio ponto para respostas parcialmente certas.',
  step3Title: 'Veja a nota',
  step3Desc: 'A pontuação, a porcentagem e o conceito em letra mudam enquanto você digita. Abra a tabela de notas para ver de uma vez todos os resultados possíveis desta prova.',
  faqTitle: 'Perguntas frequentes',
  faq1Q: 'Como a porcentagem é calculada?',
  faq1A: 'As respostas certas são divididas pelo total de questões e multiplicadas por 100. Por exemplo, 17 certas de 20 é 17 ÷ 20 = 0,85, ou seja, 85%.',
  faq2Q: 'Qual escala de notas devo escolher?',
  faq2A: 'A escala com mais/menos divide cada letra em degraus: A+ a partir de 97%, A a partir de 93%, A- a partir de 90%, e assim por diante até D- a partir de 60%. A escala de 10 pontos usa só letras inteiras: 90% ou mais é A, 80% B, 70% C e 60% D. Abaixo de 60% é F nas duas. Cada escola é diferente, então siga a regra da sua.',
  faq3Q: 'A letra vem da porcentagem arredondada?',
  faq3A: 'Não. A letra sempre vem da porcentagem exata. Um 89,6% exibido como 90% em número inteiro continua sendo B+, não A-. Escolha uma ou duas casas decimais para ver o número exato.',
  faq4Q: 'Posso avaliar por pontos em vez de questões?',
  faq4A: 'Sim. Mude para Pontos, digite o total de pontos da prova e os pontos que o aluno perdeu. A conta é a mesma: pontos obtidos divididos pelo total de pontos, vezes 100.',
  faq5Q: 'Meus números ficam salvos em algum lugar?',
  faq5A: 'Não. A nota é calculada no seu navegador. Nada do que você digita é enviado ao nosso servidor, salvo ou registrado.',
};
