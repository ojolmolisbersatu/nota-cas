// js/kasir.js - Aplikasi Kasir Nota Charge
document.addEventListener('DOMContentLoaded', () => {
  // Pastikan user sudah login via auth.js
  if (typeof checkAuth === 'function') {
    checkAuth();
  }

  // Elemen Form & Input
  const formKasir = document.getElementById('form-kasir');
  const inputNama = document.getElementById('nama_pelanggan');
  const inputID = document.getElementById('id_pelanggan');
  const inputKwh = document.getElementById('pemakaian_kwh');
  const inputTarif = document.getElementById('tarif_per_kwh');
  const btnHitung = document.getElementById('btn-hitung');

  // Elemen Container Nota
  const notaSection = document.getElementById('nota-section');
  const notaNo = document.getElementById('nota-no');
  const notaTanggal = document.getElementById('nota-tanggal');
  const notaJam = document.getElementById('nota-jam');
  const notaNama = document.getElementById('nota-nama');
  const notaId = document.getElementById('nota-id');
  const notaKwh = document.getElementById('nota-kwh');
  const notaTarif = document.getElementById('nota-tarif');
  const notaTotal = document.getElementById('nota-total');
  const notaTotalBottom = document.getElementById('nota-total-bottom');
  const qrisContainer = document.getElementById('qris-code');

  // Elemen Aksi
  const btnBagikan = document.getElementById('btn-bagikan');
  const btnTransaksiBaru = document.getElementById('btn-transaksi-baru');

  // Set default tarif jika ada
  if (inputTarif && !inputTarif.value) {
    inputTarif.value = "2500";
  }

  /**
   * Handle Submit Form Transaksi Kasir
   */
  if (formKasir) {
    formKasir.addEventListener('submit', async (e) => {
      e.preventDefault();

      const nama = inputNama.value.trim();
      const idPelanggan = inputID.value.trim() || '-';
      const kwh = parseFloat(inputKwh.value) || 0;
      const tarif = parseFloat(inputTarif.value) || 0;

      if (kwh <= 0 || tarif <= 0) {
        alert('Pemakaian kWh dan Tarif Jasa harus lebih besar dari 0!');
        return;
      }

      // Hitung Total Biaya (Pembulatan Matematika)
      const totalBiaya = Math.round(kwh * tarif);

      // Disable tombol saat proses simpan
      btnHitung.disabled = true;
      btnHitung.innerText = 'Memproses...';

      try {
        // 1. Simpan ke Supabase Database (jika supabaseClient tersedia)
        let nomorNotaFormatted = '#' + String(Math.floor(Math.random() * 9000) + 1000);
        let now = new Date();

        if (window.supabaseClient) {
          const { data, error } = await window.supabaseClient
            .from('charge_transactions')
            .insert([
              {
                nama_pelanggan: nama,
                id_pelanggan: idPelanggan,
                pemakaian_kwh: kwh,
                tarif_per_kwh: tarif,
                total_biaya: totalBiaya,
                created_at: new Date().toISOString()
              }
            ])
            .select();

          if (error) {
            console.error('Gagal menyimpan transaksi ke Supabase:', error);
          } else if (data && data.length > 0) {
            const row = data[0];
            nomorNotaFormatted = '#' + String(row.id).padStart(4, '0');
            if (row.created_at) now = new Date(row.created_at);
          }
        }

        // 2. Render Tampilan Nota & QRIS
        renderNota({
          nomorNota: nomorNotaFormatted,
          tanggal: now,
          nama: nama,
          idPelanggan: idPelanggan,
          kwh: kwh,
          tarif: tarif,
          totalBiaya: totalBiaya
        });

        // 3. Tampilkan Section Nota & Scroll Kebawah
        if (notaSection) {
          notaSection.classList.remove('hidden');
          notaSection.scrollIntoView({ behavior: 'smooth' });
        }

      } catch (err) {
        console.error('Error transaksi:', err);
        alert('Terjadi kesalahan saat memproses transaksi.');
      } finally {
        btnHitung.disabled = false;
        btnHitung.innerText = 'Buat Nota';
      }
    });
  }

  /**
   * Fungsi untuk Merender Nota dan Membentuk QRIS Dinamis
   */
  function renderNota(data) {
    // Format Tanggal & Jam
    const optionsTgl = { day: '2-digit', month: 'Long', year: 'numeric' };
    const strTanggal = data.tanggal.toLocaleDateString('id-ID', optionsTgl);
    const strJam = data.tanggal.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

    // Format Mata Uang Rp
    const formatRp = (val) => 'Rp ' + new Intl.NumberFormat('id-ID').format(val);

    // Isi Text Nota
    if (notaNo) notaNo.innerText = data.nomorNota;
    if (notaTanggal) notaTanggal.innerText = strTanggal;
    if (notaJam) notaJam.innerText = strJam;
    if (notaNama) notaNama.innerText = data.nama;
    if (notaId) notaId.innerText = data.idPelanggan !== '-' ? `(${data.idPelanggan})` : '';
    if (notaKwh) notaKwh.innerText = data.kwh.toFixed(2) + ' kWh';
    if (notaTarif) notaTarif.innerText = formatRp(data.tarif);
    if (notaTotal) notaTotal.innerText = formatRp(data.totalBiaya);
    if (notaTotalBottom) notaTotalBottom.innerText = formatRp(data.totalBiaya);

    // --- RENDER QRIS CODE DINAMIS DENGAN NOMINAL ---
    if (qrisContainer) {
      qrisContainer.innerHTML = ''; // Bersihkan canvas QR lama

      // Panggil generator QRIS Dinamis dari js/qris.js
      let dynamicQrisPayload = window.QRIS_STATIC;
      if (typeof window.buildDynamicQris === 'function') {
        dynamicQrisPayload = window.buildDynamicQris(window.QRIS_STATIC, data.totalBiaya);
      }

      // Render Kode QR menggunakan js/qrcode.min.js
      try {
        new QRCode(qrisContainer, {
          text: dynamicQrisPayload, // WAJIB payload dinamis
          width: 220,
          height: 220
        });
      } catch (err) {
        console.error('Gagal merender QR Code:', err);
      }
    }
  }

  /**
   * Handle Tombol Transaksi Baru
   */
  if (btnTransaksiBaru) {
    btnTransaksiBaru.addEventListener('click', () => {
      if (formKasir) formKasir.reset();
      if (inputTarif) inputTarif.value = "2500";
      if (notaSection) notaSection.classList.add('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /**
   * Handle Tombol Bagikan / Tangkap Layar Nota
   */
  if (btnBagikan) {
    btnBagikan.addEventListener('click', async () => {
      const notaCard = document.getElementById('nota-card') || notaSection;
      if (!notaCard) return;

      if (typeof html2canvas === 'function') {
        try {
          const canvas = await html2canvas(notaCard, { scale: 2 });
          canvas.toBlob((blob) => {
            if (navigator.share && blob) {
              const file = new File([blob], 'nota-charge.png', { type: 'image/png' });
              navigator.share({
                files: [file],
                title: 'Nota Biaya Jasa Charge',
                text: 'Terima kasih sudah charge di sini!'
              }).catch(() => {});
            } else {
              // Fallback download gambar
              const link = document.createElement('a');
              link.download = 'nota-charge.png';
              link.href = canvas.toDataURL();
              link.click();
            }
          });
        } catch (err) {
          alert('Gagal membuat gambar nota.');
        }
      } else {
        window.print();
      }
    });
  }
});
