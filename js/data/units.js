// Pedagojik harita: 8 ünite, her ünitede beş kol. Sıra, aşağıdan yukarı okunabilirlik ve el bağımsızlığına göre kuruldu.
import { READ_LEVELS } from './curriculum.js';
import { META } from './notes.js';
import { EXERCISE } from './exercises.js';

const BASE = {
  gm: { title: 'Menuet sol minör', composer: 'Christian Petzold, BWV Anh. 115' },
  gM: { title: 'Menuet Sol majör', composer: 'Christian Petzold, BWV Anh. 114' },
  a116: { title: 'Menuet Sol majör', composer: 'Anna Magdalena Defteri, BWV Anh. 116' },
  mel: { title: 'Melodie', composer: 'Robert Schumann, Op. 68/1' },
  prel: { title: 'Prelüd Do majör', composer: 'J. S. Bach, BWV 846' },
};

export const STRANDS = [
  { id: 'okuma', name: 'Okuma', note: 'Notayı tuşa çevirme hızı' },
  { id: 'etut', name: 'Etüt', note: 'Parmak ve iki el teknik' },
  { id: 'eser', name: 'Eser', note: 'Gerçek parçalar' },
  { id: 'eslik', name: 'Eşlik', note: 'Akor ve şarkı' },
  { id: 'san', name: 'Şan', note: 'Vokal alıştırmalar' },
];

const read = (level, why) => ({ kind: 'read', level, title: READ_LEVELS[level].title, why });
const sight = (level, hands, title, why) => ({ kind: 'sight', level, hands, title, why });
const ex = (id, why, how, tempo) => ({ kind: 'ex', ex: id, why, how, tempo });
const eser = (piece, why, from = 0, to = null, suffix = '') => ({ kind: 'piece', piece, from, to, why, suffix });
const voc = (e, title, why, keys = 3) => ({ kind: 'voc', ex: e, title, why, keys });

// Eşlik dersleri hep aynı sırayla ilerler: akoru tanı, sol el, sağ el, iki el yavaş, tempoda, kalıp.
function ak(id, title, why, chords, chart, opts = {}) {
  const { pattern = 'tam', tempo = 60, slow = 48, tips = {} } = opts;
  const P = opts.next || null;
  const steps = [
    { t: 'Akorları tanı', quiz: chords, hint: 'Akor adını gör, tuşlara bas. Hangi oktavda bastığın önemli değil.' },
    { t: 'Sol el: kökler', hands: 'lh', pattern, tempo: slow, hint: tips.lh || 'Sadece sol eli çal. Her ölçüde akorun adı olan notaya bas. Akor adını yüksek sesle söyle.' },
    { t: 'Sağ el: akorlar', hands: 'rh', pattern, tempo: slow, hint: tips.rh || 'Sadece sağ el. Parmaklar 1-3-5. Bir sonraki akoru vuruştan önce düşün.' },
    { t: 'İki el, yavaş', hands: 'both', pattern, tempo: slow, hint: 'İki eli birlikte çal. Takılırsan tempoyu düşür, ama durma.' },
    { t: 'Tempoda', hands: 'both', pattern, tempo, hint: 'Metronomla, durmadan. Üç temiz tekrar yap.' },
  ];
  if (P) steps.push({ t: P.t, hands: 'both', pattern: P.pattern, tempo: P.tempo, hint: P.hint });
  return { kind: 'ak', id, title, why, chords, chart, steps };
}

export const UNITS = [
  { n: 1, name: 'Fa anahtarı ve beş parmak', level: 'Başlangıç',
    aim: 'Sol elin notasını tuşa bakmadan bulmaya başla. Bildiğin Menuet’i ezberden değil porteden çal.',
    topics: ['Fa anahtarında dört durak nota', 'Sol elde Do konumu', 'İki el paralel ve zıt', 'İlk üç akor', 'Mırıltı ve beşli'],
    items: {
      okuma: [read('b1', 'Küçük Do, Fa, orta Do. Sol el notasının temeli.'), ex('lh01', 'Üç durağı klavyede bul.', ['Bir kez nota adlarını söyle.', 'Söyleyerek çal.', 'Klavyeye bakmadan dene.']), read('b2', 'Kalın Sol’u ekle.'), ex('lh02', 'Beş parmak, beş nota.', ['Her notada aralığı oku: adım mı, atlama mı?']), ex('lh03', 'Tanıdık ezgi, yanlışı kulağına söyletir.', ['Bu ezgiyi porteden okuyarak çal.', 'Noktalı dörtlüğe dikkat.'])],
      etut: [ex('bi01', 'Eller aynı notaları, ters parmak numaralarıyla çalar.', ['Önce her el ayrı.', 'İki eli aynı anda duyacak kadar yavaş.']), ex('bi02', 'Ayna hareket: aynı numaralı parmaklar birlikte iner.', ['Başparmaklar içeride başlar.'])],
      eser: [ex('ode2', 'Sağ el ezgi, sol el basit eşlik. İlk iki elli parça.', ['Sol eli tek başına oturt.', 'Sağ el zaten biliyor.']), ex('frere', 'Bir el başlar, öteki iki ölçü sonra girer.', ['Eller aynı ezgiyi çalar, sadece zaman farkıyla.']), eser('gm', 'Ezberden biliyorsun. Burada amaç porteden okumak.', 0, 16, ', 1. kısım')],
      eslik: [ak('e1', 'İlk üç akor: Do, Fa, Sol', 'Bir akor üç sestir: kök, üçlü, beşli. Şarkıların çoğu bu üç akorla başlar.', ['C', 'F', 'G'], 'C | F | G | C'), ak('e2', 'Minör akorlar: Lam, Rem, Mim', 'Majörün orta sesini yarım ton indir: minör olur. Türkçe şarkıların çoğu minördür.', ['Am', 'Dm', 'Em'], 'Am | Dm | Em | Am')],
      san: [voc('mirilti', 'Üçlü mırıltı', 'Sesini açan alıştırmayı kendin çal.'), voc('besli', 'Beşli legato', 'Şan dersindeki beşliyi iki elle çal.')],
    }, pdf: [['Beyer, Op. 101', 'https://imslp.org/wiki/Vorschule_im_Klavierspiel,_Op.101_(Beyer,_Ferdinand)']] },
  { n: 2, name: 'Sol el yürüyor', level: 'Başlangıç',
    aim: 'Sol el konum değiştirsin. Menuet’in ikinci kısmını okuyarak bitir.',
    topics: ['Fa anahtarının tamamı', 'Sol ve Fa konumları', 'İki elde el değiştirme', 'Do majör dizi', 'Pop dörtlüsü I–V–vi–IV'],
    items: {
      okuma: [read('b3', 'Portenin tamamı, Sol’dan orta Do’ya.'), ex('lh04', 'El alt çizgilere iniyor.', ['Kalın Sol’dan başla: 5. parmak.']), ex('lh05', 'Basit ezgi, alt porte.', ['Klavyeye bakmadan dene.']), ex('lh06', 'Çizgiden çizgiye geçiş üçlüdür.', ['Nota adı yerine “adım, atlama” diyerek çal.'])],
      etut: [ex('bi03', 'Bir el sorar, öteki yanıtlar.', ['Metronomla çal.', 'Susta öteki elin yerini hazırla.']), ex('sc_c', 'Başparmak altından geçiş.', ['Sağ el 1-2-3-1.', 'Sol el 1’den sonra 3.'])],
      eser: [eser('gm', 'İkinci kısımda sol el daha hareketli, sağ el sıçrıyor.', 16, 32, ', 2. kısım'), eser('gM', 'Eş parça. Sol el burada daha ince yazılmış.', 0, 16, ', 1. kısım')],
      eslik: [ak('e3', 'Popun dörtlüsü: I–V–vi–IV', 'Dört akor binlerce şarkının iskeletidir. Do, Sol, Lam, Fa.', ['C', 'G', 'Am', 'F'], 'C | G | Am | F', { pattern: 'yarim', tempo: 66, slow: 50 }), ak('e4', 'Minör kadans: Lam, Rem, Mi', 'Mi majör, minör şarkıyı eve döndüren akordur.', ['Am', 'Dm', 'E'], 'Am | Dm | E | Am', { pattern: 'yarim', tempo: 66, slow: 50 })],
      san: [voc('stakato5', 'Beşli stakato', 'Sağ el kısa ve hafif, sol el uzun tutar.'), voc('besli', 'Beşli: tonları yürüt', 'Yarım ton yukarı geçmeyi öğren.', 5)],
    }, pdf: [['Beyer, Op. 101', 'https://imslp.org/wiki/Vorschule_im_Klavierspiel,_Op.101_(Beyer,_Ferdinand)']] },
  { n: 3, name: 'Elleri ayır', level: 'Geç başlangıç',
    aim: 'Bir el bağlı, öteki kısa; bir el tutar, öteki yürür.',
    topics: ['Alt ek çizgiler', 'Legato ve stakato ayrımı', 'İlk deşifre', 'Çevrimler: elini zıplatma', 'Stakato arpej'],
    items: {
      okuma: [read('b4', 'Bas akorlarının yaşadığı bölge.'), ex('lh07', 'Si bemolü donanımdan oku.', ['Ek çizgideki Fa’yı kalın Sol’dan say.']), ex('lh08', 'Sol el üç konumda dolaşır.', ['Sus sırasında elini taşı.']), sight(1, 'lh', 'Deşifre: sol el', 'Görmediğin notayı durmadan çal.')],
      etut: [ex('bi04', 'Uzun notayı tutarken öteki el rahat kalsın.', ['Tutan parmak basılı, omuz gevşek.']), ex('bi05', 'Asıl bağımsızlık burada başlar.', ['Sol stakato, sağ legato. Çok yavaş.'], 54), ex('bi06', 'Aynı beceri, eller yer değiştirdi.', ['Şan eşliklerinde bu beceri lazım.'], 54)],
      eser: [eser('gM', 'İkinci kısım, La majöre dolaşır.', 16, 32, ', 2. kısım'), eser('a126', 'Sol el oktav sıçramaları ve el değişimi.'), eser('mel', 'Sol el sürekli sekizlik, sağ el şarkı söyler. Sol el burada sol anahtarıyla yazılır.')],
      eslik: [ak('e5', 'Çevrim: akorları yakınlaştır', 'Sağ eli zıplatmadan en yakın çevrime geç. Eşliğin profesyonel duyulmasının ana sırrı.', ['C', 'G', 'Am', 'F'], 'C | G | Am | F', { pattern: 'yarim', tempo: 72, slow: 50, tips: { rh: 'Ortak notayı yerinde bırak. Do majörden Sol majöre geçerken Sol notası kalır.' } }), ak('e6', 'Sağ el dörtlük ritim', 'Sol el tutar, sağ el her vuruşta akor basar.', ['C', 'G', 'Am', 'F'], 'C | G | Am | F', { pattern: 'balad', tempo: 76, slow: 54 })],
      san: [voc('arpejStak', 'Stakato arpej', 'Söyleyeceğin arpeji piyanoda kısa çal.'), voc('legatoStak', 'Önce bağlı, sonra kısa', 'Aynı ezgi iki karakterde.')],
    }, pdf: [['Czerny, Op. 599', 'https://imslp.org/wiki/Practical_Exercises_for_Beginners,_Op.599_(Czerny,_Carl)']] },
  { n: 4, name: 'İki anahtar birlikte', level: 'Geç başlangıç',
    aim: 'İki porteyi aynı anda oku. Sol elde kalıp kur.',
    topics: ['İki porte karışık', 'İkiye karşı bir', 'Sol ve La minör dizileri', 'Sol el kök ve beşli', 'Sol el akorla ton yürütme'],
    items: {
      okuma: [read('t1', 'Sol anahtarı duraklarını da oturt.'), read('g1', 'İki porte arasında gözü taşı.'), ex('lh09', 'Eşlikte kullanacağın bas kalıpları.', ['Akor adını söyle, sonra çal.']), sight(2, 'both', 'Deşifre: eller sırayla', 'Gözün iki porte arasında dolaşsın.')],
      etut: [ex('bi07', 'İkiye karşı bir.', ['Say: bir-ve-iki-ve.'], 54), ex('bi08', 'Elleri değiştir.', ['Sol el koşmasın.'], 54), ex('sc_g', 'Fa diyez ve geçiş.', ['Do majörle aynı parmaklar.']), ex('sc_am', 'Minör şarkıların dizisi.', ['Sol diyez, yedinci ses.'])],
      eser: [eser('a113', 'Menuetlerin en akıcısı.'), eser('a116', 'Sol elde sekizlik kırık akorlar.'), eser('a119', 'Sol minörde, noktalı ritim.'), eser('s2', 'Stakato ve akor. Sol elin karakteri sağ elden ayrı.')],
      eslik: [ak('e7', 'Sol el kök ve beşli', 'Sol elin pop ayağı: 1. vuruşta kök, 3. vuruşta beşli.', ['C', 'G', 'Am', 'F'], 'C | G | Am | F', { pattern: 'kokbes', tempo: 76, slow: 54, tips: { lh: 'Sol el 5. parmakla kök, 2. parmakla beşli.' } }), ak('e8', 'Sekizlik pop', 'Sağ el eşit sekizlikler. Bilek küçük hareketlerle sekiyor.', ['C', 'G', 'Am', 'F'], 'C | G | Am | F', { pattern: 'pop8', tempo: 84, slow: 60, tips: { lh: 'Sol el oktav: 5 ve 1.' } })],
      san: [voc('oktav', 'Oktav ve iniş', 'Üst notayı hazırla.'), voc('besli', 'Tonları sol el akorla yürüt', 'Hazırlık akorlarıyla tonlar arasında geç.', 6)],
    }, pdf: [['Czerny, Op. 599', 'https://imslp.org/wiki/Practical_Exercises_for_Beginners,_Op.599_(Czerny,_Carl)']] },
  { n: 5, name: 'Akorla düşün', level: 'Erken orta',
    aim: 'Sol el kalıplarını oturt, şarkıyı akor olarak duy.',
    topics: ['Aralık okuma', 'Parmak eşitliği', 'Sol el arpej', 'Düm-tek ve vals', 'Sonatin girişi'],
    items: {
      okuma: [read('i1', 'İki nota arası uzaklıkla oku.'), read('t2', 'Sol anahtarının tamamı.'), ex('lh10', 'Menuet’in tonunda bas yürüyüşü.', ['Fa diyez yeden sestir.']), sight(3, 'both', 'Deşifre: iki el birlikte', 'Durmamak doğru notadan önemli.')],
      etut: [ex('hanon1', 'Parmak eşitliği. Üç dakikayı geçme.', ['Parmakları yüksek kaldırma.'], 56), ex('bi09', 'Sağ el vuruşların arasına düşer.', ['Senkop eşliğin hazırlığı.'], 56), ex('sc_gm', 'Menuet’in tonu.', ['Fa diyez, Mi bemol, Si bemol.'])],
      eser: [eser('s3', 'İki el kısa kısa konuşur.'), eser('s5', 'Bağlı küçük cümleler.'), eser('s6', 'Sağ el şarkı, sol el akor.'), eser('b1', 'Burgmüller’in ilk etüdü: açık, bağlı sekizlikler.'), eser('cle1', 'Sonatin formuyla tanışma.')],
      eslik: [ak('e9', 'Sol el arpej (balad)', 'Baladların sol eli: 1-5-8-5.', ['C', 'Am', 'F', 'G'], 'C | Am | F | G', { pattern: 'arpej', tempo: 72, slow: 52, tips: { lh: 'Elin yayılsın, bilek yuvarlansın.' } }), ak('e10', 'Vals: üç vuruş', 'Birinci vuruş ağır, öteki ikisi hafif.', ['Am', 'Dm', 'E'], 'Am | Dm | E | Am', { pattern: 'vals', tempo: 96, slow: 66 }), ak('e11', 'Düm-tek ve inen dizi', 'Sol el düm, sağ el tek. Lam, Sol, Fa, Mi.', ['Am', 'G', 'F', 'E'], 'Am | G | F | E', { pattern: 'dumtek', tempo: 84, slow: 60, tips: { rh: 'Önce avuçla masaya vur: düm tek, tek düm, tek.' } })],
      san: [voc('arpejLegato', 'Bağlı arpej', 'Geniş aralık, tek çizgi.', 4)],
    }, pdf: [['Czerny, Op. 139', 'https://imslp.org/wiki/100_Progressive_Studies,_Op.139_(Czerny,_Carl)']] },
  { n: 6, name: 'Polifoniye giriş', level: 'Erken orta',
    aim: 'İki eli iki ayrı ses gibi duy.',
    topics: ['Derin bas okuma', 'Küçük Prelüdler', 'Czerny etütleri', 'Senkop', 'Kırık sağ el'],
    items: {
      okuma: [read('b5', 'Oktav aşağısı: Do2’ye kadar.'), sight(4, 'both', 'Deşifre: ritimli', 'Sekizlik ve noktalı.')],
      etut: [eser('cz1', 'Sekiz ölçülük etüt, sağ elde akıcılık.'), eser('cz2', 'Üç vuruşlu etüt.'), ex('sc_f', 'Sağ elde farklı parmak.', ['Sağ el 1-2-3-4-1.']), ex('sc_dm', 'Minör repertuvarda sık ton.', ['Do diyez, Si bemol.'])],
      eser: [eser('p939', 'Bach’ın en kısa prelüdlerinden.'), eser('p941', 'Üç vuruşlu, iki sesli.'), eser('s7', 'Stakato ve zıplama.'), eser('b3', 'Altı sekizlik, sakin sol el.'), eser('b5', 'Masum, süslü sağ el.'), eser('t16', 'Sol minörde şarkı.')],
      eslik: [ak('e12', '3+3+2 senkop', 'Popun yürüyen ritmi. İkinci akor erken gelir.', ['C', 'G', 'Am', 'F'], 'C | G | Am | F', { pattern: 'senkop', tempo: 80, slow: 56, tips: { rh: 'Önce say: 1-2-3, 1-2-3, 1-2.' } }), ak('e13', 'Kırık sağ el', 'Akorları tek tek dağıt.', ['Am', 'F', 'C', 'G'], 'Am | F | C | G', { pattern: 'kirik', tempo: 72, slow: 52 })],
      san: [voc('dokuzlu', 'Dokuzlu çeviklik', 'Sağ elde başparmak geçişi.', 2)],
    }, pdf: [['Burgmüller, Op. 100', 'https://imslp.org/wiki/25_%C3%89tudes_Faciles,_Op.100_(Burgm%C3%BCller,_Friedrich)']] },
  { n: 7, name: 'İki ses, iki karakter', level: 'Orta',
    aim: 'Bach invansiyonlarıyla iki eli eşit kullan.',
    topics: ['İnvansiyon', 'Burgmüller karakter parçaları', 'Yedili akorlar', '6/8 balad', 'Messa di voce'],
    items: {
      okuma: [sight(4, 'both', 'Deşifre: iki el', 'Her gün yeni parça.')],
      etut: [eser('cz3', 'Sol elde kalıp, sağ elde akış.'), ex('bi10', 'Sol elde klasik eşlik.', ['Beşinci parmak ağır, öteki notalar hafif.'])],
      eser: [eser('inv1', 'Tema iki elde dolaşır.'), eser('inv8', 'Canlı üç vuruş.'), eser('b4', 'Bağlı iki ses.'), eser('b8', 'Süsleme ve zarafet.'), eser('s10', 'Sol elde ezgi.'), eser('t5', 'Marş karakteri.')],
      eslik: [ak('e14', 'Yedili akorlar: ii–V–I', 'Dm7’den G7’ye iki nota sabit kalır.', ['Dm7', 'G7', 'Cmaj7'], 'Dm7 | G7 | Cmaj7 | Cmaj7', { pattern: 'balad', tempo: 72, slow: 52 }), ak('e15', '6/8 balad', 'İki büyük vuruş.', ['C', 'Am', 'Dm', 'G'], 'C | Am | Dm | G', { pattern: 'balad68', tempo: 60, slow: 44 })],
      san: [voc('messa', 'Messa di voce', 'Tek notada sesi büyüt ve küçült.', 4)],
    }, pdf: [['Burgmüller, Op. 100', 'https://imslp.org/wiki/25_%C3%89tudes_Faciles,_Op.100_(Burgm%C3%BCller,_Friedrich)']] },
  { n: 8, name: 'Kendi repertuvarın', level: 'Orta',
    aim: 'Kendi şarkını akorla çal, kendine eşlik et.',
    topics: ['Bach Prelüd', 'Uzun etüt', 'Beşliler döngüsü', '9/8 aksak', 'Kendi şarkın'],
    items: {
      okuma: [sight(4, 'both', 'Deşifre: serbest', 'Haftada birkaç kez.')],
      etut: [ex('hanon1', 'Isınma olarak devam et.', ['Her gün iki dakika.'], 72)],
      eser: [{ kind: 'prelude', title: 'Bach Prelüd: akor hali', why: 'Parçayı önce uyumları olarak oku. Klasik ve eşlik burada buluşur.' }, eser('prel', 'Aynı uyumlar, kırık kalıp.'), eser('inv13', 'Minörde iki ses.'), eser('b10', 'Sağ elde akor, sol elde şarkı.'), eser('b15', 'Uzun ve dramatik.'), eser('s18', 'Altı sekizlik.')],
      eslik: [ak('e16', 'Beşliler döngüsü', 'Uzun minör nakarat. Kök her seferinde dörtlü çıkar.', ['Am', 'Dm', 'G', 'C', 'F', 'Bdim', 'E'], 'Am | Dm | G | C | F | Bdim | E | Am', { pattern: 'kokbes', tempo: 72, slow: 52 }), ak('e17', 'Alberti eşlik', 'Klasik kalıp, pop tonlar.', ['C', 'Am', 'F', 'G'], 'C | Am | F | G', { pattern: 'alberti', tempo: 69, slow: 50 }), ak('e18', '9/8 aksak', 'Gruplar 2+2+2+3. Son grup uzun.', ['Am', 'G'], 'Am | Am | G | Am', { pattern: 'aksak98', tempo: 96, slow: 66 }), { kind: 'studio', title: 'Kendi şarkın', why: 'Sevdiğin şarkının akorlarını yaz, sesine uygun tona kaydır, kendine eşlik et.' }],
      san: [voc('legatoStak', 'Tam ısınma', 'Bütün aralığını yürüt, sonra çalarak söyle.', 8)],
    } },
];

// Kimlik ata, düz liste oluştur
export const ITEMS = [];
for (const u of UNITS) for (const s of STRANDS) {
  (u.items[s.id] || []).forEach((it, i) => {
    it.unit = u.n; it.strand = s.id;
    it.id = `u${u.n}-${s.id}-${i}`;
    if (it.kind === 'piece') {
      const m = META[it.piece] || BASE[it.piece];
      it.title = m.title + (it.suffix || ''); it.composer = m.composer;
    }
    if (it.kind === 'ex') it.title = EXERCISE[it.ex].title;
    ITEMS.push(it);
  });
}
// Her ünitenin sonunda final: okuma, akor ve çalma sınavı
for (const u of UNITS) {
  const here = ITEMS.filter(x => x.unit === u.n);
  const reads = here.filter(x => x.kind === 'read');
  const level = reads.length ? reads[reads.length - 1].level : 'g1';
  const chords = [...new Set(here.filter(x => x.kind === 'ak').flatMap(x => x.chords))];
  const pieces = here.filter(x => x.kind === 'piece' && x.strand === 'eser');
  const perf = pieces[pieces.length - 1] || pieces[0];
  const f = { kind: 'final', id: `u${u.n}-final`, unit: u.n, strand: 'final', title: `Ünite ${u.n} finali`, why: 'Okuma, akor ve çalma. Geçtiğinde ünite tamamlanır.', level, chords, perf };
  ITEMS.push(f);
  u.final = f;
}
// Yol sırası: kollar birer birer sırayla gelir, en sonda final
export function pathOf(n) {
  const here = ITEMS.filter(x => x.unit === n && x.strand !== 'final');
  const lists = STRANDS.map(s => here.filter(x => x.strand === s.id));
  const out = [];
  for (let i = 0; lists.some(l => l[i]); i++) lists.forEach(l => { if (l[i]) out.push(l[i]); });
  return out;
}
export const TITLES = [
  { at: 0, name: 'Mübtedî', mean: 'Yeni başlayan' },
  { at: 1, name: 'Heveskâr', mean: 'Müziğe gönül vermiş' },
  { at: 3, name: 'Mutavassıt', mean: 'Orta seviyeye ulaşmış' },
  { at: 5, name: 'Mûsikişinas', mean: 'Müzikten anlayan' },
  { at: 7, name: 'Müntehî', mean: 'İleri seviyeye ulaşmış' },
  { at: 8, name: 'Üstat', mean: 'Bütün üniteleri bitirmiş' },
];
export const itemById = (id) => ITEMS.find(x => x.id === id);
