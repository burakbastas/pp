// Beş kol, altı aşama. Her gün her koldan bir parça çalışılır (dağıtık ve karışık çalışma).
export const TRACKS = [
  { id: 'okuma', name: 'Okuma', desc: 'Fa anahtarı ve deşifre' },
  { id: 'teknik', name: 'İki el', desc: 'Bağımsızlık ve teknik' },
  { id: 'klasik', name: 'Klasik', desc: 'Repertuvar' },
  { id: 'eslik', name: 'Eşlik', desc: 'Akor ve şarkı' },
  { id: 'san', name: 'Şan', desc: 'Vokal alıştırmalar' },
];
export const STAGES = [
  { n: 1, name: 'Fa anahtarını tanı', goal: 'Sol el notasını tuşa bakmadan bulmaya başla.' },
  { n: 2, name: 'Sol eli yürüt', goal: 'Sol el konum değiştirsin, parça ezberden değil porteden gelsin.' },
  { n: 3, name: 'Elleri ayır', goal: 'Bir el bağlı, öteki kısa; bir el tutar, öteki yürür.' },
  { n: 4, name: 'Akorla düşün', goal: 'Bası ve akoru notadan da şemadan da oku.' },
  { n: 5, name: 'Eşlikçi ol', goal: 'Şarkı kalıplarını farklı tonlarda çal.' },
  { n: 6, name: 'Kendi repertuvarın', goal: 'Kendi şarkını şemadan çıkar, kendine eşlik et.' },
];

const L = [];
const add = (stage, track, id, title, goal, how, extra) => L.push({ id, stage, track, title, goal, how, ...extra });
const piece = (p, from, to, hands, tempo) => ({ kind: 'piece', piece: p, from, to, hands, tempo });
const ex = (e, hands, tempo) => ({ kind: 'ex', ex: e, hands, tempo });
const acc = (chart, pattern, tempo, extra = {}) => ({ kind: 'accomp', chart, pattern, tempo, ...extra });
const voc = (e, style, maxKeys, tempo) => ({ kind: 'vocal', ex: e, style, maxKeys, tempo });
const read = (level) => ({ kind: 'read', level });
const sight = (level, hands) => ({ kind: 'sight', level, hands });

const READ_HOW = ['Notayı adıyla değil yerinden tanı: önce en yakın durağı bul, sonra kaç adım uzakta olduğuna bak.', 'Doğru tuşa bas. Elini gerçek piyanoda da aynı yere götür.', '20 notada yüzde 90 ve nota başına 2 saniyenin altı hedef.'];
const HS = 'Önce tek el, sonra iki el. Yanlış yaptığın yeri tek başına yavaşlat, üç kez üst üste temiz çalınca devam et.';

// 1. AŞAMA
add(1, 'okuma', 'r-b1', 'Üç durak: küçük Do, Fa, orta Do', 'Fa anahtarının iki noktası arasındaki çizgi Fa’dır. Bütün okuma buradan başlar.', READ_HOW, read('b1'));
add(1, 'okuma', 'lh01', 'Üç durağı çal', 'Duraklar arasında elini gözünle değil porteyle yönet.', ['Bir kez nota adlarını yüksek sesle söyle.', 'Sonra söyleyerek çal. Sen şan öğrencisisin, bu senin avantajın.', 'Klavyeye bakmadan dene.'], ex('lh01', 'lh'));
add(1, 'okuma', 'r-b2', 'Dördüncü durak: kalın Sol', 'Portenin en alt çizgisi Sol. Dört durak, sol elin bütün haritasıdır.', READ_HOW, read('b2'));
add(1, 'okuma', 'lh02', 'Do konumunda yürüyüş', 'Beş parmak, beş nota. Komşu notalar adım, atlayanlar üçlü.', ['Her notada aralığı oku: adım mı, atlama mı?', 'Nota adlarını söyleyerek çal.'], ex('lh02', 'lh'));
add(1, 'okuma', 'lh03', 'Neşeye Övgü, sol elde', 'Tanıdık ezgi yanlışı kulağına söyletir.', ['Bu ezgiyi şimdiye kadar sağ elle duymuşsundur; porteden okuyarak çal.', 'Noktalı dörtlüğe dikkat: dörtte üç, sekizde bir.'], ex('lh03', 'lh'));
add(1, 'teknik', 'bi01', 'Paralel beş parmak', 'İki el aynı notaları, farklı parmaklarla çalar. Parmak numaraları ters çalışır.', ['Her eli ayrı çal.', 'İki el birlikte, yavaş. Kulağın iki eli aynı anda duymalı.'], ex('bi01', 'both'));
add(1, 'teknik', 'bi02', 'Zıt yön', 'Eller ayna gibi hareket eder, aynı parmaklar birlikte iner.', ['Başparmaklar içeride başlar.', 'Yavaş tempoda hep aynı numaralı parmakların birlikte indiğini hisset.'], ex('bi02', 'both'));
add(1, 'klasik', 'gm-l1', 'Menuet sol minör: sol el, 1–8', 'Bu parçayı ezberden biliyorsun. Şimdi sol elini gözünle porteden oku.', ['Klavye yardımını kapat (Ayarlar).', 'Sol el notalarını şan çalışır gibi solfejle söyle, sonra çal.', 'Ezber devreye girerse başka bir ölçüden başla.'], piece('gm', 0, 8, 'lh', 72));
add(1, 'klasik', 'gm-r1', 'Menuet sol minör: sağ el, 1–8', 'Sağ eli notaya bakarak çal, parmak numaralarını kontrol et.', ['Ölçü 4 ve 8 cümle sonu: uzun notada nefes al gibi bırak.', 'Bilek serbest, üç vuruşta ağırlık birinci vuruşta.'], piece('gm', 0, 8, 'rh', 80));
add(1, 'eslik', 'ak1', 'Do, Fa, Sol: ilk üç akor', 'Sol el kök, sağ el üçlü. Şarkıların çoğu bu üç akorla başlar.', ['Sol el tek notayla kökü çalar.', 'Sağ el 1-3-5 parmaklarla üçlüyü basar.', 'Akor değişiminde bir sonraki akoru vuruştan önce düşün.'], acc('C | F | G | C', 'tam', 60));
add(1, 'eslik', 'ak2', 'I–V–vi–IV: popun dörtlüsü', 'Dört akor binlerce şarkının iskeletidir.', ['Önce tam notalarla akor değişimini oturt.', 'Akor isimlerini yüksek sesle söyle: Do, Sol, La minör, Fa.'], acc('C | G | Am | F', 'tam', 60));
add(1, 'san', 'v-mir', 'Üçlü mırıltı: piyanoda', 'Sesini açan alıştırmayı kendin çal.', ['Sağ el: 1-2-3-2-1. Sol el: tonik akor.', 'Her tonda aynı parmaklar; siyah tuşa çıkınca el yukarı kayar.', 'Çalarken mırıltıyla söyle.'], voc('mirilti', 'akor', 3));
add(1, 'san', 'v-bes', 'Beşli legato', 'Şan derslerindeki beşliyi iki elle çal.', ['Sağ el legato: parmaklar birbirine yapışık geçer.', 'Sol el tutar, sağ el yürür.'], voc('besli', 'akor', 3));

// 2. AŞAMA
add(2, 'okuma', 'r-b3', 'Durakların komşuları', 'Portenin tamamı: Sol’dan orta Do’ya.', READ_HOW, read('b3'));
add(2, 'okuma', 'lh04', 'Sol konumu: alt çizgiler', 'El alt çizgilere iniyor, Fa diyez portede.', ['Kalın Sol’dan başla: 5. parmak.', 'Fa diyez bu konumda çıkmaz ama donanımı oku.'], ex('lh04', 'lh'));
add(2, 'okuma', 'lh05', 'Au clair de la lune, sol elde', 'Basit ezgi, alt porte.', ['Klavyeye bakmadan dene.', 'Yanlışı kulağınla bul.'], ex('lh05', 'lh'));
add(2, 'okuma', 'lh06', 'Üçlü atlamaları oku', 'Çizgiden çizgiye ya da aralıktan aralığa geçiş üçlüdür.', ['Nota adı söylemeden yalnızca “adım, atlama” diye söyleyerek çal.'], ex('lh06', 'lh'));
add(2, 'teknik', 'bi03', 'Soru ve cevap', 'Bir el söyler, öteki yanıtlar. El değişimini ritim bozmadan yap.', ['Metronomla çal.', 'Sus ölçüsünde öteki elin yerini önceden hazırla.'], ex('bi03', 'both'));
add(2, 'teknik', 'sc_c', 'Do majör dizi', 'Başparmak altından geçiş. Teknik ve okuma birlikte.', ['Sağ el 1-2-3-1: başparmak 3’ün altından geçer.', 'Sol elde geçiş 1’den sonra 3’e.', 'Önce tek el, sonra iki el.'], ex('sc_c', 'both'));
add(2, 'klasik', 'gm-l2', 'Menuet sol minör: sol el, 9–16', 'İkinci cümlede bas çizgisi farklılaşıyor.', ['Ölçü 12’de Si natürel: yeni nota.', 'Ölçü 13’teki çift sesi önce ayrı ayrı çal.'], piece('gm', 8, 16, 'lh', 72));
add(2, 'klasik', 'gm-r2', 'Menuet sol minör: sağ el, 9–16', 'Birinci cümleyle farklarını bul.', ['Ölçü 13’ten sonrası yeni: Fa’dan iniş.', 'Süslemeleri şimdilik atla.'], piece('gm', 8, 16, 'rh', 80));
add(2, 'klasik', 'gm-h1', 'Menuet sol minör: iki el, 1–16', 'İki eli yavaş tempoda birleştir.', [HS, 'Döngüyü iki ölçüye kur ve tempo adım adım artsın.'], piece('gm', 0, 16, 'both', 66));
add(2, 'eslik', 'ak3', 'Yarımlıklarla I–V–vi–IV', 'Bas ve akor birlikte, iki vuruşta bir.', ['Sol el bas, sağ el üçlü aynı anda iner.'], acc('C | G | Am | F', 'yarim', 66));
add(2, 'eslik', 'ak4', 'Minör temel: Am, Dm, E', 'Minör şarkıların temel kadansı.', ['Mi majörde Sol diyez, minör dizinin yedinci sesidir.', 'Akor adlarını söyleyerek çal.'], acc('Am | Dm | E | Am', 'yarim', 66));
add(2, 'eslik', 'ak5', 'Dörtlük balad, yakın konum', 'Sağ el zıplamadan en yakın çevrime geçer.', ['Çevrimlerde ortak notayı yerinde bırak.', 'Bu, eşliğin “profesyonel” duyulmasının ana sırrıdır.'], acc('C | G | Am | F', 'balad', 72));
add(2, 'san', 'v-st5', 'Beşli stakato', 'Sağ el kısa ve hafif, sol el uzun tutar.', ['Stakato parmakla değil bilekten gelir: el hafifçe sekiyor.', 'Söylerken “ha” ataklarını sağ elle eşle.'], voc('stakato5', 'bas', 3));
add(2, 'san', 'v-be2', 'Beşli legato: yarım ton yürü', 'Tonları kaydırmayı öğren.', ['Bir sonraki tonun ilk notasını hazırlık ölçüsünde bul.'], voc('besli', 'bas', 5));

// 3. AŞAMA
add(3, 'okuma', 'r-b4', 'Alt ek çizgiler', 'Bas akorlarının yaşadığı bölge.', READ_HOW, read('b4'));
add(3, 'okuma', 'lh07', 'Fa konumu', 'Si bemolü donanımdan oku.', ['Ek çizgideki Fa’yı kalın Sol’dan bir aşağı say.'], ex('lh07', 'lh'));
add(3, 'okuma', 'lh08', 'Konum değiştir', 'Sol el üç konumda dolaşır.', ['Sus sırasında elini yeni konuma taşı.', 'Gözün portede kalsın.'], ex('lh08', 'lh'));
add(3, 'okuma', 's1', 'Deşifre 1: sol el, beş nota', 'Görmediğin notayı durmadan çal.', ['Önce 10 saniye bak, parmağını yerleştir.', 'Tempo yavaş, durmak yasak.'], sight(1, 'lh'));
add(3, 'teknik', 'bi04', 'Biri tutar, biri yürür', 'Uzun notayı tutarken öteki el rahat kalsın.', ['Tutan parmak basılı kalır ama omuz gevşek.'], ex('bi04', 'both'));
add(3, 'teknik', 'bi05', 'Sağ bağlı, sol kısa', 'Asıl bağımsızlık burada başlar.', ['Sol el stakato, sağ el legato.', 'Önce çok yavaş; iki eli aynı anda ayrı karakterde duymaya çalış.'], ex('bi05', 'both', 54));
add(3, 'teknik', 'bi06', 'Sol bağlı, sağ kısa', 'Aynı beceri, eller yer değiştirdi.', ['Şan alıştırması eşliklerinde bu beceri lazım.'], ex('bi06', 'both', 54));
add(3, 'klasik', 'gm-l3', 'Menuet sol minör: 17–24', 'Si bemol majör bölge.', ['Ölçü 17’de Mi natürel.', 'Her el ayrı, sonra birlikte.'], piece('gm', 16, 24, 'both', 66));
add(3, 'klasik', 'gm-h2', 'Menuet sol minör: 25–32', 'Son cümle, sağ el sıçrar.', ['Ölçü 27’de sağ el geniş açılır: yavaş başla.', 'Ölçü 31 cümle sonu, ritardando yapma.'], piece('gm', 24, 32, 'both', 66));
add(3, 'klasik', 'gm-all', 'Menuet sol minör: baştan sona', 'Tekrarlı, tek parça.', ['Tek el tek el geç, sonra iki el.', 'Tempo: 72’den başla, 112 hedef.'], piece('gm', 0, null, 'both', 80));
add(3, 'eslik', 'ak6', 'Sol el kök ve beşli', 'Sol elin pop ayağı.', ['5. ve 2. parmak, el açılmadan.'], acc('C | G | Am | F', 'kokbes', 72));
add(3, 'eslik', 'ak7', 'Sekizlik pop', 'Sağ el eşit sekizlikler.', ['Bilek küçük hareketlerle sekiyor, kol sabit.', 'Sol el oktav: 5 ve 1.'], acc('C | G | Am | F', 'pop8', 80));
add(3, 'eslik', 'ak8', 'Minör pop döngüsü', 'Am, F, G, Am.', ['Fa ve Sol komşu: el aynı kalıpla kayar.'], acc('Am | F | G | Am', 'kokbes', 76));
add(3, 'san', 'v-ars', 'Stakato arpej', 'Söyleyeceğin arpeji piyanoda kısa çal.', ['1-2-3-5 parmak düzeni.', 'Sağ el stakato, sol el tutar.'], voc('arpejStak', 'bas', 3));
add(3, 'san', 'v-lst', 'Önce bağlı, sonra kısa', 'Aynı ezgi iki karakterde.', ['İlk geçiş legato, ikinci stakato.', 'Söylerken ses yeri değişmesin.'], voc('legatoStak', 'bas', 3));

// 4. AŞAMA
add(4, 'okuma', 'r-g1', 'İki anahtar birlikte', 'Sağ ve sol el arasında gözü taşı.', READ_HOW, read('g1'));
add(4, 'okuma', 'lh09', 'Kök, beşli, oktav', 'Eşlikte kullanacağın bas kalıplarını oku.', ['Akor adını söyle, sonra çal.'], ex('lh09', 'lh'));
add(4, 'okuma', 'lh10', 'Sol minörde bas yürüyüşü', 'Menuet’in tonunda sol el okuma.', ['Fa diyez yalnız yeden seste çıkar.'], ex('lh10', 'lh'));
add(4, 'okuma', 's2', 'Deşifre 2: iki el, tek el sırayla', 'Gözün iki porte arasında dolaşsın.', ['Önce iki portedeki ilk notayı bul.'], sight(2, 'both'));
add(4, 'teknik', 'bi07', 'Sol dörtlük, sağ sekizlik', 'İkiye karşı bir.', ['Sayarak çal: bir-ve-iki-ve.'], ex('bi07', 'both', 54));
add(4, 'teknik', 'bi08', 'Sağ dörtlük, sol sekizlik', 'Elleri değiştir.', ['Hep aynı tempo, sol el koşmasın.'], ex('bi08', 'both', 54));
add(4, 'teknik', 'sc_g', 'Sol majör dizi', 'Fa diyez ve geçiş.', ['Do majörle aynı parmaklar.'], ex('sc_g', 'both'));
add(4, 'teknik', 'sc_am', 'La armonik minör dizi', 'Minör pop’un dizisi.', ['Sol diyez, yedinci ses.'], ex('sc_am', 'both'));
add(4, 'klasik', 'gm-orn', 'Menuet sol minör: süsleme ve ezber kırma', 'Parçayı rastgele bir ölçüden başlatabildiğinde gerçekten okuyorsun demektir.', ['“Ezberi kır” düğmesi rastgele iki ölçü seçer.', 'Porteden başlat, klavye yardımı kapalı.', 'İşaretli süslemeleri en son ekle.'], piece('gm', 0, null, 'both', 90));
add(4, 'klasik', 'gM-1', 'Menuet Sol majör: 1–16', 'Eşi olan parça.', [HS], piece('gM', 0, 16, 'both', 72));
add(4, 'eslik', 'ak9', 'Sol el arpej', 'Baladların sol eli: 1-5-8-5.', ['Elin yayılarak dolaşsın, bilek yuvarlansın.'], acc('C | Am | F | G', 'arpej', 69));
add(4, 'eslik', 'ak10', 'Vals', 'Bir-iki-üç: üç vuruşlu şarkıların kapısı.', ['Birinci vuruş ağır, öteki ikisi hafif.'], acc('Am | Dm | E | Am', 'vals', 92));
add(4, 'eslik', 'ak11', 'Düm-tek ve inen minör dizi', 'Sol el düm, sağ el tek.', ['Önce avuçla masaya vur: düm tek, tek düm, tek.', 'Sonra akorla çal.'], acc('Am | G | F | E', 'dumtek', 84));
add(4, 'san', 'v-okt', 'Oktav ve iniş', 'Üst notayı hazırla.', ['Beşinci parmak oktavı bulur, sonra el iner.'], voc('oktav', 'akor', 3));
add(4, 'san', 'v-yur', 'Sol el akor ile tonları yürüt', 'Hazırlık akorlarıyla tonlar arasında geç.', ['Geçiş ölçüsü yeni tonun dominantıdır.', 'Söyleyen kişiye nefes payı verir.'], voc('besli', 'akor', 6));

// 5. AŞAMA
add(5, 'okuma', 'r-i1', 'Aralık okuma', 'Nota adı olmadan, iki nota arası uzaklıkla oku.', ['İlk notadan sonra ikinciye bak: yukarı mı, aşağı mı, kaç adım?', 'İki tuşa sırayla bas.'], read('i1'));
add(5, 'okuma', 's3', 'Deşifre 3: iki el birlikte', 'Basit ritim, iki el.', ['Durmamak doğru notadan önemli.'], sight(3, 'both'));
add(5, 'teknik', 'hanon1', 'Hanon 1, tek oktav', 'Parmak eşitliği. 3 dakikayı geçme.', ['Parmakları yüksek kaldırma.', 'Sonra aynı alıştırmayı ritimli çal.'], ex('hanon1', 'both', 56));
add(5, 'teknik', 'bi09', 'Vuruş arası', 'Sağ el vuruşların arasına düşer.', ['Sol el vuruşta, sağ el aksak.', 'Senkop eşliğin hazırlığı.'], ex('bi09', 'both', 56));
add(5, 'teknik', 'sc_gm', 'Sol armonik minör dizi', 'Menuet’in tonu.', ['Fa diyez, Mi bemol ve Si bemol.'], ex('sc_gm', 'both'));
add(5, 'klasik', 'gM-2', 'Menuet Sol majör: 17–32', 'İkinci kısım.', [HS], piece('gM', 16, 32, 'both', 72));
add(5, 'klasik', 'mel', 'Schumann: Melodie', 'Sol el sürekli sekizlik, sağ el şarkı söyler.', ['Sol el bu parçada sol anahtarıyla yazılır; kaynağa uygun bıraktım.', 'Sol el Alberti gibi ama daha melodik.', 'Sağ eli söyle.'], piece('mel', 0, null, 'both', 60));
add(5, 'eslik', 'ak12', '3+3+2 senkop', 'Popun yürüyen ritmi.', ['Önce el çırparak say.', 'İkinci akor erken gelir.'], acc('C | G | Am | F', 'senkop', 76));
add(5, 'eslik', 'ak13', 'Kırık sağ el', 'Akorları dağıt.', ['Sağ el 1-2-3-2 tekrarlar.'], acc('Am | F | C | G', 'kirik', 72));
add(5, 'eslik', 'ak14', '6/8 balad', 'İki büyük vuruş.', ['Sol el dalga, sağ el geniş.'], acc('C | Am | Dm | G', 'balad68', 60));
add(5, 'eslik', 'ak15', 'ii–V–I', 'Yedili akorlar.', ['Dm7’den G7’ye iki not sabit kalır.'], acc('Dm7 | G7 | Cmaj7 | Cmaj7', 'balad', 72));
add(5, 'eslik', 'ak16', 'Beşliler döngüsü', 'Uzun minör nakarat.', ['Akor kökü her seferinde dörtlü çıkar.'], acc('Am | Dm | G | C | F | Bdim | E | Am', 'kokbes', 72));
add(5, 'san', 'v-ogr', 'Ezgisiz eşlik', 'Öğretmenin yaptığı gibi: sadece akor ver, sesi öğrenci bulsun.', ['Başta ve sonda akor.', 'Söylerken kendi sesini dinle.'], voc('arpejLegato', 'ogretmen', 6));
add(5, 'san', 'v-alg', 'Bağlı arpej', 'Geniş aralık, tek çizgi.', ['El kapalı değil, kol taşır.'], voc('arpejLegato', 'akor', 4));

// 6. AŞAMA
add(6, 'okuma', 'r-b5', 'Derin bas', 'Oktav aşağısı: Do2’ye kadar.', READ_HOW, read('b5'));
add(6, 'okuma', 's4', 'Deşifre 4: ritimli iki el', 'Sekizlik ve noktalı.', ['Bir kez göz gezdir, başla.'], sight(4, 'both'));
add(6, 'teknik', 'bi10', 'Küçük Alberti', 'Sol elde klasik eşlik.', ['Beşinci parmak ağır, öteki notalar hafif.'], ex('bi10', 'both'));
add(6, 'teknik', 'sc_f', 'Fa majör dizi', 'Sağ elde farklı parmak.', ['Sağ el 1-2-3-4-1.'], ex('sc_f', 'both'));
add(6, 'teknik', 'sc_dm', 'Re armonik minör dizi', 'Minör repertuvarda sık kullanılan ton.', ['Do diyez, Si bemol.'], ex('sc_dm', 'both'));
add(6, 'klasik', 'a116', 'Menuet Sol majör (Anh. 116)', 'Üçüncü menuet, sol elde daha çok hareket.', [HS], piece('a116', 0, null, 'both', 72));
add(6, 'klasik', 'prel-a', 'Bach Prelüd: akor hali', 'Parçayı önce uyumları olarak oku. Klasik ve eşlik burada buluşur.', ['Her ölçü bir akor. Adını bul.', 'Akorlar arası ortak sesleri izle.'], { kind: 'prelude', hands: 'both', tempo: 54 });
add(6, 'klasik', 'prel', 'Bach Prelüd: asıl hali', 'Aynı uyumlar, aynı kırık kalıp.', ['Yavaş başla, kalıp her ölçüde aynı.'], piece('prel', 0, null, 'both', 54));
add(6, 'eslik', 'ak17', 'Alberti eşlik', 'Klasik kalıp, pop tonlar.', ['Sol el hafif, sağ el üstte.'], acc('C | Am | F | G', 'alberti', 69));
add(6, 'eslik', 'ak18', '9/8 aksak', 'Türk müziğinin 2+2+2+3’ü.', ['Önce say, el çırp.', 'Son grup uzun.'], acc('Am | Am | G | Am', 'aksak98', 96));
add(6, 'eslik', 'ak19', 'Kendi şarkın', 'Sevdiğin şarkının akorlarını yaz, kendine eşlik et.', ['Eşlik sekmesinde akorları yaz.', 'Sesine uygun tona kaydır.', 'Önce tam nota, sonra kalıp.'], { kind: 'studio' });
add(6, 'san', 'v-dok', 'Dokuzlu çeviklik', 'Sağ el dizide başparmak geçişi.', ['Çok yavaş başla.', 'Parmak düzeni: 1-2-3-1-2-3-1-2-3 ve aynı yoldan dönüş.'], voc('dokuzlu', 'melodi', 2));
add(6, 'san', 'v-mes', 'Messa di voce', 'Tek notada sesi büyüt ve küçült.', ['Sol el akor, sağ el ses verir.', 'Sekiz vuruş boyunca söylerken nefesi eşit dağıt.'], voc('messa', 'akor', 4));

export const LESSONS = L;
export const byId = (id) => L.find(x => x.id === id);
export const MINUTES = {
  15: { okuma: 3, teknik: 3, klasik: 4, eslik: 3, san: 2 },
  30: { okuma: 5, teknik: 5, klasik: 10, eslik: 7, san: 3 },
  45: { okuma: 7, teknik: 8, klasik: 15, eslik: 10, san: 5 },
};
export const nextFor = (track, done) => L.find(x => x.track === track && !done[x.id]) || null;

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
