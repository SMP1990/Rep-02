// Grade Calculator, Indonesian.
import type { Strings } from './en';

export const id: Strings = {
  title: 'Kalkulator Nilai - Swift Score',
  subtitle: 'Masukkan jumlah soal dan jumlah jawaban salah untuk langsung melihat skor, persentase, dan nilai huruf. Gratis untuk guru dan siswa.',
  privacy: 'Semua dihitung di perangkat Anda. Apa pun yang Anda ketik tidak dikirim ke mana pun dan tidak disimpan.',

  modeLabel: 'Nilai berdasarkan',
  modeQuestions: 'Soal',
  modePoints: 'Poin',
  totalQuestions: 'Jumlah soal',
  totalPoints: 'Total poin',
  wrongQuestions: 'Jawaban salah',
  wrongPoints: 'Poin hilang',
  addWrong: '+1 salah',
  addHalf: '+½ salah',
  resetWrong: 'Atur ulang',
  totalHint: 'Dari 1 sampai {max}.',

  resultLine: '{score}/{total} = {percent}',
  letterLabel: 'Nilai huruf',

  scaleLabel: 'Skala nilai',
  scaleStandard: 'Plus/minus (A+ sampai F)',
  scaleTen: 'Skala 10 poin (A, B, C, D, F)',
  decimalsLabel: 'Desimal',
  decimals0: 'Bilangan bulat',
  decimals1: '1 angka desimal',
  decimals2: '2 angka desimal',
  halfPoints: 'Izinkan setengah poin (0,5)',
  showChart: 'Tampilkan tabel nilai lengkap',
  shortcuts: 'Mengoreksi setumpuk lembar ujian? Tekan W untuk menambah satu kesalahan dan R untuk lembar berikutnya.',

  chartTitle: 'Tabel nilai',
  colWrong: 'Salah',
  colLost: 'Hilang',
  colScore: 'Skor',
  colPercent: 'Persen',
  colGrade: 'Nilai',

  scaleTitle: 'Rentang nilai huruf',

  moreTools: 'Alat gratis lainnya',

  howTitle: 'Cara memakai kalkulator nilai',
  step1Title: 'Masukkan ukuran tes',
  step1Desc: 'Ketik jumlah soal dalam tes. Menilai dengan poin? Pilih Poin lalu ketik total poin.',
  step2Title: 'Tambahkan jawaban salah',
  step2Desc: 'Ketik jumlah jawaban salah, atau ketuk "+1 salah" (atau tekan W) sekali untuk setiap kesalahan. Aktifkan setengah poin untuk jawaban yang sebagian benar.',
  step3Title: 'Lihat nilainya',
  step3Desc: 'Skor, persentase, dan nilai huruf berubah saat Anda mengetik. Buka tabel nilai untuk melihat semua kemungkinan hasil tes ini sekaligus.',
  faqTitle: 'Pertanyaan yang sering diajukan',
  faq1Q: 'Bagaimana persentase dihitung?',
  faq1A: 'Jumlah jawaban benar dibagi jumlah soal, lalu dikalikan 100. Misalnya, 17 benar dari 20 adalah 17 ÷ 20 = 0,85, yaitu 85%.',
  faq2Q: 'Skala nilai mana yang harus dipilih?',
  faq2A: 'Skala plus/minus membagi setiap huruf menjadi beberapa tingkat: A+ mulai 97%, A mulai 93%, A- mulai 90%, dan seterusnya sampai D- mulai 60%. Skala 10 poin hanya memakai huruf utuh: 90% ke atas A, 80% B, 70% C, 60% D. Di bawah 60% adalah F pada keduanya. Setiap sekolah berbeda, jadi ikuti aturan sekolah Anda.',
  faq3Q: 'Apakah nilai huruf diambil dari persentase yang dibulatkan?',
  faq3A: 'Tidak. Huruf selalu diambil dari persentase yang tepat. Nilai 89,6% yang tampil 90% sebagai bilangan bulat tetap B+, bukan A-. Pilih satu atau dua angka desimal untuk melihat angka pastinya.',
  faq4Q: 'Bisakah menilai dengan poin, bukan soal?',
  faq4A: 'Bisa. Pilih Poin, ketik total poin tes dan poin yang hilang dari siswa. Hitungannya sama: poin yang diperoleh dibagi total poin, dikali 100.',
  faq5Q: 'Apakah angka saya disimpan di suatu tempat?',
  faq5A: 'Tidak. Nilai dihitung di browser Anda. Apa pun yang Anda ketik tidak dikirim ke server kami, tidak disimpan, dan tidak dicatat.',
};
