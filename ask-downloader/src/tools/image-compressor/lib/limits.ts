// Shared limits (kept apart so the page does not pull in the encoder code).

/** Larger images are refused: decoding one needs width x height x 4 bytes (50 MP = 200 MB). */
export const MAX_MEGAPIXELS = 50;
