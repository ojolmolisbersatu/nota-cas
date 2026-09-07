// QRIS Statis Merchant (Semilir Semarang)
const BASE_STATIC_QRIS = "00020101021126570011ID.DANA.WWW011893600915303471271802090347127180303UMI51440014ID.CO.QRIS.WWW0215ID10265837741240303UMI5204739453033605802ID5916Semilir Semarang6013Kota Semarang6105501166304285A";

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
      text: `*NOTA PEMBAYARAN*\nID: ${id}\nTotal: Rp ${amount.toLocaleString('id-ID')}\n\nScan/Bayar QRIS:\n${payload}`,
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
      try {
        await navigator.clipboard.writeText(shareData.text);
        alert("Detail nota & payload QRIS berhasil disalin ke clipboard!");
      } catch (err) {
        alert("Fitur bagikan tidak didukung di browser ini.");
      }
    }
  };
}
