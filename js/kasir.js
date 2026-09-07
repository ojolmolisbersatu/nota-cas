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

let pickedMember = null; // {id_anggota, nama}
let lastTx = null;

// ---- setup persisted fields ----
const bizNameInput = $('biz-name');
bizNameInput.value = localStorage.getItem(LS_KEY_NAME) || '';
bizNameInput.addEventListener('input', () => localStorage.setItem(LS_KEY_NAME, bizNameInput.value));

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

function renderReceipt(tx) {
  $('r-biz-name').textContent = tx.business_name || 'Nama Usaha';
  $('r-nota').textContent = padNota(tx.nota_number);
  $('r-datetime').textContent = formatDateTime(new Date(tx.created_at));
  $('r-customer').textContent = `${tx.member_nama} (${tx.member_id})`;
  $('r-kwh').textContent = fmtKwh(tx.kwh);
  $('r-rate').textContent = rupiah(tx.tarif);
  $('r-total').textContent = rupiah(tx.total);
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

function shareText(tx) {
  return [
    `⚡ ${tx.business_name || 'Nama Usaha'}`,
    'Nota Biaya Jasa Charge',
    padNota(tx.nota_number) + ' · ' + formatDateTime(new Date(tx.created_at)),
    '',
    `ID/Nama: ${tx.member_nama} (${tx.member_id})`,
    `Pemakaian: ${fmtKwh(tx.kwh)}`,
    `Tarif Jasa: ${rupiah(tx.tarif)}/kWh`,
    '',
    `TOTAL BIAYA JASA: ${rupiah(tx.total)}`
  ].join('\n');
}

$('btn-share').addEventListener('click', async () => {
  if (!lastTx) return;
  const text = shareText(lastTx);
  if (navigator.share) {
    try { await navigator.share({ title: 'Nota Biaya Jasa Charge', text }); } catch (e) {}
  } else {
    try {
      await navigator.clipboard.writeText(text);
      toast('Nota disalin ke clipboard');
    } catch (e) {
      toast('Gagal membagikan nota');
    }
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

// ---- debug: cek status login apa adanya dari sisi client & server ----
$('btn-debug').addEventListener('click', async () => {
  const { data: sessionData } = await supabaseClient.auth.getSession();
  const session = sessionData.session;
  const clientInfo = session
    ? `Client (HP):\nEmail: ${session.user.email}\nRole app_metadata: ${session.user.app_metadata?.role || '(kosong)'}\nToken kadaluarsa: ${new Date(session.expires_at * 1000).toLocaleString('id-ID')}`
    : 'Client (HP): TIDAK ADA SESI LOGIN';

  let serverInfo;
  try {
    const { data, error } = await supabaseClient.rpc('debug_jwt');
    if (error) {
      serverInfo = `Server: GAGAL memanggil debug_jwt()\nPesan: ${error.message}\n(Kemungkinan file debug-jwt.sql belum dijalankan di Supabase)`;
    } else {
      const role = data?.app_metadata?.role || '(tidak ada app_metadata.role)';
      const postgresRole = data?.role || '(tidak ada)';
      serverInfo = `Server (Supabase):\nrole postgres: ${postgresRole}\napp_metadata.role: ${role}`;
    }
  } catch (e) {
    serverInfo = `Server: error tak terduga - ${e.message}`;
  }

  alert(clientInfo + '\n\n' + serverInfo);
});
