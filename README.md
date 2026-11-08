# İki El

Fa anahtarını oturtmak, iki eli ayırmak, klasik parça çalmak, pop şarkılara eşlik etmek ve şan alıştırmalarını piyanoda çalmak için kişisel çalışma uygulaması. Telefon, tablet ve bilgisayarda çalışır, internet olmadan da açılır.

## GitHub'a yükleme

1. GitHub'da yeni bir depo aç (bu proje için: `pp`). Herkese açık olmalı; ücretsiz planda Pages böyle çalışır.
2. **Add file > Upload files** ile bu klasörün **içindekileri** sürükle (`index.html` deponun en üstünde olmalı).
3. **Settings > Pages** bölümünde Source: *Deploy from a branch*, Branch: `main`, klasör: `/ (root)` seç, kaydet.
4. Bir iki dakika sonra adres hazır: `https://burakbastas.github.io/pp/`

Telefonda bu adresi açıp “Ana ekrana ekle” dersen uygulama gibi açılır.

Bilgisayarda denemek için: klasörde `python3 -m http.server` çalıştır, `http://localhost:8000` adresini aç. `index.html` dosyasına çift tıklamak çalışmaz.

## Klavye bağlantısı

| Durum | Yöntem |
|---|---|
| Dijital piyano, Chrome/Edge/Firefox (bilgisayar, Android) | USB ya da Bluetooth MIDI: çalışma ekranında **MIDI bağla**. Çalmaya başlayınca **Takip** kipi açılır |
| iPhone/iPad | Safari MIDI desteklemiyor. Mikrofonu aç ya da “Birlikte” kipini kullan |
| Akustik piyano | Mikrofon: tek ses ve basit iki seste iyi çalışır |
| Klavye yok | Ekrandaki tuşlar ya da bilgisayarda A S D F G H J K tuşları (Z ve X oktav değiştirir) |

## İçindekiler

- **Bugün:** beş kolun her birinden sıradaki ders. 15, 30 ya da 45 dakika.
- **Yol:** 6 aşama, 84 ders.
- **Okuma:** durak notalardan başlayan nota bulma, aralık okuma, deşifre üretici.
- **Eşlik:** akorları yaz (`Am F | C G`, `Lam Fa`), kalıp seç, tonu kaydır, şarkılarını kaydet.
- **Şan:** alıştırmayı ses türüne göre yarım ton yürüt. Söyle ya da kendin çal.

## Yeni alıştırma eklemek

`js/data/exercises.js` içine:

```js
add('benim1', { title: 'Benim alıştırmam', key: 0, time: [4, 4], tempo: 70,
  rh: 'c4:4_1 d4_2 e4_3 f4_4 | g4:1_5',
  lh: 'c3:2_5 g3:2_1 | c3:1_5' });
```

Biçim: `perde:süre_parmak`. Süreler `1 2 4 8 16`, noktalı `4.`. `!` stakato, `~` bağ, `(` `)` legato yayı, `<c3 e3 g3>:2` akor, `r:4` sus, `|` ölçü çizgisi, `//` aynı porteye ikinci ses. Süre yazılmazsa bir önceki süre geçerlidir. Bemol `bb3`, diyez `f#3`.

Sonra `js/data/curriculum.js` içine bir ders satırı ekle. `sw.js` dosyasındaki `V` sürüm metnini değiştirirsen telefonlar yeni dosyaları alır.

## Yapı

`js/notation` nota ayrıştırma ve SVG dizgi, `js/audio` ses ve girişler, `js/gen` eşlik/şan/deşifre üreticileri, `js/data` ders ve notalar, `js/ui` ekranlar. Derleme adımı yok, dış kütüphane yok.

## Lisans notları

- Notalar [Mutopia Project](https://www.mutopiaproject.org) LilyPond kaynaklarından dönüştürüldü. BWV Anh. 114, 115, 116 ve BWV 846 kamu malı dizgidir. Schumann Melodie: Philippe Hézaine, CC BY-SA 2.5; bu nota verisini paylaşırsan aynı lisans geçerlidir.
- Parmak numaraları Melodie dışında bu uygulama için önerilmiştir; öğretmenin başka bir parmak verirse onu kullan.
- Piyano sesi: Musyng Kite Acoustic Grand, [midi-js-soundfonts](https://github.com/gleitz/midi-js-soundfonts) MP3 çıktısı, CC BY-SA 3.0 (`sounds/piano/KAYNAK.txt`).
- Alegreya yazı tipleri: SIL Open Font License (`fonts/OFL.txt`).
- Müzik işaretleri GNU FreeFont/FreeSerif anahatlarından alındı (GPLv3 + font exception).
- Uygulamada şarkı notası ya da sözü yoktur; yalnız akor kalıpları vardır. Enver Tufan metodunun içeriği uygulamaya alınmamıştır.
