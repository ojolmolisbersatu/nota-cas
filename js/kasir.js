const $ = (id) => document.getElementById(id);

const LS_KEY_RATE = 'ncm_rate';
const LS_KEY_NAME = 'ncm_biz_name';

const rupiah = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmtKwh = (n) => (Math.round(n * 100) / 100).toString() + ' kWh';
const padNota = (n) => '#' + String(n).padStart(4, '0');

function formatDateTime(d) {
  const tgl = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return tgl + ' · ' + jam;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let pickedMember = null; // {id_anggota, nama}
let lastTx = null;

// ---- setup persisted fields ----
const bizNameInput = $('biz-name');
if (bizNameInput) {
  bizNameInput.value = localStorage.getItem(LS_KEY_NAME) || '';
  bizNameInput.addEventListener('input', () => localStorage.setItem(LS_KEY_NAME, bizNameInput.value));
}

const rateInput = $('input-rate');
if (rateInput) {
  const savedRate = localStorage.getItem(LS_KEY_RATE);
  if (savedRate) rateInput.value = savedRate;
  ['input', 'change', 'keyup'].forEach(ev => rateInput.addEventListener(ev, () => {
    localStorage.setItem(LS_KEY_RATE, rateInput.value || '0');
    updatePreview();
  }));
}

const kwhInput = $('input-kwh');
if (kwhInput) {
  ['input', 'change', 'keyup'].forEach(ev => kwhInput.addEventListener(ev, updatePreview));
}

function currentTotal() {
  const kwh = parseFloat(kwhInput.value) || 0;
  const rate = parseFloat(rateInput.value) || 0;
  return kwh * rate;
}
function updatePreview() {
  const totalEl = $('preview-total');
  if (totalEl) totalEl.textContent = rupiah(currentTotal());
}
function tickClock() {
  const dtEl = $('preview-datetime');
  if (dtEl) dtEl.textContent = formatDateTime(new Date());
}
tickClock();
setInterval(tickClock, 15000);
updatePreview();

// ---- member search ----
let searchTimer;
const searchInput = $('input-search');
if (searchInput) {
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimer);
    const q = e.target.value;
    searchTimer = setTimeout(() => searchMember(q), 300);
  });
}

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
const btnCreate = $('btn-create');
if (btnCreate) {
  btnCreate.addEventListener('click', async () => {
    const btn = $('btn-create');
    const kwh = parseFloat(kwhInput.value);
    const rate = parseFloat(rateInput.value);

    if (!pickedMember) { toast('Pilih member dulu dari pencarian'); return; }
    if (!kwh || kwh <= 0) { toast('Isi jumlah pemakaian (kWh)'); kwhInput.focus(); return; }
    if (!rate || rate <= 0) { toast('Tarif jasa belum diisi'); rateInput.focus(); return; }

    const bizName = bizNameInput.value.trim() || 'Nama Usaha';
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
        business_name: bizName
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
}

function renderReceipt(tx) {
  $('r-biz-name').textContent = tx.business_name || 'Nama Usaha';
  $('r-nota').textContent = padNota(tx.nota_number);
  $('r-datetime').textContent = formatDateTime(new Date(tx.created_at));
  $('r-customer').textContent = `${tx.member_nama} (${tx.member_id})`;
  $('r-kwh').textContent = fmtKwh(tx.kwh);
  $('r-rate').textContent = rupiah(tx.tarif);
  $('r-total').textContent = rupiah(tx.total);
  $('r-qris-amount').textContent = rupiah(tx.total);

  const dynamicPayload = buildDynamicQris(QRIS_STATIC, tx.total);
  const canvas = $('r-qris-canvas');
  const qrisBlock = document.querySelector('.qris-block');

  // Clear existing error notice if any
  const oldErr = qrisBlock.querySelector('.qris-error');
  if (oldErr) oldErr.remove();

  let rendered = false;

  // Attempt 1: qrcode node package (npm window.QRCode with toCanvas)
  if (typeof QRCode !== 'undefined' && typeof QRCode.toCanvas === 'function') {
    QRCode.toCanvas(canvas, dynamicPayload, { width: 220, margin: 1 }, (err) => {
      if (!err) {
        canvas.classList.remove('hidden');
        rendered = true;
      } else {
        console.warn('QRCode.toCanvas failed, trying QRCode.js fallback...', err);
        fallbackQRCodeJS(dynamicPayload, canvas, qrisBlock);
      }
    });
  } else {
    fallbackQRCodeJS(dynamicPayload, canvas, qrisBlock);
  }
}

function fallbackQRCodeJS(payload, canvas, qrisBlock) {
  // Attempt 2: qrcode.js (new QRCode(element, options))
  if (typeof QRCode !== 'undefined' && typeof QRCode === 'function') {
    try {
      canvas.classList.add('hidden'); // Hide canvas, QRCode.js appends img/canvas inside container
      let container = document.getElementById('qris-fallback-container');
      if (!container) {
        container = document.createElement('div');
        container.id = 'qris-fallback-container';
        canvas.parentNode.insertBefore(container, canvas.nextSibling);
      }
      container.innerHTML = '';
      new QRCode(container, {
        text: payload,
        width: 200,
        height: 200
      });
      return;
    } catch (err) {
      console.error('QRCode.js fallback failed:', err);
    }
  }

  // If both failed
  canvas.classList.add('hidden');
  qrisBlock.insertAdjacentHTML('beforeend', `<div class="qris-error" style="color:red;font-size:12px;margin-top:8px;">QR gagal dibuat: Library QRCode belum termuat (cek koneksi/CDN diblokir)</div>`);
}

const btnNew = $('btn-new');
if (btnNew) {
  btnNew.addEventListener('click', () => {
    pickedMember = null;
    renderPickedMember();
    kwhInput.value = '';
    updatePreview();
    showView('form');
  });
}

const btnViewMemHistory = $('btn-view-member-history');
if (btnViewMemHistory) {
  btnViewMemHistory.addEventListener('click', () => {
    if (!lastTx) return;
    location.href = `riwayat.html?member=${encodeURIComponent(lastTx.member_id)}`;
  });
}

const btnOpenHistory = $('btn-open-history');
if (btnOpenHistory) {
  btnOpenHistory.addEventListener('click', () => {
    location.href = 'riwayat.html';
  });
}

const btnShare = $('btn-share');
if (btnShare) {
  btnShare.addEventListener('click', async () => {
    if (!lastTx) return;
    const btn = $('btn-share');
    const receiptEl = document.querySelector('#view-receipt .receipt');

    btn.disabled = true;
    btn.textContent = 'Menyiapkan gambar...';

    if (typeof html2canvas === 'undefined') {
      btn.disabled = false;
      btn.textContent = 'Bagikan';
      toast('Library html2canvas belum termuat!');
      return;
    }

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
          } catch (e) { /* dibatalkan pengguna */ }
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
}

function showView(name) {
  $('view-form').classList.toggle('hidden', name !== 'form');
  $('view-receipt').classList.toggle('hidden', name !== 'receipt');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

let toastTimer = null;
function toast(msg) {
  const el = $('toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2400);
}

// ---- guard page ----
if (typeof requireAdmin === 'function') {
  requireAdmin();
}
