// Reads a logo file into a preview data URL with the background knocked out.
// Handles raster images + SVG (FileReader) and PDFs (first page via pdf.js).
// Vector formats we can't rasterize in-browser (AI/EPS/TIFF) return empty preview.

let _pdfjs;
async function getPdfjs() {
  if (!_pdfjs) {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    _pdfjs = pdfjs;
  }
  return _pdfjs;
}

async function pdfFirstPageToDataUrl(file) {
  const pdfjs = await getPdfjs();
  const data = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data }).promise;
  const page = await doc.getPage(1);
  const viewport = page.getViewport({ scale: 2 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  await page.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
  return canvas.toDataURL("image/png");
}

// Knock out the background color everywhere (inside and out) so trapped white
// pockets in a logo go transparent too. Bails out if it would erase almost
// everything (logo ≈ background color), so a logo never disappears.
export function removeBackground(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let w = img.naturalWidth || 400, h = img.naturalHeight || 400;
      const max = 900, s = Math.min(1, max / Math.max(w, h));
      w = Math.round(w * s); h = Math.round(h * s);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      const ctx = c.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      let id;
      try { id = ctx.getImageData(0, 0, w, h); } catch { resolve(url); return; }
      const d = id.data;

      // background = average of the opaque corners
      const corners = [0, (w - 1) * 4, (h - 1) * w * 4, ((h - 1) * w + (w - 1)) * 4];
      let cr = 0, cg = 0, cb = 0, n = 0;
      for (const i of corners) if (d[i + 3] > 10) { cr += d[i]; cg += d[i + 1]; cb += d[i + 2]; n++; }
      if (n === 0) { resolve(url); return; } // corners already transparent → leave as-is
      cr /= n; cg /= n; cb /= n;

      const tol2 = 52 * 52 * 3;
      let removed = 0;
      const total = w * h;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 10) { removed++; continue; }
        const dr = d[i] - cr, dg = d[i + 1] - cg, db = d[i + 2] - cb;
        if (dr * dr + dg * dg + db * db < tol2) { d[i + 3] = 0; removed++; }
      }
      if (removed / total > 0.93) { resolve(url); return; } // misfire → keep original
      ctx.putImageData(id, 0, 0);
      resolve(c.toDataURL("image/png"));
    };
    img.onerror = () => resolve(url);
    img.src = url;
  });
}

export function readLogoFile(file, cb) {
  if (!file || !cb) return;
  const name = file.name;
  const done = (url) => (url ? removeBackground(url).then((u) => cb(u, name)) : cb("", name));

  if (/\.pdf$/i.test(name) || file.type === "application/pdf") {
    pdfFirstPageToDataUrl(file).then(done).catch(() => cb("", name));
    return;
  }
  const previewable = /\.(png|jpe?g|svg|webp|gif)$/i.test(name) || /^image\//.test(file.type);
  if (!previewable) { cb("", name); return; }
  const r = new FileReader();
  r.onload = () => done(r.result);
  r.readAsDataURL(file);
}
