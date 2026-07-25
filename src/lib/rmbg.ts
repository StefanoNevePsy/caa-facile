/**
 * Client (thread principale) per la rimozione sfondo con RMBG-1.4.
 *
 * Responsabilita':
 *  - risolvere gli URL degli asset in modo che funzionino identici su web,
 *    GitHub Pages (sottocartella), Capacitor e Electron;
 *  - preparare l'immagine per la rete (letterbox 1024x1024, senza ricodifiche
 *    JPEG intermedie che degradavano la qualita');
 *  - applicare il matte restituito dal worker e comporre il pittogramma finale.
 */

const SIZE = 1024;

export type EdgeMode = 'morbido' | 'normale' | 'netto';

export type RmbgPhase = 'download' | 'init' | 'infer' | 'ready';

export interface RmbgProgress {
  phase: RmbgPhase;
  /** 0..1, oppure null quando l'avanzamento non e' misurabile. */
  progress: number | null;
  backend?: string;
}

/** Curva di soglia morbida e erosione, per preset di rifinitura bordi. */
const EDGE_PRESETS: Record<EdgeMode, { lo: number; hi: number; erode: number }> = {
  // Conserva capelli e bordi sfumati, a costo di un lieve alone.
  morbido: { lo: 0.02, hi: 0.5, erode: 0 },
  // Compromesso adatto alla maggior parte delle foto usate in CAA.
  normale: { lo: 0.1, hi: 0.65, erode: 1 },
  // Taglio deciso: elimina aloni e frange di colore sui contorni netti.
  netto: { lo: 0.35, hi: 0.78, erode: 2 },
};

/** URL assoluto di un asset in `public/`, valido anche sotto sottocartella. */
function assetUrl(relativePath: string): string {
  const base = typeof document !== 'undefined' ? document.baseURI : self.location.href;
  return new URL(relativePath, base).href;
}

let worker: Worker | null = null;
let nextJobId = 1;
const pending = new Map<number, { resolve: (a: Uint8ClampedArray) => void; reject: (e: Error) => void }>();
let progressListener: ((p: RmbgProgress) => void) | null = null;

function getWorker(): Worker {
  if (worker) return worker;

  worker = new Worker(new URL('./rmbg.worker.ts', import.meta.url), { type: 'module' });

  worker.onmessage = (event: MessageEvent<any>) => {
    const msg = event.data;
    if (msg.type === 'status') {
      progressListener?.({ phase: msg.phase, progress: msg.progress ?? null, backend: msg.backend });
      return;
    }
    const job = pending.get(msg.id);
    if (!job) return;
    pending.delete(msg.id);
    if (msg.type === 'done') job.resolve(new Uint8ClampedArray(msg.alpha));
    else job.reject(new Error(msg.message));
  };

  worker.onerror = (event) => {
    const error = new Error(event.message || 'Errore nel motore AI');
    for (const job of pending.values()) job.reject(error);
    pending.clear();
    // Il worker e' compromesso: la prossima richiesta ne creera' uno nuovo.
    worker?.terminate();
    worker = null;
  };

  worker.postMessage({
    type: 'init',
    modelUrl: assetUrl('models/rmbg-1.4-v2/onnx/model_quantized.onnx'),
  });

  return worker;
}

/**
 * Scalda il modello in background quando l'utente apre l'editor, cosi' e' gia'
 * pronto quando preme "Salva".
 *
 * Sotto rete lenta o con "risparmio dati" attivo non anticipiamo niente: sono
 * 44 MB, e conviene scaricarli solo se la rimozione sfondo viene davvero usata
 * (con la barra di avanzamento a spiegare l'attesa).
 */
export function preloadRmbg(): void {
  const connection = (navigator as any).connection;
  if (connection?.saveData) return;
  if (connection?.effectiveType && /2g$/.test(connection.effectiveType)) return;

  try {
    getWorker();
  } catch {
    /* i worker non sono disponibili: si degrada al salvataggio senza AI */
  }
}

function runSegmentation(pixels: Uint8ClampedArray): Promise<Uint8ClampedArray> {
  return new Promise((resolve, reject) => {
    const id = nextJobId++;
    pending.set(id, { resolve, reject });
    const buffer = pixels.buffer as ArrayBuffer;
    getWorker().postMessage({ type: 'run', id, pixels: buffer }, [buffer]);
  });
}

/** Filtro di minimo separabile: assottiglia il matte di `radius` pixel. */
function erodeAlpha(alpha: Uint8ClampedArray, radius: number): Uint8ClampedArray {
  if (radius <= 0) return alpha;
  const tmp = new Uint8ClampedArray(alpha.length);
  const out = new Uint8ClampedArray(alpha.length);

  for (let y = 0; y < SIZE; y++) {
    const row = y * SIZE;
    for (let x = 0; x < SIZE; x++) {
      let min = 255;
      for (let k = -radius; k <= radius; k++) {
        const xx = x + k;
        if (xx < 0 || xx >= SIZE) continue;
        const v = alpha[row + xx];
        if (v < min) min = v;
      }
      tmp[row + x] = min;
    }
  }
  for (let x = 0; x < SIZE; x++) {
    for (let y = 0; y < SIZE; y++) {
      let min = 255;
      for (let k = -radius; k <= radius; k++) {
        const yy = y + k;
        if (yy < 0 || yy >= SIZE) continue;
        const v = tmp[yy * SIZE + x];
        if (v < min) min = v;
      }
      out[y * SIZE + x] = min;
    }
  }
  return out;
}

/**
 * Trasforma il matte grezzo in canale alpha: curva smoothstep fra `lo` e `hi`.
 * Sostituisce la soglia binaria della versione precedente, che produceva bordi
 * seghettati (l'antialiasing veniva buttato via).
 */
function applyEdgeCurve(alpha: Uint8ClampedArray, mode: EdgeMode): Uint8ClampedArray {
  const { lo, hi, erode } = EDGE_PRESETS[mode];
  const eroded = erodeAlpha(alpha, erode);

  // Look-up table: 256 valori invece di un calcolo per pixel (oltre 1M di pixel).
  const lut = new Uint8ClampedArray(256);
  const span = Math.max(hi - lo, 1e-6);
  for (let i = 0; i < 256; i++) {
    const t = Math.min(1, Math.max(0, (i / 255 - lo) / span));
    lut[i] = t * t * (3 - 2 * t) * 255; // smoothstep
  }

  const out = new Uint8ClampedArray(eroded.length);
  for (let i = 0; i < eroded.length; i++) out[i] = lut[eroded[i]];
  return out;
}

interface Letterbox {
  imageData: ImageData;
  offsetX: number;
  offsetY: number;
  width: number;
  height: number;
}

/**
 * Inserisce l'immagine in un quadrato 1024x1024 mantenendo le proporzioni.
 * Evitiamo lo "stretch" del preprocessor originale: su immagini molto allungate
 * deformava il soggetto e peggiorava la segmentazione.
 */
function letterbox(image: CanvasImageSource, naturalWidth: number, naturalHeight: number): Letterbox {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';

  const scale = Math.min(SIZE / naturalWidth, SIZE / naturalHeight);
  const width = Math.max(1, Math.round(naturalWidth * scale));
  const height = Math.max(1, Math.round(naturalHeight * scale));
  const offsetX = Math.round((SIZE - width) / 2);
  const offsetY = Math.round((SIZE - height) / 2);

  ctx.drawImage(image, offsetX, offsetY, width, height);
  return { imageData: ctx.getImageData(0, 0, SIZE, SIZE), offsetX, offsetY, width, height };
}

/**
 * Ritaglia il soggetto dall'immagine originale usando il matte della rete.
 * Restituisce un canvas a piena risoluzione con lo sfondo trasparente.
 */
export async function removeBackground(
  image: HTMLImageElement,
  options: { edgeMode?: EdgeMode; onProgress?: (p: RmbgProgress) => void } = {},
): Promise<HTMLCanvasElement> {
  const edgeMode = options.edgeMode ?? 'normale';
  progressListener = options.onProgress ?? null;

  const naturalWidth = image.naturalWidth || image.width;
  const naturalHeight = image.naturalHeight || image.height;

  try {
    const box = letterbox(image, naturalWidth, naturalHeight);
    const rawAlpha = await runSegmentation(box.imageData.data as unknown as Uint8ClampedArray);
    const alpha = applyEdgeCurve(rawAlpha, edgeMode);

    // Il matte diventa una maschera RGBA nera con alpha variabile, poi applicata
    // con `destination-in` sull'immagine originale a piena risoluzione.
    const mask = new Uint8ClampedArray(SIZE * SIZE * 4);
    for (let i = 0; i < alpha.length; i++) mask[i * 4 + 3] = alpha[i];

    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = SIZE;
    maskCanvas.height = SIZE;
    maskCanvas.getContext('2d')!.putImageData(new ImageData(mask, SIZE, SIZE), 0, 0);

    const out = document.createElement('canvas');
    out.width = naturalWidth;
    out.height = naturalHeight;
    const ctx = out.getContext('2d')!;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image, 0, 0, naturalWidth, naturalHeight);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(
      maskCanvas,
      box.offsetX, box.offsetY, box.width, box.height,
      0, 0, naturalWidth, naturalHeight,
    );
    ctx.globalCompositeOperation = 'source-over';
    return out;
  } finally {
    progressListener = null;
  }
}

export function estimateModelSizeMb(): number {
  return 44;
}
