/// <reference lib="webworker" />
/**
 * Worker di segmentazione RMBG-1.4 (BriaAI) su onnxruntime-web.
 *
 * Gira fuori dal thread principale, cosi' l'interfaccia resta fluida durante
 * il download del modello (~44 MB) e l'inferenza.
 *
 * Contratto ONNX del modello (verificato sul file spedito con l'app):
 *   input  "input"  float32 [1, 3, 1024, 1024]  = pixel/255 - 0.5
 *   output "output" float32 [1, 1, 1024, 1024]  = matte in [0, 1] (sigmoid gia' applicata)
 */
import * as ort from 'onnxruntime-web/webgpu';

const SIZE = 1024;
const PLANE = SIZE * SIZE;

type InitMessage = { type: 'init'; modelUrl: string };
type RunMessage = { type: 'run'; id: number; pixels: ArrayBuffer };
type InMessage = InitMessage | RunMessage;

let config: { modelUrl: string } | null = null;
let sessionPromise: Promise<{ session: ort.InferenceSession; backend: string }> | null = null;

const post = (msg: any, transfer: Transferable[] = []) =>
  (self as any).postMessage(msg, transfer);

/** Scarica il modello segnalando l'avanzamento (il primo caricamento e' lungo). */
async function fetchModel(url: string): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Modello non raggiungibile (HTTP ${response.status})`);

  const total = Number(response.headers.get('content-length')) || 0;
  // Senza content-length (o senza stream) non possiamo mostrare una percentuale.
  if (!total || !response.body) {
    post({ type: 'status', phase: 'download', progress: null });
    return await response.arrayBuffer();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  let lastPost = 0;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    // Limitiamo i messaggi a ~20/s per non intasare il thread principale.
    const now = Date.now();
    if (now - lastPost > 50) {
      lastPost = now;
      post({ type: 'status', phase: 'download', progress: loaded / total, loaded, total });
    }
  }
  post({ type: 'status', phase: 'download', progress: 1, loaded, total });

  const buffer = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.length;
  }
  return buffer.buffer;
}

/**
 * Crea la sessione una volta sola e la riusa: ricaricare 44 MB ad ogni immagine
 * era il difetto piu' costoso della versione precedente.
 */
function getSession() {
  if (sessionPromise) return sessionPromise;

  sessionPromise = (async () => {
    if (!config) throw new Error('Worker non inizializzato');

    // Il binario .wasm viene emesso da Vite accanto a questo worker: lasciamo
    // che onnxruntime lo risolva da solo via import.meta.url, così il percorso
    // resta corretto sia su GitHub Pages che dentro l'APK.
    //
    // I thread WASM richiedono cross-origin isolation (COOP/COEP). Dove non c'è,
    // forzare numThreads > 1 fa fallire l'inizializzazione: meglio degradare.
    const cores = (self.navigator as any)?.hardwareConcurrency || 4;
    ort.env.wasm.numThreads = (self as any).crossOriginIsolated ? Math.min(4, cores) : 1;
    ort.env.wasm.proxy = false; // siamo gia' in un worker
    ort.env.logLevel = 'error';

    post({ type: 'status', phase: 'download', progress: 0 });
    const modelBuffer = await fetchModel(config.modelUrl);

    post({ type: 'status', phase: 'init', progress: null });

    // WebGPU quando disponibile (decine di volte piu' veloce), altrimenti WASM.
    const backends: string[] = [];
    if ((self.navigator as any)?.gpu) backends.push('webgpu');
    backends.push('wasm');

    let lastError: unknown = null;
    for (const backend of backends) {
      try {
        const session = await ort.InferenceSession.create(modelBuffer, {
          executionProviders: [backend as any],
          graphOptimizationLevel: 'all',
        });
        post({ type: 'status', phase: 'ready', backend });
        return { session, backend };
      } catch (err) {
        lastError = err;
        console.warn(`[rmbg] backend "${backend}" non disponibile:`, err);
      }
    }
    throw new Error(
      `Impossibile inizializzare il motore AI: ${(lastError as Error)?.message ?? 'errore sconosciuto'}`,
    );
  })();

  // Se fallisce, permettiamo un nuovo tentativo alla prossima richiesta.
  sessionPromise.catch(() => {
    sessionPromise = null;
  });

  return sessionPromise;
}

/** RGBA interlacciato -> tensore CHW normalizzato come da preprocessor_config. */
function toTensor(pixels: Uint8ClampedArray): ort.Tensor {
  const data = new Float32Array(3 * PLANE);
  for (let i = 0; i < PLANE; i++) {
    const p = i * 4;
    data[i] = pixels[p] / 255 - 0.5;
    data[PLANE + i] = pixels[p + 1] / 255 - 0.5;
    data[2 * PLANE + i] = pixels[p + 2] / 255 - 0.5;
  }
  return new ort.Tensor('float32', data, [1, 3, SIZE, SIZE]);
}

/**
 * Normalizzazione min-max del matte, come nel post-processing ufficiale di
 * BriaRMBG: recupera contrasto sulle immagini in cui la rete e' poco decisa.
 */
function toAlpha(matte: Float32Array): Uint8ClampedArray {
  let min = Infinity;
  let max = -Infinity;
  for (let i = 0; i < matte.length; i++) {
    const v = matte[i];
    if (v < min) min = v;
    if (v > max) max = v;
  }

  const alpha = new Uint8ClampedArray(matte.length);
  const range = max - min;
  if (range < 1e-6) return alpha; // matte piatto: niente da segmentare
  const scale = 255 / range;
  for (let i = 0; i < matte.length; i++) {
    alpha[i] = (matte[i] - min) * scale;
  }
  return alpha;
}

self.onmessage = async (event: MessageEvent<InMessage>) => {
  const msg = event.data;

  if (msg.type === 'init') {
    config = { modelUrl: msg.modelUrl };
    return;
  }

  if (msg.type !== 'run') return;

  try {
    const { session } = await getSession();
    post({ type: 'status', phase: 'infer', progress: null });

    const input = toTensor(new Uint8ClampedArray(msg.pixels));
    const output = await session.run({ input });
    const matte = output.output.data as Float32Array;

    const alpha = toAlpha(matte);
    post({ type: 'done', id: msg.id, alpha: alpha.buffer }, [alpha.buffer]);
  } catch (err) {
    post({ type: 'error', id: msg.id, message: (err as Error)?.message ?? String(err) });
  }
};
