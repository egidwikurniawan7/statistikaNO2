/* ============================================================
   stats.js : rumus statistik dibuat sederhana supaya mudah dipelajari
   Semua fungsi menerima array angka biasa, misalnya [1, 2, 3].
   ============================================================ */

/* ---------- Statistik deskriptif ---------- */

function jumlah(a) {
  let total = 0;
  for (const v of a) total += v;
  return total;
}

function rataRata(a) {
  return jumlah(a) / a.length;
}

// Varians sampel: bagi dengan (n - 1)
function varians(a) {
  const m = rataRata(a);
  let ss = 0;
  for (const v of a) ss += (v - m) ** 2;
  return ss / (a.length - 1);
}

function simpanganBaku(a) {
  return Math.sqrt(varians(a));
}

// Kuantil dengan interpolasi linear (sama dengan numpy / Excel QUARTILE.INC)
function kuantil(a, q) {
  const urut = [...a].sort((x, y) => x - y);
  const posisi = (urut.length - 1) * q;
  const bawah = Math.floor(posisi);
  const atas = Math.ceil(posisi);
  return urut[bawah] + (urut[atas] - urut[bawah]) * (posisi - bawah);
}

function median(a) {
  return kuantil(a, 0.5);
}

function modus(a) {
  const hitung = {};
  for (const v of a) hitung[v] = (hitung[v] || 0) + 1;
  let terbanyak = 0;
  for (const k in hitung) terbanyak = Math.max(terbanyak, hitung[k]);
  return Object.keys(hitung).filter((k) => hitung[k] === terbanyak).map(Number);
}

// Kemiringan (skewness): > 0 ekor panjang di kanan, < 0 ekor panjang di kiri
function kemiringan(a) {
  const n = a.length, m = rataRata(a), s = simpanganBaku(a);
  let total = 0;
  for (const v of a) total += ((v - m) / s) ** 3;
  return (n / ((n - 1) * (n - 2))) * total;
}

// Pencilan dengan aturan IQR: di luar [Q1 - 1.5*IQR, Q3 + 1.5*IQR]
function cariPencilan(a) {
  const q1 = kuantil(a, 0.25), q3 = kuantil(a, 0.75), iqr = q3 - q1;
  const batasBawah = q1 - 1.5 * iqr, batasAtas = q3 + 1.5 * iqr;
  return a.filter((v) => v < batasBawah || v > batasAtas);
}

function ringkasan(a) {
  return {
    n: a.length,
    mean: rataRata(a),
    median: median(a),
    modus: modus(a),
    sd: simpanganBaku(a),
    varians: varians(a),
    min: Math.min(...a),
    q1: kuantil(a, 0.25),
    q3: kuantil(a, 0.75),
    max: Math.max(...a),
    skew: kemiringan(a),
    pencilan: cariPencilan(a),
  };
}

// Korelasi Pearson antara dua array
function korelasi(x, y) {
  const mx = rataRata(x), my = rataRata(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < x.length; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  return sxy / Math.sqrt(sxx * syy);
}

/* ---------- Distribusi t dan F (untuk p-value) ---------- */

function logGamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let seri = 1.000000000190015;
  for (let j = 0; j < 6; j++) seri += c[j] / ++y;
  return -tmp + Math.log((2.5066282746310005 * seri) / x);
}

// Fungsi beta tak-lengkap terregulasi I_x(a, b) (metode continued fraction)
function betaTakLengkap(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const depan = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (depan * pecahanBeta(x, a, b)) / a;
  return 1 - (depan * pecahanBeta(1 - x, b, a)) / b;
}

function pecahanBeta(x, a, b) {
  const TINY = 1e-30;
  let c = 1, d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 1e-10) break;
  }
  return h;
}

// p-value dua arah untuk uji t
function pValueT(t, df) {
  return betaTakLengkap(df / (df + t * t), df / 2, 0.5);
}

// p-value untuk uji F (satu arah, ekor kanan)
function pValueF(f, df1, df2) {
  return betaTakLengkap(df2 / (df2 + df1 * f), df2 / 2, df1 / 2);
}

// Nilai kritis t dua arah (alpha = 0.05) dengan pencarian biner, untuk interval kepercayaan
function tKritis(df, alpha = 0.05) {
  let bawah = 0, atas = 50;
  for (let i = 0; i < 80; i++) {
    const tengah = (bawah + atas) / 2;
    if (pValueT(tengah, df) > alpha) bawah = tengah; else atas = tengah;
  }
  return (bawah + atas) / 2;
}

/* ---------- Regresi linear sederhana: y = a + b x ---------- */

function regresiSederhana(x, y) {
  const n = x.length;
  const mx = rataRata(x), my = rataRata(y);

  // Sxx = jumlah (x - rata x)^2 ,  Sxy = jumlah (x - rata x)(y - rata y)
  let sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxx += (x[i] - mx) ** 2;
    sxy += (x[i] - mx) * (y[i] - my);
    syy += (y[i] - my) ** 2;
  }

  const b = sxy / sxx;          // kemiringan (slope)
  const a = my - b * mx;        // intersep
  const yHat = x.map((v) => a + b * v);

  let ssRes = 0;
  for (let i = 0; i < n; i++) ssRes += (y[i] - yHat[i]) ** 2;

  const r = sxy / Math.sqrt(sxx * syy);
  const r2 = 1 - ssRes / syy;
  const df = n - 2;
  const seRegresi = Math.sqrt(ssRes / df);   // standard error of estimate
  const seB = seRegresi / Math.sqrt(sxx);
  const t = b / seB;
  const p = pValueT(t, df);

  return { n, a, b, r, r2, df, seRegresi, seB, t, p, sxx, sxy, syy, mx, my, yHat };
}

/* ---------- Regresi linear berganda: y = b0 + b1 x1 + b2 x2 + ... ---------- */

// Membalik matriks dengan eliminasi Gauss-Jordan
function inversMatriks(m) {
  const n = m.length;
  const a = m.map((baris, i) => [...baris, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let kolom = 0; kolom < n; kolom++) {
    let pivot = kolom;
    for (let i = kolom + 1; i < n; i++) if (Math.abs(a[i][kolom]) > Math.abs(a[pivot][kolom])) pivot = i;
    if (Math.abs(a[pivot][kolom]) < 1e-12) throw new Error('Matriks singular: ada variabel X yang saling bergantung penuh.');
    [a[kolom], a[pivot]] = [a[pivot], a[kolom]];
    const bagi = a[kolom][kolom];
    for (let j = 0; j < 2 * n; j++) a[kolom][j] /= bagi;
    for (let i = 0; i < n; i++) {
      if (i === kolom) continue;
      const faktor = a[i][kolom];
      for (let j = 0; j < 2 * n; j++) a[i][j] -= faktor * a[kolom][j];
    }
  }
  return a.map((baris) => baris.slice(n));
}

// xList = array of array, tiap isi adalah satu variabel X (satu kolom data)
function regresiBerganda(xList, y) {
  const n = y.length, k = xList.length;

  // Matriks desain: kolom pertama angka 1 (untuk intersep)
  const X = [];
  for (let i = 0; i < n; i++) X.push([1, ...xList.map((kolom) => kolom[i])]);

  // Persamaan normal: beta = (X'X)^-1 X'y
  const xtx = Array.from({ length: k + 1 }, () => Array(k + 1).fill(0));
  const xty = Array(k + 1).fill(0);
  for (let i = 0; i < n; i++) {
    for (let p = 0; p <= k; p++) {
      xty[p] += X[i][p] * y[i];
      for (let q = 0; q <= k; q++) xtx[p][q] += X[i][p] * X[i][q];
    }
  }
  const inv = inversMatriks(xtx);
  const beta = inv.map((baris) => baris.reduce((s, v, j) => s + v * xty[j], 0));

  const yHat = X.map((baris) => baris.reduce((s, v, j) => s + v * beta[j], 0));
  const my = rataRata(y);
  let ssRes = 0, ssTot = 0;
  for (let i = 0; i < n; i++) {
    ssRes += (y[i] - yHat[i]) ** 2;
    ssTot += (y[i] - my) ** 2;
  }

  const df = n - k - 1;
  const r2 = 1 - ssRes / ssTot;
  const r2Adj = 1 - ((1 - r2) * (n - 1)) / df;
  const sigma2 = ssRes / df;
  const se = beta.map((_, j) => Math.sqrt(sigma2 * inv[j][j]));
  const t = beta.map((b, j) => b / se[j]);
  const p = t.map((v) => pValueT(v, df));
  const F = (ssTot - ssRes) / k / (ssRes / df);
  const pF = pValueF(F, k, df);

  return { n, k, df, beta, se, t, p, r2, r2Adj, F, pF, ssRes, ssTot, yHat, seRegresi: Math.sqrt(sigma2) };
}
