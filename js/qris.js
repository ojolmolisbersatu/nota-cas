// QRIS Dinamis Merchant: Semilir Semarang (NMID: ID1026583774124)
// Penyesuaian format TLV EMVCo QRIS Standar Nasional

const QRIS_STATIC =
  "00020101021126570011ID.DANA.WWW011893600915303471271802090347127180303UMI" +
  "51440014ID.CO.QRIS.WWW0215ID10265837741240303UMI" +
  "5204739453033605802ID5916Semilir Semarang6013Kota Semarang" +
  "6105501166304285A";

/**
 * Format string ke struktur Tag-Length-Value (TLV)
 */
function tlv(tag, value) {
  const len = String(value.length).padStart(2, '0');
  return tag + len + value;
}

/**
 * Hitung Checksum CRC16 (CCITT-FALSE) Standar QRIS
 */
function crc16ccitt(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= (str.charCodeAt(i) << 8);
    for (let j = 0; j < 8; j++) {
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
 * Membentuk string QRIS Dinamis yang valid
 */
function buildDynamicQris(staticQris, amount) {
  // 1. Ubah indikator dari Statis (010211) ke Dinamis (010212)
  let base = staticQris.replace("010211", "010212");

  // 2. Potong checksum CRC16 lama (4 karakter di akhir Tag 63)
  if (base.includes("6304")) {
    base = base.substring(0, base.indexOf("6304"));
  }

  // 3. Format Tag 54 (Nominal Transaksi)
  const amountStr = Math.round(amount).toString();
  const tag54 = tlv("54", amountStr);

  // 4. Sisipkan Tag 54 tepat SEBELUM Tag 58 (Country Code 'ID')
  let payloadWithoutCrc = "";
  const tag58Index = base.indexOf("5802ID");

  if (tag58Index !== -1) {
    payloadWithoutCrc = base.slice(0, tag58Index) + tag54 + base.slice(tag58Index) + "6304";
  } else {
    payloadWithoutCrc = base + tag54 + "6304";
  }

  // 5. Hitung CRC16 baru dan gabungkan
  const newCrc = crc16ccitt(payloadWithoutCrc);
  return payloadWithoutCrc + newCrc;
}

window.buildDynamicQris = buildDynamicQris;
window.QRIS_STATIC = QRIS_STATIC;
