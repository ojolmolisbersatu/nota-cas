const $ = (id) => document.getElementById(id);

const rupiah = (n) => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmtKwh = (n) => (Math.round(n * 100) / 100).toString() + ' kWh';
const padNota = (n) => '#' + String(n).padStart(4, '0');

function formatDateTime(d) {
  const tgl = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  const jam = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  return tgl + ' · ' + jam;
}

function showView(name) {
  $('view-search').classList.toggle('hidden', name !== 'search');
  $('view-detail').classList.toggle('hidden', name !== 'detail');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ---- search ----
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
      box.innerHTML = '';
      $('input-search').value = '';
      loadMemberHistory(el.dataset.id, el.dataset.nama);
    });
  });
}

async function loadMemberHistory(memberId, memberNama) {
  $('d-member-name').textContent = memberNama;
  $('d-member-id').textContent = memberId;
  $('history-list').innerHTML = '<div class="history-empty">Memuat riwayat...</div>';
  showView('detail');

  const { data, error } = await supabaseClient
    .from('charge_transactions')
    .select('*')
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });

  if (error) {
    $('history-list').innerHTML = `<div class="history-empty">Gagal memuat riwayat: ${escapeHtml(error.message)}</div>`;
    return;
  }

  const rows = data || [];
  const totalKwh = rows.reduce((s, r) => s + Number(r.kwh || 0), 0);
  const totalBiaya = rows.reduce((s, r) => s + Number(r.total || 0), 0);

  $('d-count').textContent = rows.length;
  $('d-kwh').textContent = fmtKwh(totalKwh);
  $('d-total').textContent = rupiah(totalBiaya);
  $('d-last').textContent = rows.length ? formatDateTime(new Date(rows[0].created_at)) : '—';

  $('history-list').innerHTML = rows.length
    ? rows.map((tx) => `
        <div class="history-item">
          <div>
            <div class="hi-id">${padNota(tx.nota_number)} · ${fmtKwh(tx.kwh)}</div>
            <div class="hi-meta">${formatDateTime(new Date(tx.created_at))}</div>
          </div>
          <div class="hi-total">${rupiah(tx.total)}</div>
        </div>
      `).join('')
    : '<div class="history-empty">Belum ada transaksi charge untuk member ini.</div>';
}

$('btn-back-search').addEventListener('click', () => showView('search'));

// ---- entry: jump straight to a member via ?member=ID ----
async function init() {
  await requireAdmin();
  const memberId = new URLSearchParams(location.search).get('member');
  if (memberId) {
    const { data } = await supabaseClient
      .from('anggota_omb_public')
      .select('*')
      .eq('id_anggota', memberId)
      .single();
    loadMemberHistory(memberId, data ? data.nama : memberId);
  }
}
init();
