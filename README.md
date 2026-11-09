# Piyano Okulu

Başlangıçtan ileri seviyeye piyano eğitim ağacı ve ayrı bir fa anahtarı alanı. Telefon, tablet ve bilgisayarda çalışır, internet olmadan da açılır. MIDI klavyeyi bağladığında porte seni nota nota izler.

Adres: https://burakbastas.github.io/pp/

## İçindekiler

**Eğitim ağacı.** On iki ünite, Royal Conservatory of Music (RCM) piyano müfredatının Hazırlık A’dan Seviye 10’a uzanan basamaklarına denk gelir. Her ünitede:

- Parmak alıştırmaları: sağ el, sol el ve iki el için bağımsızlık, parmak geçişi ve atlama. Seviye yükseldikçe alıştırmalar değişir: beş parmaktan iki oktav diziye, arpejlere, dominant yedililere, oktavlara ve dört oktav dizilere.
- Alıştırmalar: Beyer Op. 101, Czerny Op. 821, Hanon 1–20.
- Etütler: Czerny Op. 599, 824, 453 ve 840, Köhler, Berens, Bertini, Burgmüller Op. 100, Chopin prelüdleri.
- Eserler: Bach, Mozart, Beethoven, Schumann, Çaykovski, Grieg, Chopin, Liszt, Joplin. RCM listesinde adı geçenler işaretlidir.

**Fa anahtarı.** On iki aşamada kırk sekiz etüt: üç durak notadan başlar, komşu notalar, konumlar, çizgi ve aralıklar, ek çizgiler, tondaki işaretler, ritim, akor.

**Gezinme.** Ünite ve aşama sayfalarında telefon ve tablette altta 12 tuşlu klavye, geniş ekranda solda dikey klavye durur. Her tuş bir üniteye gider.

**Piyano sesleri.** Ayarlardan seçilir: Musyng Kite, Salamander (Yamaha C5), Splendid (Steinway), Headroom (Yamaha C3).

**Çalışma ekranı.** Çal seçiliyken porte MIDI klavyeni izler; MIDI yoksa ekrandaki tuşlara ya da bilgisayar klavyesine basabilirsin. Dinle kipinde parçayı seçtiğin tempoda duyarsın. Uzun parçalar bölümlere ayrılır; ölçü aralıklarının sonundaki Tüm eser ya da Tüm etüt seçeneği parçanın tamamını açar. Sol, sağ ve iki el ayrı ayrı çalışılır; yüzde 90 alan bölüm geçilmiş sayılır.

## Klavye bağlantısı

Chrome ya da Edge kullan. Klavyeyi USB ile bağla, çalışma ekranındaki “MIDI bağla” düğmesine bas, izin ver. Bir kez izin verdikten sonra uygulama açılışta kendisi bağlanır. Safari ve iPhone Web MIDI desteklemez.

## Kaynaklar

- Seviye ve teknik hedefler: [RCM Piano Syllabus 2022](https://teacherportal.rcmusic.com/getattachment/57f3734d-97e5-4777-b67e-4b1111ee31a3/piano-syllabus-2022-edition.pdf), [teknik çizelge](https://colorinmypiano.com/wp-content/files/RCM_2022_Technical_Requirements_Charts_Prep-10.pdf)
- Seviye listeleri: [repertuvar](https://www.dacapomusic.ca/blog/rcm-piano-repertoire-all-pieces), [etütler](https://www.dacapomusic.ca/blog/rcm-piano-etudes-all-pieces)
- Etüt kitaplarının sırası: [Jean-Michel Serres](https://jeanmichelserres.com/?p=1266)
- Parmak geçişi ve atlama: [Chuan C. Chang, Fundamentals of Piano Practice](https://fundamentals-of-piano-practice.readthedocs.io/)
- Notalar (kamu malı eserler): [Mutopia Project](https://www.mutopiaproject.org), [Nathanael Meister’in LilyPond okulu](https://github.com/nathanaelmeister/Piano_-_First_two_hand_exercises), [da-x/czerny](https://github.com/da-x/czerny)
- Parmak alıştırmaları ve fa anahtarı etütleri bu uygulama için yazıldı.
- Piyano sesleri: Musyng Kite, [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) üzerinden (CC BY-SA 3.0); [Salamander Grand Piano](https://github.com/sfzinstruments/SalamanderGrandPiano), Alexander Holm (CC BY 3.0); [Splendid Grand Piano](https://github.com/sfzinstruments/SplendidGrandPiano), Akai (kamu malı); [Headroom Piano](https://github.com/sfzinstruments/BengtNilsson.HeadroomPiano), Bengt Nilsson (CC BY 4.0). Ayrıntı: `sounds/KAYNAK.txt`.
- Yazı tipleri: Old Standard TT ve Libre Franklin (SIL OFL).

## Yapı

`js/notation` nota ayrıştırma ve SVG dizgi, `js/audio` ses ve MIDI, `js/ui` çalışma ekranı, `js/data/tree.js` müfredat, `js/data/n` notalar (ünite başına ayrı dosya). Derleme adımı ve dış kütüphane yok.

Nota biçimi: `perde:süre_parmak`, örneğin `c4:4_1`. `!` stakato, `~` bağ, `<c3 e3 g3>:2` akor, `r:4` sus, `//` ikinci ses. `%b` ve `%t` ölçü başında anahtar değiştirir.
