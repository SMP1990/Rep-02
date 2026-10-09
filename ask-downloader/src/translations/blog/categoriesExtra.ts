import { CategoryTranslationMap } from './types.ts';

/** Category names for languages that had none, plus the few categories the
 *  original five maps were missing. Admin-created categories show as typed. */
export const EXTRA_CATEGORIES: Record<string, CategoryTranslationMap> = {
  pt: { All: 'Todos os artigos', Guides: 'Guias e tutoriais', 'Tech & Formats': 'Tecnologia e formatos', 'Tips & Tricks': 'Dicas e truques', Travel: 'Viagens', Gaming: 'Games', Fashion: 'Moda e estilo', Politics: 'Política e notícias', Tech: 'Tecnologia e design', Sports: 'Esportes', Food: 'Culinária', Announcements: 'Anúncios', Audio: 'Áudio', General: 'Geral', Mobile: 'Celular', Privacy: 'Privacidade' },
  fr: { All: 'Tous les articles', Guides: 'Guides et tutoriels', 'Tech & Formats': 'Technologie et formats', 'Tips & Tricks': 'Astuces', Travel: 'Voyages', Gaming: 'Jeux vidéo', Fashion: 'Mode et style', Politics: 'Politique et actualités', Tech: 'Technologie et design', Sports: 'Sport', Food: 'Cuisine', Announcements: 'Annonces', Audio: 'Audio', General: 'Général', Mobile: 'Mobile', Privacy: 'Confidentialité' },
  de: { All: 'Alle Artikel', Guides: 'Anleitungen', 'Tech & Formats': 'Technik & Formate', 'Tips & Tricks': 'Tipps & Tricks', Travel: 'Reisen', Gaming: 'Gaming', Fashion: 'Mode & Stil', Politics: 'Politik & Nachrichten', Tech: 'Technik & Design', Sports: 'Sport', Food: 'Essen & Kochen', Announcements: 'Ankündigungen', Audio: 'Audio', General: 'Allgemein', Mobile: 'Mobil', Privacy: 'Datenschutz' },
  id: { All: 'Semua Artikel', Guides: 'Panduan & Tutorial', 'Tech & Formats': 'Teknologi & Format', 'Tips & Tricks': 'Tips & Trik', Travel: 'Wisata', Gaming: 'Gim', Fashion: 'Mode & Gaya', Politics: 'Politik & Berita', Tech: 'Teknologi & Desain', Sports: 'Olahraga', Food: 'Kuliner', Announcements: 'Pengumuman', Audio: 'Audio', General: 'Umum', Mobile: 'Ponsel', Privacy: 'Privasi' },
  ru: { All: 'Все статьи', Guides: 'Руководства', 'Tech & Formats': 'Технологии и форматы', 'Tips & Tricks': 'Советы и хитрости', Travel: 'Путешествия', Gaming: 'Игры', Fashion: 'Мода и стиль', Politics: 'Политика и новости', Tech: 'Технологии и дизайн', Sports: 'Спорт', Food: 'Кулинария', Announcements: 'Объявления', Audio: 'Аудио', General: 'Общее', Mobile: 'Мобильные', Privacy: 'Конфиденциальность' },
  ur: { Audio: 'آڈیو', General: 'عمومی', Mobile: 'موبائل', Privacy: 'رازداری' },
  ar: { Audio: 'الصوت', General: 'عام', Mobile: 'الجوال', Privacy: 'الخصوصية' },
  es: { Audio: 'Audio', General: 'General', Mobile: 'Móvil', Privacy: 'Privacidad' },
  hi: { Audio: 'ऑडियो', General: 'सामान्य', Mobile: 'मोबाइल', Privacy: 'गोपनीयता' },
  ja: { Audio: 'オーディオ', General: '一般', Mobile: 'モバイル', Privacy: 'プライバシー' },
};
