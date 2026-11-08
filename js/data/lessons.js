// Her ünitenin başındaki kısa ders: birkaç kart ve "Anladım mı?" soruları.
// staff: porte örneği, chord: tuşlu akor çizimi
const S = (rh, lh, extra = {}) => ({ rh, lh, key: 0, time: [4, 4], ...extra });

export const LESSONS = {
  1: { cards: [
    { h: 'Fa anahtarı neyi gösterir?', p: 'Sol elin notaları fa anahtarıyla yazılır. Anahtarın iki noktası bir çizgiyi sarar: o çizgi Fa’dır. Portedeki diğer notaları buradan sayarak bulursun.', staff: S(undefined, 'f3:1') },
    { h: 'Dört durak nota', p: 'Bütün notaları ezberleme. Şu dördünü öğren: en alt çizgi kalın Sol, ikinci aralık küçük Do, dördüncü çizgi Fa, portenin hemen üstü orta Do. Geri kalan her nota bir durağa yakındır.', staff: S(undefined, 'g2:4 c3 f3 c4') },
    { h: 'Sol elde parmaklar', p: 'Başparmak 1, serçe parmak 5. Sağ elde parmak numarası yukarı doğru artar; sol elde aşağı doğru artar. Do konumunda serçe parmak küçük Do’da, başparmak Sol’dadır.', staff: S(undefined, 'c3:4_5 d3_4 e3_3 f3_2 | g3:1_1') },
    { h: 'Akor üç sestir', p: 'Bir notanın üstüne bir atlayarak iki nota daha koy: kök, üçlü, beşli. Do, Mi, Sol birlikte Do majör akorudur. Akorun adı kök notasından gelir.', chord: 'C' },
    { h: 'Bu ünitede', p: 'Önce notayı bul, sonra söyleyerek çal, en son klavyeye bakmadan çal. Sen şan öğrencisisin; notayı söylemek senin en güçlü aracın.' },
  ], quiz: [
    { q: 'Fa anahtarının iki noktası arasındaki çizgi hangi notadır?', a: ['Do', 'Fa', 'Sol'], ok: 1, why: 'Anahtarın adı buradan gelir: iki nokta Fa çizgisini sarar.' },
    { q: 'Do majör akoru hangi notalardan oluşur?', a: ['Do, Re, Mi', 'Do, Fa, La', 'Do, Mi, Sol'], ok: 2, why: 'Kök, üçlü, beşli: Do, Mi, Sol.' },
    { q: 'Sol elde 5. parmak hangisidir?', a: ['Başparmak', 'Orta parmak', 'Serçe parmak'], ok: 2, why: 'İki elde de başparmak 1, serçe parmak 5’tir.' },
  ] },
  2: { cards: [
    { h: 'Adım mı, atlama mı?', p: 'Notayı adıyla okumak yavaştır. Aralığa bak: çizgiden hemen üstteki aralığa gitmek bir adımdır (ikili). Çizgiden bir sonraki çizgiye gitmek atlamadır (üçlü).', staff: S(undefined, 'c3:4 d3 c3 e3') },
    { h: 'Konum değiştirmek', p: 'Beş parmak beş nota kapsar. Ezgi bu beş notanın dışına taşınca el kayar. Konum değişikliğini susta ya da uzun notada yap, gözün portede kalsın.', staff: S(undefined, 'c3:4_5 e3_3 g3:2_1 | g2:4_5 b2_3 d3:2_1') },
    { h: 'Dizide başparmak geçişi', p: 'Do majör dizide sağ el 1-2-3 çalar, başparmak üçüncü parmağın altından geçer, sonra 1-2-3-4-5 devam eder. Sol elde çıkarken 5-4-3-2-1, sonra üçüncü parmak başparmağın üstünden geçer.', staff: S('c4:4_1 d4_2 e4_3 f4_1 | g4_2 a4_3 b4_4 c5_5', undefined) },
    { h: 'Akorlara rakam vermek', p: 'Dizinin her notası üzerine bir akor kurulabilir. Do majörde I Do, IV Fa, V Sol, vi La minördür. I–V–vi–IV dizisi her tonda aynı duyulur; öğrendiğin şarkıları başka tona böyle taşırsın.', chord: 'Am' },
  ], quiz: [
    { q: 'Bir çizgiden bir sonraki çizgiye geçmek hangi aralıktır?', a: ['İkili', 'Üçlü', 'Beşli'], ok: 1, why: 'Arada bir aralık kalır: üç nota sayılır.' },
    { q: 'Do majörde vi hangi akordur?', a: ['Fa', 'La minör', 'Sol'], ok: 1, why: 'Dizinin altıncı notası La; üstüne kurulan akor La minördür.' },
    { q: 'Konum değiştirmek için en iyi an hangisidir?', a: ['Sus ya da uzun notada', 'Hızlı geçitte', 'Akorun tam ortasında'], ok: 0, why: 'El, zaman olan yerde kaymalı.' },
  ] },
  3: { cards: [
    { h: 'Legato ve stakato', p: 'Legatoda bir parmak kalkarken öteki iner, sesler bağlanır; notaları bir yay birleştirir. Stakatoda notanın başında nokta vardır: tuşa değ ve bilekten sekerek bırak.', staff: S('c4:4_1( d4_2 e4_3 f4_4) | g4_5! e4_3! c4:2_1!', undefined, { noNames: true }) },
    { h: 'Eller iki ayrı kişi', p: 'Bir el bağlı, öteki kısa çalarken beynin iki eli ayrı yönetmeyi öğrenir. Önce her eli ayrı oturt, sonra çok yavaş birleştir. Hızlanmak en sona kalır.', staff: S('c4:4_1( d4_2 e4_3 f4_4 | g4:1_5)', 'c3:4_5! g3_1! e3_3! g3_1! | c3:1_5') },
    { h: 'Ek çizgiler', p: 'Porteye sığmayan notalar kısa çizgilerle yazılır. Kalın Sol’un bir altı Fa, onun altı Mi. Durak notadan aşağı say.', staff: S(undefined, 'g2:4 f2 e2 d2 | c2:1') },
    { h: 'Çevrim', p: 'Aynı akorun notalarını başka sırayla dizebilirsin: Do Mi Sol, Mi Sol Do, Sol Do Mi. Hepsi Do majördür. Eşlikte elini zıplatmamak için bir sonraki akorun en yakın çevrimini seçersin.', staff: S('<c4 e4 g4>:2 <e4 g4 c5>:2 | <g4 c5 e5>:1', undefined) },
  ], quiz: [
    { q: 'Notanın başındaki nokta ne demektir?', a: ['Uzun tut', 'Kısa ve ayrık çal', 'Yüksek sesle çal'], ok: 1, why: 'Stakato: kısa, bilekten.' },
    { q: 'Mi, Sol, Do hangi akordur?', a: ['Do majör', 'Mi minör', 'La minör'], ok: 0, why: 'Notalar Do, Mi, Sol’dür; sadece sırası değişmiştir.' },
    { q: 'İki eli birleştirmeden önce ne yapmalısın?', a: ['Tempoyu artırmak', 'Her eli ayrı oturtmak', 'Pedala basmak'], ok: 1, why: 'Ayrı ayrı oturmayan iki el birleşince dağılır.' },
  ] },
  4: { cards: [
    { h: 'İki porteyi birlikte okumak', p: 'Gözün notaları tek tek değil, dikey okur: aynı anda basılacak notalar alt alta yazılır. Önce üst üste gelen notaları bul, sonra aradaki hareketi oku.', staff: S('e4:2 g4:2 | f4:1', 'c3:2 e3:2 | d3:1') },
    { h: 'İkiye karşı bir', p: 'Bir el iki nota çalarken öteki bir nota çalar. Yüksek sesle say: bir ve iki ve. Dörtlükler sayılara, sekizlikler “ve”lere düşer.', staff: S('c4:8 d4 e4 f4 g4 f4 e4 d4', 'c3:4 e3 g3 e3') },
    { h: 'Minör dizide yedinci ses', p: 'La minörde dizi La’dan La’ya beyaz tuşlarla gider. Armonik minörde yedinci ses yarım ton çıkar: Sol diyez. Bu yüzden Mi majör akoru La minöre güçlü bir dönüş verir.', staff: S('a4:4 b4 c5 d5 | e5 f5 g#5 a5', undefined) },
    { h: 'Sol elde kök ve beşli', p: 'Akorun kökünü serçe parmakla, beşliyi başparmakla çal. Tek elle hem bası hem de hareketi verirsin; şarkıların sol eli böyle başlar.', staff: S(undefined, 'c3:2_5 g3:2_1 | a2:2_5 e3:2_1') },
  ], quiz: [
    { q: 'La armonik minörde yedinci ses hangisidir?', a: ['Sol', 'Sol diyez', 'Fa diyez'], ok: 1, why: 'Yedinci ses yarım ton yükselir.' },
    { q: 'Sol elde kök ve beşlide kök genellikle hangi parmakla çalınır?', a: ['5', '3', '1'], ok: 0, why: 'Serçe parmak bası verir.' },
    { q: 'Dörtlüğe karşı sekizlik çalarken “ve” kelimesine ne düşer?', a: ['Dörtlük', 'İkinci sekizlik', 'Sus'], ok: 1, why: 'Sayılar dörtlüklere, “ve”ler aradaki sekizliklere gelir.' },
  ] },
  5: { cards: [
    { h: 'Arpej: akoru dağıtmak', p: 'Akor notalarını tek tek çalmaya arpej denir. Baladlarda sol el kök, beşli, oktav, beşli dolaşır. Bilek yuvarlanır, kol yerinde kalmaz.', staff: S(undefined, 'c3:8_5 g3_2 c4_1 g3_2 c3_5 g3_2 c4_1 g3_2') },
    { h: 'Vals ve üç vuruş', p: 'Üç vuruşta birinci vuruş ağır, öteki ikisi hafiftir. Sol el kökü verir, sağ el iki hafif akor çalar.', staff: S('r:4 <a4 c5 e5>:4 <a4 c5 e5>:4', 'a2:4 r:2', { time: [3, 4] }) },
    { h: 'Düm-tek', p: 'Sekiz sekizlik içinde: düm, tek, sus, tek, düm, sus, tek, sus. Sol el düm, sağ el tek çalar. Önce avuçla masaya vur, sonra piyanoya geç.', staff: S('r:8 <a4 c5 e5>:8 r:8 <a4 c5 e5>:8 r:4 <a4 c5 e5>:8 r:8', 'a2:4 r:4 a2:4 r:4') },
    { h: 'Sonatin', p: 'Sonatin küçük sonattır: bir tema, onun karşısında ikinci bir tema, sonra ilk temaya dönüş. Clementi’de önce temaların nerede başladığını bul; parça kendiliğinden kolaylaşır.' },
  ], quiz: [
    { q: 'Akor notalarının tek tek çalınmasına ne denir?', a: ['Arpej', 'Stakato', 'Legato'], ok: 0, why: 'Arpej, akorun dağıtılmış halidir.' },
    { q: 'Valste hangi vuruş ağırdır?', a: ['Birinci', 'İkinci', 'Üçüncü'], ok: 0, why: 'Bir ağır, iki hafif.' },
    { q: 'Düm-tek kalıbında “düm”ü hangi el çalar?', a: ['Sağ el', 'Sol el', 'İki el'], ok: 1, why: 'Sol el bası verir.' },
  ] },
  6: { cards: [
    { h: 'İki ayrı ses', p: 'Küçük Prelüdlerde iki el aynı anda iki ayrı ezgi çalar. Her eli şarkı gibi söyle. Bir el ezgi, öteki eşlik değildir; ikisi de konuşur.', staff: S('r:8 c4:8 e4 g4 e4 c4 g4 e4', 'c3:1') },
    { h: 'Senkop', p: 'Vurgu vuruşun önüne kayar. 3+3+2’de sekiz sekizlik üç gruba ayrılır: bir-iki-üç, bir-iki-üç, bir-iki. İkinci akor üçüncü vuruştan önce gelir.', staff: S('<c4 e4 g4>:4. <c4 e4 g4>:4. <c4 e4 g4>:4', 'c3:4. c3:4. c3:4') },
    { h: 'Süslemeler', p: 'Üstte tr ya da dalga işareti görürsen nota komşu sesle hızla süslenir. Süslemeyi notalar oturduktan sonra ekle; ritmi bozuyorsa önce atla.' },
  ], quiz: [
    { q: '3+3+2’de ikinci akor ne zaman gelir?', a: ['Vuruşun üstünde', 'Üçüncü vuruştan önce', 'Ölçü sonunda'], ok: 1, why: 'İlk grup üç sekizlik sürer, ikinci akor üçüncü vuruştan yarım vuruş önce gelir.' },
    { q: 'Süslemeyi ne zaman eklemelisin?', a: ['En başta', 'Notalar oturunca', 'Hiç eklememelisin'], ok: 1, why: 'Önce nota ve ritim.' },
  ] },
  7: { cards: [
    { h: 'İnvansiyon', p: 'Kısa bir tema bir elde duyulur, öteki el onu taklit eder. Önce temayı bul ve parçada kaç kez geçtiğini işaretle. Çalarken hangi elin temayı taşıdığını hep bil.', staff: S('r:16 c4:16 d4 e4 f4 d4 e4 c4 g4:8 r:8 r:4', 'r:2 r:16 c3:16 d3 e3 f3 d3 e3 c3') },
    { h: 'Yedili akorlar', p: 'Üçlü akorun üstüne bir üçlü daha koyarsan yedili olur. Dm7 Re Fa La Do, G7 Sol Si Re Fa. Dm7’den G7’ye Re ve Fa sabit kalır, el neredeyse kımıldamaz.', chord: 'Dm7' },
    { h: '6/8 ölçü', p: 'Altı sekizlik iki büyük vuruştur: bir-iki-üç, dört-beş-altı. Yavaş baladlar çoğunlukla böyle sayılır.', staff: S('<c4 e4 g4>:4. <c4 e4 g4>:4.', 'c3:8 g3 c4 g3 c4 g3', { time: [6, 8] }) },
  ], quiz: [
    { q: 'Dm7 hangi notalardan oluşur?', a: ['Re, Fa, La, Do', 'Re, Fa, La', 'Re, Sol, Si, Fa'], ok: 0, why: 'Re minöre yedili ses Do eklenir.' },
    { q: 'İnvansiyonda ikinci el ne yapar?', a: ['Temayı taklit eder', 'Sadece akor çalar', 'Susar'], ok: 0, why: 'Taklit, invansiyonun temelidir.' },
    { q: '6/8 kaç büyük vuruştur?', a: ['İki', 'Üç', 'Altı'], ok: 0, why: 'Üçer sekizlik iki grup.' },
  ] },
  8: { cards: [
    { h: 'Beşliler döngüsü', p: 'Kök her seferinde dörtlü çıkar ya da beşli iner: Lam, Rem, Sol, Do, Fa, Si eksik, Mi, Lam. Uzun nakaratların çoğu bu döngüyü kullanır.', chord: 'Dm' },
    { h: 'Aksak', p: 'Türk müziğinde aksak 2+2+2+3’tür. Dokuz sekizlik dört gruba ayrılır, son grup uzun. Say: bir-iki, bir-iki, bir-iki, bir-iki-üç.' },
    { h: 'Prelüd’ü uyum olarak okumak', p: 'Bach’ın Do majör Prelüdü her ölçüde bir akoru aynı kalıpla dağıtır. Önce akorları blok halinde çal, adını koy; sonra kırık kalıba geç.', staff: S('<g4 c5 e5>:1', '<c4 e4>:1') },
    { h: 'Kendi şarkın', p: 'Sevdiğin şarkının akorlarını bul, sesine uygun tona kaydır, önce tam nota, sonra kalıpla çal. Söylerken eşlik ettiğinde bu yolun sonuna gelmişsindir.' },
  ], quiz: [
    { q: 'Türk müziğinde aksak nasıl gruplanır?', a: ['3+3+3', '2+2+2+3', '4+5'], ok: 1, why: 'Dokuz sekizlik, son grup üçlü.' },
    { q: 'Beşliler döngüsünde kök nasıl hareket eder?', a: ['Yarım ton yukarı', 'Dörtlü yukarı', 'Sekizli aşağı'], ok: 1, why: 'Dörtlü çıkış, beşli inişle aynı notaya varır.' },
  ] },
};
