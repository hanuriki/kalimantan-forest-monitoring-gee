// 1. Menentukan Koordinat Lokasi Studi (Hutan Ketapang, Kalimantan Barat)
var koordinatHutan = ee.Geometry.Point([110.50, -1.80]);
Map.setCenter(110.50, -1.80, 11);

// 2. Fungsi Cloud Masking Sentinel-2 SCL (Standar Pembersihan Awan Tropis)
function maskS2clouds(image) {
  var scl = image.select('SCL');
  // Memilih hanya piksel vegetasi lebat (4) dan tanah bersih (5)
  var mask = scl.eq(4).or(scl.eq(5)); 
  return image.updateMask(mask).divide(10000)
              .copyProperties(image, ['system:time_start']);
}

// 3. Mengambil Data Satelit Periode Panjang (2019 - 2025)
var s2Collection = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
                      .filterBounds(koordinatHutan)
                      .filterDate('2019-01-01', '2025-12-31')
                      .map(maskS2clouds);

// 4. Menghitung Indeks NDMI Sesuai Algoritma Kursus (NIR vs SWIR)
var addNDMI = function(image) {
  var ndmi = image.normalizedDifference(['B8', 'B11']).rename('NDMI');
  return image.addBands(ndmi);
};

// Proses menghitung indeks ke seluruh koleksi gambar
var timeSeriesNDMI = s2Collection.map(addNDMI);

// =========================================================================
// 📉 BAGIAN EVALUASI: MEMBUAT GRAFIK TIME SERIES NDMI (METODE EO COLLEGE)
// =========================================================================
var chart = ui.Chart.image.series({
  imageCollection: timeSeriesNDMI.select('NDMI'),
  region: koordinatHutan,
  reducer: ee.Reducer.mean(),
  scale: 10,
  xProperty: 'system:time_start'
}).setOptions({
     title: 'Grafik Deret Waktu NDMI: Deteksi Deforestasi Hutan Ketapang, Kalimantan',
     vAxis: {title: 'Nilai Kandungan Air Kanopi (NDMI)', minValue: -0.2, maxValue: 0.8},
     hAxis: {title: 'Tahun Pengamatan (2019-2025)'},
     lineWidth: 1,
     pointSize: 3,
     series: {0: {color: '0000FF'}} // Warna biru melambangkan indeks kelembapan
});

print(chart); // Grafik otomatis muncul di tab Console kanan atas monitor Anda!
// =========================================================================

// 5. Menampilkan Peta Hasil Akhir Kerapatan Hutan Kualitatif
var finalComposite = timeSeriesNDMI.filterDate('2025-01-01', '2025-12-31').median();
var ndmiParams = {min: 0, max: 0.6, palette: ['brown', 'yellow', 'green', 'darkgreen']};
Map.addLayer(finalComposite.select('NDMI'), ndmiParams, 'Peta Kondisi NDMI Hutan Terakhir (2025)');
