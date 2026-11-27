**Türkçe** | [English](README.en.md)

**Canlı demo:** <https://tekw1n.github.io/istatistik-analiz-platformu/>

# Olasılık Dağılımları ve Ki-Kare Uyum İyiliği Analiz Platformu

Üniversite istatistik dersi için hazırlanmış interaktif bir web uygulaması. Arayüzün tamamı Türkçedir. Bütün hesaplamalar tarayıcıda yapılır: sunucu tarafı yoktur ve hiçbir veri cihazdan dışarı gönderilmez.

## Özellikler

- **Veri girişi:** kesikli frekans tablosu (X ≥ k açık uçlu sınıfıyla), sürekli gruplandırılmış tablo (açık uçlu ilk ve son sınıfla), ham veri ve CSV (Türkçe `;` ayraçlı ve virgül ondalıklı biçim ile standart CSV), Excel'den tablo yapıştırma, Sturges sınıflandırması, beş hazır örnek soru.
- **Dağılımlar:** Binom, Poisson, Kesikli Düzgün, Geometrik (iki tanımıyla), Bernoulli, Normal, Üstel, Sürekli Düzgün, Gamma, Log-Normal.
- **Parametre kestirimi:** Momentler Metodu (M.M.) ve En Çok Olabilirlik (EÇOK; ham veri, frekans tablosu, gruplandırılmış ve sansürlü veri) veya elle parametre girişi.
- **Ki-Kare testi:** beklenen frekanslar, kuyruk kapatma, Eᵢ < 5 olan sınıfların işlem geçmişiyle birleştirilmesi, test istatistiği, p-değeri, kritik değer ve karar.
- **Sunum:** adım adım formüller, uygulanabilir tüm dağılımların karşılaştırılması, grafikler, olasılık hesaplayıcı, yazdırılabilir A4 raporu.

## Yerel çalıştırma

Node.js 22.12 veya daha yeni bir sürüm gerekir.

```bash
npm ci
npm run dev       # geliştirme sunucusu, http://localhost:5173
npm test          # birim testleri (Vitest)
npm run build     # tip denetimi ve dist/ klasörüne üretim derlemesi
npm run preview   # üretim derlemesini sunar
```

## İstatistiksel kurallar

| Konu | Kural |
|---|---|
| Varyanslar | s², N − 1'e bölünür; moment varyansı m₂, N'e bölünür ve σ² kestiriminde her iki yöntemde de kullanılır |
| Binom | n bilinir; yalnızca p kestirilir |
| Geometrik | Varsayılan tanım deneme sayısıdır (X = 1, 2, …); başarısızlık sayısı (X = 0, 1, …) seçilebilir |
| Normal, Log-Normal | Parametre σ'dır (σ² de gösterilir) |
| Üstel, Gamma | Üstel dağılımda hız λ; Gamma dağılımında şekil α ve ölçek θ |
| Gruplandırılmış EÇOK | Σ fᵢ ln Pᵢ(θ) maksimize edilir; sınıf orta noktaları hiçbir zaman gözlem sayılmaz |
| Test sınıfları | Sürekli veride ilk ve son sınıf ±∞ yönünde açılır, böylece ΣEᵢ = N olur |
| Birleştirme | Önce alt kuyruk, sonra üst kuyruk; ardından Eᵢ < 5 olan en soldaki ara sınıf, beklenen frekansı daha küçük olan komşusuyla birleşir (eşitlikte sol komşu) |
| Serbestlik derecesi | sd = k' − 1 − m; m, test edilen veriden kestirilen parametre sayısıdır. sd ≤ 0 ise test uygulanmaz |
| Karar | p < α ise H₀ reddedilir. H₀'ın reddedilememesi dağılımın doğru olduğunu kanıtlamaz |

Parametreler, nihai test sınıflarından en çok olabilirlik yöntemiyle kestirilmediğinde p-değeri "yaklaşık" olarak işaretlenir: moment kestirimleri, sürekli ham veri, "veriden kestirildi" olarak işaretlenen elle girilmiş değerler ve sınıfları sonradan birleştirilen olabilirlik kestirimleri.

## Mimari

```text
src/
├── math/            özel fonksiyonlar, kök bulma, integral, optimizasyon, istatistikler
├── distributions/   on dağılım, dağılım kataloğu, parametre kestirimi
├── chiSquare/       sınıflar, birleştirme, test istatistiği, hipotez testi
├── features/        veri girişi, analiz, karşılaştırma, hesaplayıcı, rapor
├── components/      ortak arayüz bileşenleri ve grafikler
└── utils/           Türkçe sayı biçimlendirme
tests/               birim testleri, referans üreticiler, mimari kuralları
```

`math`, `distributions` ve `chiSquare`, React veya DOM erişimi olmayan saf TypeScript modülleridir ve yalnızca alt katmanlara bağımlıdır. `tests/architecture.test.ts` bu kuralı zorunlu tutar ve döngüsel bağımlılıkları reddeder. Geliştirme aşamalarının kararları ve geçmişi [docs/IMPLEMENTATION_PROGRESS.md](docs/IMPLEMENTATION_PROGRESS.md) dosyasındadır (İngilizce).

## Referans değerler

Sayısal referanslar, TypeScript kodundan bağımsız olarak [mpmath](https://mpmath.org/) ile üretilir. Yeniden üretmek için Python 3 ve `pip install mpmath` gerekir:

```bash
for script in tests/*/generate*references.py; do python3 "$script"; done
git diff --stat   # değişiklik beklenmez
```

## Dağıtım

`dist/` klasöründeki derleme, göreli dosya yolları kullanan statik bir sitedir; hem alan adının kökünde hem de bir alt dizinde çalışır.

### Vercel

1. [vercel.com](https://vercel.com) adresine GitHub ile giriş yapın ve **Add New… → Project** seçeneğini seçin.
2. Bu depoyu içe aktarın.
3. Algılanan ayarları değiştirmeyin: framework **Vite**, derleme komutu `npm run build`, çıktı klasörü `dist`. Ortam değişkeni gerekmez.
4. **Deploy** düğmesine basın. Sonrasında `main` dalına yapılan her push otomatik olarak yayınlanır.

Terminalden yayınlamak için: önizleme `npx vercel`, üretim `npx vercel --prod`.

### GitHub Pages

`.github/workflows/deploy-pages.yml` iş akışı testleri çalıştırır, siteyi derler ve yayınlar. Yalnızca elle başlatıldığında çalışır.

1. Depoda **Settings → Pages** sayfasını açın ve **Source** değerini **GitHub Actions** yapın.
2. **Actions → Deploy to GitHub Pages → Run workflow** ile `main` dalında çalıştırın veya `gh workflow run deploy-pages.yml` komutunu kullanın.
3. Bu deponun sitesi <https://tekw1n.github.io/istatistik-analiz-platformu/> adresindedir (kopyalanan depolarda `https://<kullanıcı>.github.io/<depo>/`).

Her `main` push'unda yayınlamak için iş akışında `on:` altına şunu ekleyin:

```yaml
  push:
    branches: [main]
```

## Bilinen sınırlamalar

- Şekil veya ortalama parametresi bir milyonun çok üzerindeyse hesap yapılamaz; uygulama sonuç göstermek yerine bunu bildirir.
- Binom dağılımında n en fazla 1.000.000, Ki-Kare testinde kesikli sınıf sayısı en fazla 10.000'dir.
- Gruplandırılmış ve sansürlü veride EÇOK sayısal olarak çözülür (bağıl hassasiyet yaklaşık 1e-7); iki parametreli gruplandırılmış kestirim, gözlem içeren en az üç sınıf gerektirir.
- Gruplandırılmış veride Sürekli Düzgün kestirimi tablo sınırlarının dışına çıkabilir; bu durumda uyarı gösterilir.
- Ham veri girişi en fazla 100.000 değerlik tek değişken kabul eder (CSV dosyaları en fazla 5 MB); birden çok satıra yayılan tırnaklı alanlar desteklenmez.
- Grafikler en fazla 60 sınıf veya 300 kesikli değer, tablolar en fazla 500 satır (rapordaki veri tablosu 200 satır) gösterir. Toplamlar tüm satırları kapsar.
- Tarayıcı denemeleri yalnızca Chromium ile yapılmıştır. Firefox, Safari, fiziksel yazıcı ve ekran okuyucu denenmemiştir. Otomatik arayüz bileşen testi yoktur.
