// Variable String QRIS Statis dari Merchant (Semilir Semarang)
const STATIC_QRIS_SEMILIR = "00020101021126570011ID.DANA.WWW011893600915303471271802090347127180303UMI51440014ID.CO.QRIS.WWW0215ID10265837741240303UMI5204739453033605802ID5916Semilir Semarang6013Kota Semarang6105501166304285A";

/**
 * Generates dynamic QRIS payload from static string base and total amount.
 * @param {string} staticQris - Base static QRIS code from merchant
 * @param {number} amount - Transaction total amount
 * @returns {string} Dynamic QRIS string
 */
function generateDynamicQRIS(staticQris, amount) {
  if (!staticQris) {
    throw new Error("Base static QRIS belum dikonfigurasi.");
  }

  // UBAH DARI STATIS (010211) KE DINAMIS (010212)
  let base = staticQris.replace("010211", "010212");

  // Potong checksum lama (4 karakter CRC di akhir) jika ada
  if (base.includes("6304")) {
    base = base.substring(0, base.indexOf("6304"));
  }

  // Format Tag 54 (Amount/Nominal)
  const amountStr = Math.round(amount).toString();
  const tag54 = "54" + String(amountStr.length).padStart(2, '0') + amountStr;

  // Sisipkan Tag 54 sebelum Tag 58 (Country Code 'ID')
  const tag58Index = base.indexOf("5802ID");
  let payloadWithoutCrc = "";

  if (tag58Index !== -1) {
    payloadWithoutCrc = base.slice(0, tag58Index) + tag54 + base.slice(tag58Index) + "6304";
  } else {
    payloadWithoutCrc = base + tag54 + "6304";
  }

  // Hitung CRC16 Checksum
  const crc = calculateCRC16(payloadWithoutCrc);
  return payloadWithoutCrc + crc;
}

// Helper CRC16 / CCITT-FALSE
function calculateCRC16(str) {
  let crc = 0xFFFF;
  for (let c = 0; c < str.length; c++) {
    crc ^= str.charCodeAt(c) << 8;
    for (let i = 0; i < 8; i++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xFFFF;
      } else {
        crc = (crc << 1) & 0xFFFF;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/**
 * Contoh Cara Pemanggilan:
 * const totalBayar = 15000;
 * const qrisDinamisPayload = generateDynamicQRIS(STATIC_QRIS_SEMILIR, totalBayar);
 * renderQRCode("element-id-qr", qrisDinamisPayload);
 */
function renderQRCode(elementId, text) {
  const container = document.getElementById(elementId);
  if (!container) return;
  
  container.innerHTML = ""; // Clear QR sebelumnya

  if (typeof QRCode === "undefined") {
    alert("Library QRCode belum termuat (cek koneksi/CDN diblokir)");
    return;
  }

  new QRCode(container, {
    text: text,
    width: 200,
    height: 200,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });
}
