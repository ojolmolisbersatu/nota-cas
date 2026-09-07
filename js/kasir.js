// Ganti dengan QRIS Statis merchant kamu
const BASE_STATIC_QRIS = "00020101021126580014ID.GO.QRIS.WWW01189360091400000000000215ID10200000000000303URE5204581253033605802ID5913MERCHANT NAME6007JAKARTA6105123456304ABCD";

document.getElementById('form-kasir').addEventListener('submit', async function(e) {
  e.preventDefault();

  const totalBayar = parseFloat(document.getElementById('total-bayar').value);
  if (!totalBayar || totalBayar <= 0) {
    alert("Masukkan nominal pembayaran yang valid!");
    return;
  }

  const transactionId = "INV-" + Date.now();

  try {
    // 1. Generate QRIS Dynamic Payload
    const qrisPayload = generateDynamicQRIS(BASE_STATIC_QRIS, totalBayar);

    // 2. Tampilkan Hasil Nota
    document.getElementById('nota-id').innerText = `ID Transaksi: ${transactionId}`;
    document.getElementById('nota-total').innerText = `Total Bayar: Rp ${totalBayar.toLocaleString('id-ID')}`;
    document.getElementById('area-nota').style.display = 'block';

    // 3. Render Gambar QR
    renderQRCode('qrcode', qrisPayload);

    // 4. Siapkan aksi tombol bagikan
    setupShareButton(transactionId, totalBayar, qrisPayload);

  } catch (err) {
    console.error(err);
    alert("Gagal memproses nota: " + err.message);
  }
});

function setupShareButton(id, amount, payload) {
  const btnShare = document.getElementById('btn-bagikan');
  
  btnShare.onclick = async () => {
    const shareData = {
      title: `Nota Pembayaran ${id}`,
      text: `*NOTA PEMBAYARAN*\nID: ${id}\nTotal: Rp ${amount.toLocaleString('id-ID')}\n\nPayload QRIS:\n${payload}`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error("Gagal share:", err);
        }
      }
    } else {
      // Fallback jika browser/device tidak support navigator.share
      try {
        await navigator.clipboard.writeText(shareData.text);
        alert("Detail nota & payload QRIS berhasil disalin ke clipboard!");
      } catch (err) {
        alert("Fitur bagikan tidak didukung di browser ini.");
      }
    }
  };
}
