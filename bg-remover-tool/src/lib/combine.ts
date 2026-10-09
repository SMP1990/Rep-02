// "Better results" = the fast (ISNet) mask plus what U2Net is sure about.
// U2Net sees whole objects that ISNet sometimes cuts away, but its edges are
// soft and it leaves a faint haze, so only its confident part (above 60%,
// fully opaque from 95%) is added. Thresholds were picked by measuring
// against BiRefNet on 20 photos (see scripts/prepare_hd_model.py).
const LOW = 0.6 * 255;
const HIGH = 0.95 * 255;

export function combineMasks(fast: Uint8ClampedArray, hd: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(fast.length);
  const k = 255 / (HIGH - LOW);
  for (let i = 0; i < fast.length; i++) {
    const sure = (hd[i] - LOW) * k; // Uint8ClampedArray clamps to 0..255
    out[i] = fast[i] > sure ? fast[i] : sure;
  }
  return out;
}
