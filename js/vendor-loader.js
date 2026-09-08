/*
 * Nota Charge V2 - CDN fallback loader.
 * GitHub Pages can use any of the listed public CDNs. The loader stops at the
 * first working source, reducing failures caused by a single blocked CDN.
 */
(function () {
  const sources = {
    supabase: [
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
      'https://unpkg.com/@supabase/supabase-js@2/dist/umd/supabase.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/supabase/2.49.8/supabase.min.js'
    ],
    qrcode: [
      'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js',
      'https://unpkg.com/qrcode@1.5.3/build/qrcode.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/qrcode/1.5.3/qrcode.min.js'
    ],
    html2canvas: [
      'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
      'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
      'https://unpkg.com/html2canvas@1.4.1/dist/html2canvas.min.js'
    ]
  };

  function loadOne(list, globalName) {
    if (window[globalName]) return true;
    for (const src of list) {
      try {
        document.write('<script src="' + src + '"><\\/script>');
        if (window[globalName]) return true;
      } catch (_) {}
    }
    return !!window[globalName];
  }

  // document.write is intentionally used while HTML is parsing so the
  // following application scripts always see the dependency synchronously.
  loadOne(sources.supabase, 'supabase');
  loadOne(sources.qrcode, 'QRCode');
  loadOne(sources.html2canvas, 'html2canvas');
})();
