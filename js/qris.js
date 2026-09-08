// QRIS Merchant Semilir Semarang
const QRIS_STATIC =
  "00020101021126570011ID.DANA.WWW011893600915303471271802090347127180303UMI" +
  "51440014ID.CO.QRIS.WWW0215ID10265837741240303UMI" +
  "5204739453033605802ID5916Semilir Semarang6013Kota Semarang" +
  "6105501166304285A";

function tlv(tag, value) {
  const len = String(value.length).padStart(2, '0');
  return tag + len + value;
}

function parseQrisTLV(str) {
  const fields = [];
  let i = 0;
  while (i < str.length) {
    const tag = str.substr(i, 2);
    const len = parseInt(str.substr(i + 2, 2), 10);
    const value = str.substr(i + 4, len);
    fields.push({ tag, value });
    i += 4 + len;
  }
  return fields;
}

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

function buildDynamicQris(staticQris, amount) {
  const fields = parseQrisTLV(staticQris).filter((f) => f.tag !== '63');

  // UBAH KE 12 (Dinamis agar nominal terbaca e-wallet)
  const poiIdx = fields.findIndex((f) => f.tag === '01');
  if (poiIdx >= 0) fields[poiIdx].value = '12';

  const cleanFields = fields.filter((f) => f.tag !== '54');

  // Sisipkan Tag 54 tepat setelah Tag 53
  const currencyIdx = cleanFields.findIndex((f) => f.tag === '53');
  const amountStr = String(Math.round(amount));

  if (currencyIdx !== -1) {
    cleanFields.splice(currencyIdx + 1, 0, { tag: '54', value: amountStr });
  } else {
    cleanFields.push({ tag: '54', value: amountStr });
  }

  let payload = cleanFields.map((f) => tlv(f.tag, f.value)).join('');
  payload += '6304';
  payload += crc16ccitt(payload);

  return payload;
}

window.buildDynamicQris = buildDynamicQris;
window.QRIS_STATIC = QRIS_STATIC;
