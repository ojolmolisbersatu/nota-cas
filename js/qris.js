/* Nota Charge V2 - QRIS payload helper.
 * IMPORTANT: This builds a QR payload from the configured static template.
 * It does NOT call a PJP/payment gateway and therefore is not equivalent to
 * an officially issued Dynamic QRIS transaction.
 */
const QRIS_STATIC =
  "00020101021126570011ID.DANA.WWW011893600915303471271802090347127180303UMI" +
  "51440014ID.CO.QRIS.WWW0215ID10265837741240303UMI" +
  "5204739453033605802ID5916Semilir Semarang6013Kota Semarang" +
  "6105501166304285A";

function tlv(tag, value) {
  const text = String(value);
  if (text.length > 99) throw new Error(`Tag ${tag} terlalu panjang.`);
  return tag + String(text.length).padStart(2, '0') + text;
}

function parseQrisTLV(str) {
  const fields = [];
  let i = 0;
  while (i < str.length) {
    if (i + 4 > str.length) throw new Error('Payload QRIS tidak lengkap.');
    const tag = str.slice(i, i + 2);
    const lenText = str.slice(i + 2, i + 4);
    const len = Number.parseInt(lenText, 10);
    if (!Number.isInteger(len)) throw new Error(`Panjang TLV tag ${tag} tidak valid.`);
    const start = i + 4;
    const end = start + len;
    if (end > str.length) throw new Error(`Nilai TLV tag ${tag} terpotong.`);
    fields.push({ tag, value: str.slice(start, end) });
    i = end;
  }
  return fields;
}

function crc16ccitt(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000)
        ? ((crc << 1) ^ 0x1021) & 0xFFFF
        : (crc << 1) & 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function getQrisCrc(payload) {
  const clean = String(payload).trim();
  if (clean.length < 8 || clean.slice(-6, -4) !== '63') return null;
  return clean.slice(-4);
}

function validateQrisCrc(payload) {
  const clean = String(payload).trim();
  if (!clean.endsWith('6304' + clean.slice(-4))) return false;
  const expected = crc16ccitt(clean.slice(0, -4));
  return expected === clean.slice(-4).toUpperCase();
}

function buildDynamicQris(staticQris, amount) {
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Nominal QRIS tidak valid.');
  }

  const fields = parseQrisTLV(String(staticQris).trim()).filter(f => f.tag !== '63');
  const poi = fields.find(f => f.tag === '01');
  if (!poi) throw new Error('Tag 01 (Point of Initiation Method) tidak ditemukan.');
  poi.value = '12';

  const withoutAmount = fields.filter(f => f.tag !== '54');
  const currencyIdx = withoutAmount.findIndex(f => f.tag === '53');
  if (currencyIdx < 0) throw new Error('Tag 53 (currency) tidak ditemukan.');

  const amountStr = String(Math.round(numericAmount));
  if (amountStr.length > 99) throw new Error('Nominal terlalu besar.');
  withoutAmount.splice(currencyIdx + 1, 0, { tag: '54', value: amountStr });

  let payload = withoutAmount.map(f => tlv(f.tag, f.value)).join('');
  payload += '6304';
  payload += crc16ccitt(payload);
  return payload;
}

function inspectQris(payload) {
  const fields = parseQrisTLV(String(payload).trim());
  const amountField = fields.find(f => f.tag === '54');
  const poiField = fields.find(f => f.tag === '01');
  return {
    fields,
    amount: amountField ? Number(amountField.value) : null,
    poi: poiField?.value || null,
    crcValid: validateQrisCrc(payload)
  };
}

window.buildDynamicQris = buildDynamicQris;
window.inspectQris = inspectQris;
window.validateQrisCrc = validateQrisCrc;
window.QRIS_STATIC = QRIS_STATIC;
