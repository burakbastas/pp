// Süre dağılımı ve nota okuma düzeyleri. Ünite sırası units.js dosyasında.
export const MINUTES = {
  15: { okuma: 3, teknik: 3, klasik: 4, eslik: 3, san: 2 },
  30: { okuma: 5, teknik: 5, klasik: 10, eslik: 7, san: 3 },
  45: { okuma: 7, teknik: 8, klasik: 15, eslik: 10, san: 5 },
};
export const READ_LEVELS = {
  b1: { title: 'Küçük Do, Fa, orta Do', clef: 'bass', notes: ['c3', 'f3', 'c4'], low: 43, high: 66 },
  b2: { title: 'Dört durak', clef: 'bass', notes: ['g2', 'c3', 'f3', 'c4'], low: 40, high: 66 },
  b3: { title: 'Bütün fa anahtarı portesi', clef: 'bass', notes: ['g2', 'a2', 'b2', 'c3', 'd3', 'e3', 'f3', 'g3', 'a3', 'b3', 'c4'], low: 40, high: 66 },
  b4: { title: 'Alt ek çizgiler', clef: 'bass', notes: ['c2', 'd2', 'e2', 'f2', 'g2', 'a2', 'b2', 'c3', 'd3'], low: 36, high: 55 },
  b5: { title: 'Derin bas ve üst bölge', clef: 'bass', notes: ['c2', 'd2', 'e2', 'f2', 'g2', 'a2', 'b2', 'c3', 'd3', 'e3', 'f3', 'g3', 'a3', 'b3', 'c4', 'd4', 'e4'], low: 36, high: 67 },
  t1: { title: 'Sol anahtarı durakları', clef: 'treble', notes: ['c4', 'g4', 'c5', 'g5'], low: 57, high: 84 },
  t2: { title: 'Bütün sol anahtarı portesi', clef: 'treble', notes: ['c4', 'd4', 'e4', 'f4', 'g4', 'a4', 'b4', 'c5', 'd5', 'e5', 'f5', 'g5', 'a5'], low: 57, high: 84 },
  g1: { title: 'İki anahtar karışık', clef: 'grand', notes: ['g2', 'a2', 'b2', 'c3', 'd3', 'e3', 'f3', 'g3', 'a3', 'b3', 'c4', 'd4', 'e4', 'f4', 'g4', 'a4', 'b4', 'c5', 'd5', 'e5'], low: 40, high: 79 },
  i1: { title: 'Aralık okuma (fa anahtarı)', clef: 'bass', pair: true, notes: ['c3', 'd3', 'e3', 'f3', 'g3'], low: 43, high: 66 },
};
