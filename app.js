/* ============================================================
   app.js : mengatur tampilan dashboard
   Alur: baca data -> hitung (stats.js) -> tampilkan ke halaman
   ============================================================ */

// Arti tiap kolom (dipakai untuk label dan insight)
const KETERANGAN = {
  jam: 'rata-rata jam tidur',
  tinggi: 'tinggi badan (cm)',
  berat: 'berat badan (kg)',
  Persepsi: 'persepsi kepintaran diri',
  PD: 'percaya diri',
};

// Data yang sedang dipakai
let data = {};        // contoh: { jam: [5,5,6,...], PD: [4,9,8,...] }
let kolomAngka = [];  // nama kolom yang berisi angka
let namaY = 'PD';
let namaXAktif = null;

/* ---------- Fungsi bantu format ---------- */
const fmt = (v, d = 2) => (Number.isFinite(v) ? v.toFixed(d).replace('.', ',') : '-');
const fmtP = (p) => (p < 0.001 ? '< 0,001' : fmt(p, 3));
const $ = (id) => document.getElementById(id);
const label = (nama) => (KETERANGAN[nama] ? `${nama} (${KETERANGAN[nama]})` : nama);
const signifikan = (p) => p < 0.05;
const tandaSignifikan = (p) => (signifikan(p) ? '<span class="ya">Signifikan</span>' : '<span class="tidak">Tidak</span>');

// Kata untuk kekuatan korelasi
function kekuatan(r) {
  const a = Math.abs(r);
  if (a < 0.2) return 'sangat lemah';
  if (a < 0.4) return 'lemah';
  if (a < 0.6) return 'sedang';
  if (a < 0.8) return 'kuat';
  return 'sangat kuat';
}
const arah = (r) => (r >= 0 ? 'positif' : 'negatif');

/* ---------- Membaca CSV ---------- */
function bacaCsv(teks) {
  const baris = teks.replace(/^﻿/, '').trim().split(/\r?\n/);
  const pemisah = baris[0].includes(';') ? ';' : ',';
  const judul = baris[0].split(pemisah).map((s) => s.trim());
  const isi = baris.slice(1).map((b) => b.split(pemisah).map((s) => s.trim().replace(',', '.')));

  const hasil = {};
  judul.forEach((nama, j) => {
    const nilai = isi.map((b) => Number(b[j]));
    // Kolom dianggap angka kalau semua barisnya bisa jadi angka (Timestamp otomatis terbuang)
    if (nilai.every((v) => Number.isFinite(v))) hasil[nama] = nilai;
  });
  return hasil;
}

function pakaiData(teks) {
  data = bacaCsv(teks);
  kolomAngka = Object.keys(data);
  if (kolomAngka.length < 2) {
    alert('CSV harus punya minimal 2 kolom angka.');
    return;
  }
  namaY = kolomAngka.includes('PD') ? 'PD' : kolomAngka[kolomAngka.length - 1];
  $('pilihY').innerHTML = kolomAngka.map((k) => `<option value="${k}" ${k === namaY ? 'selected' : ''}>${k}</option>`).join('');
  tampilkanSemua();
}

function namaXSemua() {
  return kolomAngka.filter((k) => k !== namaY);
}

/* ---------- Tampilkan semua bagian ---------- */
function tampilkanSemua() {
  const xs = namaXSemua();
  if (!xs.includes(namaXAktif)) namaXAktif = xs[0];
  tampilData();
  tampilDeskriptif();
  tampilBandingSederhana();
  tampilTab();
  tampilSederhana();
  tampilBerganda();
}

/* ============================================================
   1. DATA
   ============================================================ */
function tampilData() {
  const n = data[namaY].length;
  $('infoData').textContent = `${n} responden, ${kolomAngka.length} variabel angka`;
  $('keteranganVariabel').innerHTML = kolomAngka.map((k) => `<span><b>${k}</b>${KETERANGAN[k] ? ': ' + KETERANGAN[k] : ''}</span>`).join('');

  let html = '<thead><tr><th>No</th>' + kolomAngka.map((k) => `<th>${k}</th>`).join('') + '</tr></thead><tbody>';
  for (let i = 0; i < n; i++) {
    html += `<tr><td>${i + 1}</td>` + kolomAngka.map((k) => `<td>${data[k][i]}</td>`).join('') + '</tr>';
  }
  $('tabelData').innerHTML = html + '</tbody>';
}

/* ============================================================
   2a. STATISTIK DESKRIPTIF
   ============================================================ */
function tampilDeskriptif() {
  const baris = [
    ['Jumlah data (n)', 'n', 0], ['Rata-rata', 'mean'], ['Median', 'median'], ['Simpangan baku', 'sd'],
    ['Varians', 'varians'], ['Minimum', 'min'], ['Kuartil 1 (Q1)', 'q1'], ['Kuartil 3 (Q3)', 'q3'],
    ['Maksimum', 'max'], ['Kemiringan (skewness)', 'skew'],
  ];
  const ring = {};
  kolomAngka.forEach((k) => (ring[k] = ringkasan(data[k])));

  let html = '<thead><tr><th>Statistik</th>' + kolomAngka.map((k) => `<th>${k}</th>`).join('') + '</tr></thead><tbody>';
  for (const [nama, kunci, desimal] of baris) {
    html += `<tr><td>${nama}</td>` + kolomAngka.map((k) => `<td>${fmt(ring[k][kunci], desimal ?? 2)}</td>`).join('') + '</tr>';
  }
  html += '<tr><td>Modus</td>' + kolomAngka.map((k) => `<td>${ring[k].modus.join(', ')}</td>`).join('') + '</tr>';
  html += '<tr><td>Pencilan (aturan IQR)</td>' + kolomAngka.map((k) => `<td>${ring[k].pencilan.length ? ring[k].pencilan.join(', ') : '-'}</td>`).join('') + '</tr>';
  $('tabelDeskriptif').innerHTML = html + '</tbody>';

  // Histogram tiap variabel
  $('gridHistogram').innerHTML = kolomAngka.map((k) => `<div id="hist-${k}" style="height:230px"></div>`).join('');
  kolomAngka.forEach((k) => {
    Plotly.newPlot(`hist-${k}`, [{
      x: data[k], type: 'histogram', marker: { color: k === namaY ? '#3d5afe' : '#9aa7ff' },
    }], tataLetak(k), { displayModeBar: false, responsive: true });
  });

  tampilInsightDeskriptif(ring);
}

function tampilInsightDeskriptif(ring) {
  const y = ring[namaY];
  const daftar = [];

  daftar.push(`<b>Gambaran ${namaY}.</b> Dari ${y.n} responden, rata-rata ${namaY} = ${fmt(y.mean)} (simpangan baku ${fmt(y.sd)}), median ${fmt(y.median)}, rentang ${y.min} sampai ${y.max}.`);

  if (y.skew < -0.5) daftar.push(`Median (${fmt(y.median)}) lebih tinggi dari rata-rata (${fmt(y.mean)}) dan kemiringan negatif (${fmt(y.skew)}): sebagian besar responden mengisi ${namaY} di angka tinggi, ditarik turun oleh sebagian kecil yang rendah.`);
  else if (y.skew > 0.5) daftar.push(`Kemiringan positif (${fmt(y.skew)}): sebagian besar responden ${namaY}-nya rendah, ditarik naik oleh sebagian kecil yang tinggi.`);
  else daftar.push(`Sebaran ${namaY} cukup simetris (kemiringan ${fmt(y.skew)}).`);

  const adaPencilan = kolomAngka.filter((k) => ring[k].pencilan.length > 0);
  if (adaPencilan.length) {
    daftar.push(`<b>Pencilan:</b> ` + adaPencilan.map((k) => `${k} (${ring[k].pencilan.join(', ')})`).join('; ') + '. Nilai ekstrem seperti ini bisa mempengaruhi rata-rata dan garis regresi, jadi perlu dicek apakah benar atau salah input.');
  } else {
    daftar.push('Tidak ada pencilan berdasarkan aturan IQR.');
  }

  // Variabel paling beragam (koefisien variasi = sd / rata-rata)
  const cv = namaXSemua().map((k) => ({ k, nilai: ring[k].sd / ring[k].mean }));
  cv.sort((a, b) => b.nilai - a.nilai);
  daftar.push(`Variabel X yang paling beragam (koefisien variasi tertinggi) adalah <b>${cv[0].k}</b> (${fmt(cv[0].nilai * 100, 1)}%), sedangkan paling seragam adalah <b>${cv[cv.length - 1].k}</b> (${fmt(cv[cv.length - 1].nilai * 100, 1)}%).`);

  // Korelasi dengan Y
  const kor = namaXSemua().map((k) => ({ k, r: korelasi(data[k], data[namaY]) }));
  kor.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  daftar.push(`<b>Hubungan dengan ${namaY}:</b> ` + kor.map((o) => `${o.k} (r = ${fmt(o.r)}, ${kekuatan(o.r)} ${arah(o.r)})`).join('; ') + '.');
  daftar.push(`Variabel dengan hubungan terkuat terhadap ${namaY} adalah <b>${label(kor[0].k)}</b>; hubungan variabel lain dengan ${namaY} paling tinggi hanya ${kekuatan(kor[1].r)} (r = ${fmt(kor[1].r)}).`);

  $('insightDeskriptif').innerHTML = daftar.map((t) => `<li>${t}</li>`).join('');
}

/* ============================================================
   2b. REGRESI SEDERHANA
   ============================================================ */
function tampilBandingSederhana() {
  let html = '<thead><tr><th>Variabel X</th><th>a (intersep)</th><th>b (slope)</th><th>r</th><th>R²</th><th>t</th><th>p-value</th><th>Signifikan?</th></tr></thead><tbody>';
  for (const x of namaXSemua()) {
    const m = regresiSederhana(data[x], data[namaY]);
    html += `<tr class="${x === namaXAktif ? 'pilih' : ''}"><td>${x}</td><td>${fmt(m.a, 3)}</td><td>${fmt(m.b, 3)}</td><td>${fmt(m.r, 3)}</td><td>${fmt(m.r2, 3)}</td><td>${fmt(m.t, 2)}</td><td>${fmtP(m.p)}</td><td>${tandaSignifikan(m.p)}</td></tr>`;
  }
  $('tabelBandingSederhana').innerHTML = html + '</tbody>';
}

function tampilTab() {
  $('tabX').innerHTML = namaXSemua().map((x) => `<button class="${x === namaXAktif ? 'aktif' : ''}" data-x="${x}">${x}</button>`).join('');
  document.querySelectorAll('#tabX button').forEach((tombol) => {
    tombol.addEventListener('click', () => {
      namaXAktif = tombol.dataset.x;
      tampilBandingSederhana();
      tampilTab();
      tampilSederhana();
    });
  });
}

function tampilSederhana() {
  const x = data[namaXAktif], y = data[namaY];
  const m = regresiSederhana(x, y);

  // Scatter plot + garis regresi
  const xMin = Math.min(...x), xMax = Math.max(...x);
  Plotly.newPlot('plotSederhana', [
    { x, y, mode: 'markers', name: 'Data', marker: { color: '#3d5afe', size: 9, opacity: 0.7 } },
    { x: [xMin, xMax], y: [m.a + m.b * xMin, m.a + m.b * xMax], mode: 'lines', name: 'Garis regresi', line: { color: '#e5484d', width: 3 } },
  ], tataLetak(`${namaXAktif} vs ${namaY}`, namaXAktif, namaY), { displayModeBar: false, responsive: true });

  // Persamaan dan interpretasi
  const tanda = m.b >= 0 ? '+' : '−';
  const naikTurun = m.b >= 0 ? 'naik' : 'turun';
  $('hasilSederhana').innerHTML = `
    <div class="persamaan">${namaY} = ${fmt(m.a, 3)} ${tanda} ${fmt(Math.abs(m.b), 3)} × ${namaXAktif}</div>
    <div class="kpi-row">
      <div class="kpi"><b>${fmt(m.r, 3)}</b><span>korelasi r (${kekuatan(m.r)}, ${arah(m.r)})</span></div>
      <div class="kpi"><b>${fmt(m.r2 * 100, 1)}%</b><span>R²: variasi ${namaY} yang dijelaskan</span></div>
      <div class="kpi"><b>${fmtP(m.p)}</b><span>p-value (${signifikan(m.p) ? 'signifikan' : 'tidak signifikan'})</span></div>
    </div>
    <ul class="insight">
      <li>Setiap ${namaXAktif} bertambah 1 satuan, ${namaY} rata-rata ${naikTurun} <b>${fmt(Math.abs(m.b), 3)}</b>.</li>
      <li>${namaXAktif} hanya menjelaskan <b>${fmt(m.r2 * 100, 1)}%</b> variasi ${namaY}; sisanya (${fmt(100 - m.r2 * 100, 1)}%) dipengaruhi hal lain.</li>
      <li>${signifikan(m.p)
        ? `Karena p = ${fmtP(m.p)} &lt; 0,05, hubungan ini <b>signifikan</b> secara statistik.`
        : `Karena p = ${fmtP(m.p)} ≥ 0,05, hubungan ini <b>tidak signifikan</b>: pola yang terlihat bisa saja kebetulan.`}</li>
    </ul>`;

  // Kolom input prediksi
  $('labelPrediksiS').textContent = `Nilai ${namaXAktif}:`;
  const input = $('inputPrediksiS');
  input.value = fmt(m.mx, 1).replace(',', '.');
  input.oninput = () => hitungPrediksiSederhana(m, x);
  hitungPrediksiSederhana(m, x);

  tampilManualSederhana(m);
}

function hitungPrediksiSederhana(m, x) {
  const nilaiX = Number($('inputPrediksiS').value);
  if ($('inputPrediksiS').value === '' || !Number.isFinite(nilaiX)) {
    $('hasilPrediksiS').textContent = 'Isi angka untuk melihat prediksi.';
    return;
  }
  const prediksi = m.a + m.b * nilaiX;
  // Rentang prediksi 95% untuk satu individu baru
  const sePrediksi = m.seRegresi * Math.sqrt(1 + 1 / m.n + (nilaiX - m.mx) ** 2 / m.sxx);
  const rentang = tKritis(m.df) * sePrediksi;
  const diLuar = nilaiX < Math.min(...x) || nilaiX > Math.max(...x);
  $('hasilPrediksiS').innerHTML = `Prediksi ${namaY} = <b>${fmt(prediksi, 2)}</b> (rentang 95%: ${fmt(prediksi - rentang, 2)} sampai ${fmt(prediksi + rentang, 2)})`
    + (diLuar ? `<br><span class="tidak">Perhatian: nilai ini di luar rentang data (${Math.min(...x)}–${Math.max(...x)}), prediksi kurang dapat dipercaya.</span>` : '');
}

function tampilManualSederhana(m) {
  $('manualSederhana').innerHTML = `
    <ol>
      <li>Hitung rata-rata: x̄ = <b>${fmt(m.mx, 4)}</b>, ȳ = <b>${fmt(m.my, 4)}</b></li>
      <li>Hitung Σ(x − x̄)² = <b>${fmt(m.sxx, 4)}</b> dan Σ(x − x̄)(y − ȳ) = <b>${fmt(m.sxy, 4)}</b></li>
      <li>Slope b = Σ(x − x̄)(y − ȳ) / Σ(x − x̄)² = ${fmt(m.sxy, 4)} / ${fmt(m.sxx, 4)} = <b>${fmt(m.b, 4)}</b></li>
      <li>Intersep a = ȳ − b·x̄ = ${fmt(m.my, 4)} − (${fmt(m.b, 4)} × ${fmt(m.mx, 4)}) = <b>${fmt(m.a, 4)}</b></li>
      <li>Persamaan: ŷ = ${fmt(m.a, 4)} ${m.b >= 0 ? '+' : '−'} ${fmt(Math.abs(m.b), 4)}x</li>
    </ol>`;
}

/* ============================================================
   2c. REGRESI BERGANDA
   ============================================================ */
function tampilBerganda() {
  const xs = namaXSemua();
  const y = data[namaY];
  let m;
  try {
    m = regresiBerganda(xs.map((k) => data[k]), y);
  } catch (e) {
    $('rumusBerganda').textContent = e.message;
    return;
  }

  $('rumusBerganda').innerHTML = `Model: <b>${namaY}</b> dipengaruhi oleh ${xs.map((k) => `<b>${k}</b>`).join(', ')} sekaligus.`;

  $('kpiBerganda').innerHTML = `
    <div class="kpi"><b>${fmt(m.r2, 3)}</b><span>R²</span></div>
    <div class="kpi"><b>${fmt(m.r2Adj, 3)}</b><span>Adjusted R²</span></div>
    <div class="kpi"><b>${fmt(m.F, 2)}</b><span>F-statistik</span></div>
    <div class="kpi"><b>${fmtP(m.pF)}</b><span>p-value F (model ${signifikan(m.pF) ? 'signifikan' : 'tidak signifikan'})</span></div>
    <div class="kpi"><b>${m.n}</b><span>jumlah data</span></div>`;

  // Tabel koefisien. Beta standar = b * sd(x) / sd(y), supaya variabel beda satuan bisa dibandingkan
  const sdY = simpanganBaku(y);
  let html = '<thead><tr><th>Variabel</th><th>Koefisien</th><th>Std. error</th><th>t</th><th>p-value</th><th>Beta standar</th><th>Signifikan?</th></tr></thead><tbody>';
  html += `<tr><td>Konstanta</td><td>${fmt(m.beta[0], 4)}</td><td>${fmt(m.se[0], 4)}</td><td>${fmt(m.t[0], 2)}</td><td>${fmtP(m.p[0])}</td><td>-</td><td>${tandaSignifikan(m.p[0])}</td></tr>`;
  const betaStandar = [];
  xs.forEach((k, i) => {
    const bs = (m.beta[i + 1] * simpanganBaku(data[k])) / sdY;
    betaStandar.push(bs);
    html += `<tr><td>${k}</td><td>${fmt(m.beta[i + 1], 4)}</td><td>${fmt(m.se[i + 1], 4)}</td><td>${fmt(m.t[i + 1], 2)}</td><td>${fmtP(m.p[i + 1])}</td><td>${fmt(bs, 3)}</td><td>${tandaSignifikan(m.p[i + 1])}</td></tr>`;
  });
  $('tabelBerganda').innerHTML = html + '</tbody>';

  // Grafik nilai aktual vs prediksi
  const batas = [Math.min(...y, ...m.yHat), Math.max(...y, ...m.yHat)];
  Plotly.newPlot('plotAktualPrediksi', [
    { x: y, y: m.yHat, mode: 'markers', name: 'Responden', marker: { color: '#3d5afe', size: 9, opacity: 0.7 } },
    { x: batas, y: batas, mode: 'lines', name: 'Prediksi = aktual', line: { color: '#e5484d', dash: 'dash' } },
  ], tataLetak(`${namaY}: aktual vs prediksi`, `${namaY} aktual`, `${namaY} prediksi`), { displayModeBar: false, responsive: true });

  // Grafik R²: tiap X sendiri vs gabungan
  const nama = [...xs, 'Gabungan'];
  const r2 = [...xs.map((k) => regresiSederhana(data[k], y).r2), m.r2];
  Plotly.newPlot('plotR2', [{
    x: nama, y: r2, type: 'bar', text: r2.map((v) => fmt(v, 3)), textposition: 'outside',
    marker: { color: nama.map((n) => (n === 'Gabungan' ? '#e5484d' : '#3d5afe')) },
  }], { ...tataLetak('R²: satu variabel vs gabungan', '', 'R²'), yaxis: { title: 'R²', range: [0, Math.max(...r2) * 1.25] } }, { displayModeBar: false, responsive: true });

  tampilInsightRegresi(m, xs, betaStandar);
  tampilSimulasi(m, xs);
  tampilHeatmap();
}

function tampilInsightRegresi(m, xs, betaStandar) {
  const daftar = [];
  const sig = xs.filter((_, i) => signifikan(m.p[i + 1]));

  daftar.push(`Model gabungan menjelaskan <b>${fmt(m.r2 * 100, 1)}%</b> variasi ${namaY} (Adjusted R² = ${fmt(m.r2Adj * 100, 1)}%). Adjusted R² lebih kecil karena menghukum variabel yang tidak banyak membantu.`);
  daftar.push(signifikan(m.pF)
    ? `Uji F signifikan (p = ${fmtP(m.pF)}): secara bersama-sama, variabel X mempengaruhi ${namaY}.`
    : `Uji F tidak signifikan (p = ${fmtP(m.pF)}): secara bersama-sama, variabel X belum terbukti mempengaruhi ${namaY}.`);

  if (sig.length) {
    daftar.push(`Variabel yang berpengaruh signifikan terhadap ${namaY}: ` + sig.map((k) => {
      const i = xs.indexOf(k);
      return `<b>${label(k)}</b> (koefisien ${fmt(m.beta[i + 1], 3)}, p = ${fmtP(m.p[i + 1])})`;
    }).join('; ') + '.');
  } else {
    daftar.push('Tidak ada variabel yang signifikan secara individu.');
  }
  if (!signifikan(m.pF) && sig.length) daftar.push('Catatan: uji F tidak signifikan padahal ada satu variabel yang signifikan. Ini terjadi karena variabel lain menambah "kebisingan" tanpa menambah penjelasan, sehingga kekuatan model secara keseluruhan melemah.');
  const tidakSig = xs.filter((k) => !sig.includes(k));
  if (tidakSig.length) daftar.push(`Variabel yang tidak signifikan setelah variabel lain dikontrol: ${tidakSig.map((k) => `<b>${k}</b>`).join(', ')}.`);

  // Variabel paling dominan berdasarkan beta standar
  let terbesar = 0;
  betaStandar.forEach((b, i) => { if (Math.abs(b) > Math.abs(betaStandar[terbesar])) terbesar = i; });
  daftar.push(`Berdasarkan beta standar, pengaruh paling besar berasal dari <b>${xs[terbesar]}</b> (${fmt(betaStandar[terbesar], 3)}).`);

  const r2Terbaik = Math.max(...xs.map((k) => regresiSederhana(data[k], data[namaY]).r2));
  if (m.r2 - r2Terbaik < 0.1) daftar.push(`Menambah variabel lain hanya menaikkan R² dari ${fmt(r2Terbaik, 3)} (variabel terbaik sendirian) menjadi ${fmt(m.r2, 3)}. Tambahan itu kecil, jadi model sederhana dengan satu variabel hampir sama baiknya.`);
  daftar.push(`Rata-rata kesalahan prediksi (standard error regresi) sekitar ±${fmt(m.seRegresi, 2)} poin ${namaY}.`);

  $('insightRegresi').innerHTML = daftar.map((t) => `<li>${t}</li>`).join('');
}

function tampilSimulasi(m, xs) {
  $('sliderBerganda').innerHTML = xs.map((k, i) => {
    const nilai = data[k];
    const mn = Math.min(...nilai), mx = Math.max(...nilai);
    const awal = Math.round(rataRata(nilai));
    return `<div><label for="geser-${i}"><b>${k}</b>: <span id="nilai-${i}">${awal}</span></label>
      <input type="range" id="geser-${i}" min="${mn}" max="${mx}" step="1" value="${awal}"></div>`;
  }).join('');

  const hitung = () => {
    let prediksi = m.beta[0];
    xs.forEach((_, i) => {
      const v = Number($(`geser-${i}`).value);
      $(`nilai-${i}`).textContent = v;
      prediksi += m.beta[i + 1] * v;
    });
    $('hasilPrediksiB').innerHTML = `Prediksi ${namaY} = <b>${fmt(prediksi, 2)}</b>`;
  };
  xs.forEach((_, i) => $(`geser-${i}`).addEventListener('input', hitung));
  hitung();
}

function tampilHeatmap() {
  const semua = kolomAngka;
  const z = semua.map((a) => semua.map((b) => korelasi(data[a], data[b])));
  Plotly.newPlot('plotHeatmap', [{
    z, x: semua, y: semua, type: 'heatmap', zmin: -1, zmax: 1,
    colorscale: [[0, '#e5484d'], [0.5, '#ffffff'], [1, '#3d5afe']],
    text: z.map((baris) => baris.map((v) => fmt(v, 2))), texttemplate: '%{text}',
  }], { ...tataLetak('Matriks korelasi'), margin: { t: 38, r: 14, b: 42, l: 80 }, yaxis: { autorange: 'reversed' } }, { displayModeBar: false, responsive: true });
}

/* ---------- Tampilan grafik yang seragam ---------- */
function tataLetak(judul, labelX = '', labelY = '') {
  return {
    title: { text: judul, font: { size: 13 } },
    margin: { t: 38, r: 14, b: 42, l: 46 },
    xaxis: { title: labelX },
    yaxis: { title: labelY },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: { family: 'Inter, sans-serif' },
    showlegend: false,
  };
}

/* ============================================================
   Mulai
   ============================================================ */
$('pilihY').addEventListener('change', (e) => {
  namaY = e.target.value;
  tampilkanSemua();
});

$('fileCsv').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const pembaca = new FileReader();
  pembaca.onload = () => pakaiData(pembaca.result);
  pembaca.readAsText(file);
});

pakaiData(DATA_BAWAAN);
