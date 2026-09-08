const $ = (id) => document.getElementById(id);

const LS_KEY_RATE = 'ncm_rate';
const FIXED_BIZ_NAME = 'OMB Charge';

const rupiah = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmtKwh = (n) => (Math.round(n * 100) / 100).toString() + ' kWh';
const padNota = (n) => '#' + String(n).padStart(4, '0');

function formatDateTime(d) {
  const tgl = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return tgl + ' · ' + jam;
}

let pickedMember = null; // {id_anggota, nama}
let lastTx = null;

// ---- setup persisted fields ----
const rateInput = $('input-rate');
const savedRate = localStorage.getItem(LS_KEY_RATE);
if (savedRate) rateInput.value = savedRate;
['input', 'change', 'keyup'].forEach(ev => rateInput.addEventListener(ev, () => {
  localStorage.setItem(LS_KEY_RATE, rateInput.value || '0');
  updatePreview();
}));

const kwhInput = $('input-kwh');
['input', 'change', 'keyup'].forEach(ev => kwhInput.addEventListener(ev, updatePreview));

function currentTotal() {
  const kwh = parseFloat(kwhInput.value) || 0;
  const rate = parseFloat(rateInput.value) || 0;
  return kwh * rate;
}
function updatePreview() {
  $('preview-total').textContent = rupiah(currentTotal());
}
function tickClock() {
  $('preview-datetime').textContent = formatDateTime(new Date());
}
tickClock();
setInterval(tickClock, 15000);
updatePreview();

// ---- member search ----
let searchTimer;
$('input-search').addEventListener('input', (e) => {
  clearTimeout(searchTimer);
  const q = e.target.value;
  searchTimer = setTimeout(() => searchMember(q), 300);
});

async function searchMember(q) {
  const box = $('member-results');
  if (!q || q.trim().length < 2) {
    box.innerHTML = '';
    return;
  }
  const { data, error } = await supabaseClient
    .from('anggota_omb_public')
    .select('*')
    .or(`nama.ilike.%${q}%,nama_panggilan.ilike.%${q}%,id_anggota.ilike.%${q}%`)
    .limit(8);

  if (error) {
    box.innerHTML = `<div class="history-empty">Gagal mencari member: ${escapeHtml(error.message)}</div>`;
    return;
  }
  const results = data || [];
  box.innerHTML = results.length
    ? results.map((m) => `
        <div class="member-item" data-id="${escapeHtml(m.id_anggota)}" data-nama="${escapeHtml(m.nama)}">
          <span>${escapeHtml(m.nama)}${m.nama_panggilan ? ' (' + escapeHtml(m.nama_panggilan) + ')' : ''}</span>
          <span class="id">${escapeHtml(m.id_anggota)}</span>
        </div>
      `).join('')
    : '<div class="history-empty">Tidak ditemukan.</div>';

  box.querySelectorAll('.member-item').forEach((el) => {
    el.addEventListener('click', () => {
      pickedMember = { id_anggota: el.dataset.id, nama: el.dataset.nama };
      $('input-search').value = '';
      box.innerHTML = '';
      renderPickedMember();
    });
  });
}

async function renderPickedMember() {
  const box = $('picked-member-box');
  if (!pickedMember) {
    box.innerHTML = '';
    return;
  }
  box.innerHTML = `
    <div class="picked-member">
      <span>✅ ${escapeHtml(pickedMember.nama)} (${escapeHtml(pickedMember.id_anggota)})</span>
      <button type="button" id="clear-member-btn">Ganti</button>
    </div>
    <div class="member-stats" id="member-stats">Memuat riwayat...</div>
  `;
  $('clear-member-btn').addEventListener('click', () => {
    pickedMember = null;
    renderPickedMember();
  });

  const { count, error: errCount } = await supabaseClient
    .from('charge_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('member_id', pickedMember.id_anggota);

  const { data: sumRows, error: errSum } = await supabaseClient
    .from('charge_transactions')
    .select('kwh')
    .eq('member_id', pickedMember.id_anggota);

  const statsEl = $('member-stats');
  if (errCount || errSum) {
    statsEl.textContent = 'Riwayat tidak dapat dimuat.';
    return;
  }
  const totalKwh = (sumRows || []).reduce((sum, r) => sum + Number(r.kwh || 0), 0);
  statsEl.textContent = `Sudah ${count || 0}x charge · total ${fmtKwh(totalKwh)}`;
}

// ---- create nota ----
$('btn-create').addEventListener('click', async () => {
  const btn = $('btn-create');
  const kwh = parseFloat(kwhInput.value);
  const rate = parseFloat(rateInput.value);

  if (!pickedMember) { toast('Pilih member dulu dari pencarian'); return; }
  if (!kwh || kwh <= 0) { toast('Isi jumlah pemakaian (kWh)'); kwhInput.focus(); return; }
  if (!rate || rate <= 0) { toast('Tarif jasa belum diisi'); rateInput.focus(); return; }

  const total = kwh * rate;

  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  const { data, error } = await supabaseClient
    .from('charge_transactions')
    .insert({
      member_id: pickedMember.id_anggota,
      member_nama: pickedMember.nama,
      kwh,
      tarif: rate,
      total,
      business_name: FIXED_BIZ_NAME
    })
    .select()
    .single();

  btn.disabled = false;
  btn.textContent = 'Buat Nota';

  if (error) {
    toast('Gagal menyimpan nota: ' + error.message);
    return;
  }

  lastTx = data;
  renderReceipt(data);
  showView('receipt');
});

function renderReceipt(tx) {
  const bizNameEl = $('r-biz-name');
  if (bizNameEl) {
    bizNameEl.textContent = tx.business_name || FIXED_BIZ_NAME;
  }
  $('r-nota').textContent = padNota(tx.nota_number);
  $('r-datetime').textContent = formatDateTime(new Date(tx.created_at));
  $('r-customer').textContent = `${tx.member_nama} (${tx.member_id})`;
  $('r-kwh').textContent = fmtKwh(tx.kwh);
  $('r-rate').textContent = rupiah(tx.tarif);
  $('r-total').textContent = rupiah(tx.total);
  $('r-qris-amount').textContent = rupiah(tx.total);

  // 1. Buat string payload QRIS Dinamis
  const dynamicPayload = buildDynamicQris(QRIS_STATIC, tx.total);
  
  const qrisBlock = document.querySelector('.qris-block');

  // Bersihkan pesan error jika ada
  qrisBlock.querySelectorAll('.qris-error').forEach((el) => el.remove());

  // 2. Sembunyikan canvas bawaan yang bikin gambar rentan buram
  const oldCanvas = $('r-qris-canvas');
  if (oldCanvas) {
    oldCanvas.style.display = 'none';
  }

  // 3. Gunakan elemen <img> untuk menarik QR dari Server API
  let qrImg = document.getElementById('r-qris-img');
  if (!qrImg) {
    qrImg = document.createElement('img');
    qrImg.id = 'r-qris-img';
    
    qrImg.crossOrigin = 'anonymous'; 
    qrImg.style.width = '220px';
    qrImg.style.height = '220px';
    qrImg.style.display = 'block';
    qrImg.style.margin = '0 auto';
    
    qrisBlock.insertBefore(qrImg, qrisBlock.firstChild);
  }

  // 4. Request gambar QR beresolusi tinggi langsung dari API
  const apiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=2&data=${encodeURIComponent(dynamicPayload)}`;
  qrImg.src = apiUrl;
}

$('btn-new').addEventListener('click', () => {
  pickedMember = null;
  renderPickedMember();
  kwhInput.value = '';
  updatePreview();
  showView('form');
});

$('btn-view-member-history').addEventListener('click', () => {
  if (!lastTx) return;
  location.href = `riwayat.html?member=${encodeURIComponent(lastTx.member_id)}`;
});
$('btn-open-history').addEventListener('click', () => {
  location.href = 'riwayat.html';
});

$('btn-share').addEventListener('click', async () => {
  if (!lastTx) return;
  const btn = $('btn-share');
  const receiptEl = document.querySelector('#view-receipt .receipt');

  btn.disabled = true;
  btn.textContent = 'Menyiapkan gambar...';

  try {
    const canvas = await html2canvas(receiptEl, { backgroundColor: '#FBF8EE', scale: 2, useCORS: true });
    canvas.toBlob(async (blob) => {
      btn.disabled = false;
      btn.textContent = 'Bagikan';
      if (!blob) { toast('Gagal membuat gambar nota'); return; }

      const fileName = `nota-${padNota(lastTx.nota_number)}.png`;
      const file = new File([blob], fileName, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({ files: [file], title: 'Nota Biaya Jasa Charge' });
        } catch (e) { /* dibatalkan */ }
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        toast('Gambar nota tersimpan ke HP');
      }
    }, 'image/png');
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'Bagikan';
    toast('Gagal membuat gambar nota');
  }
});

function showView(name) {
  $('view-form').classList.toggle('hidden', name !== 'form');
  $('view-receipt').classList.toggle('hidden', name !== 'receipt');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// ---- guard page ----
requireAdmin();
