/**
 * Stampa, su tutte le piattaforme.
 *
 * `window.print()` funziona nei browser ma **non** dentro l'app Android
 * installata: la WebView non implementa quel metodo e la chiamata non fa nulla,
 * senza nemmeno sollevare un errore. Il tasto Stampa risultava quindi morto
 * proprio sul dispositivo dove serve di piu'.
 *
 * Sul nativo passiamo dal plugin `Printer` incluso nell'app, che usa il
 * PrintManager di Android: da lì si sceglie la stampante oppure "Salva come
 * PDF", che è il caso d'uso più frequente.
 */

export type VersoFoglio = 'portrait' | 'landscape';

interface EsitoStampa {
  ok: boolean;
  /** Messaggio da mostrare all'utente quando la stampa non è partita. */
  messaggio?: string;
}

function pontenativo(): any | null {
  const cap = (window as any).Capacitor;
  if (!cap?.isNativePlatform?.()) return null;
  return cap?.Plugins?.Printer ?? null;
}

export function stampaDisponibile(): boolean {
  const cap = (window as any).Capacitor;
  // Nel browser c'è sempre; nel nativo dipende dal plugin, che manca nelle
  // versioni dell'app installate prima di questa correzione.
  if (!cap?.isNativePlatform?.()) return typeof window.print === 'function';
  return pontenativo() !== null;
}

export async function stampa(
  nome: string,
  verso: VersoFoglio = 'portrait',
): Promise<EsitoStampa> {
  const nativo = pontenativo();

  if (nativo) {
    try {
      await nativo.print({ name: nome, orientation: verso });
      return { ok: true };
    } catch (e: any) {
      return { ok: false, messaggio: e?.message || 'Stampa non riuscita.' };
    }
  }

  const cap = (window as any).Capacitor;
  if (cap?.isNativePlatform?.()) {
    // App installata ma senza il plugin: è una versione vecchia dell'APK.
    return {
      ok: false,
      messaggio:
        'Questa versione dell’app non sa stampare. Aggiorna l’app, ' +
        'oppure apri CAA Facile dal browser per stampare da lì.',
    };
  }

  try {
    window.print();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, messaggio: e?.message || 'Stampa non riuscita.' };
  }
}

/* ------------------------------------------------------------------ */
/* ADATTAMENTO ALLA PAGINA                                             */
/* ------------------------------------------------------------------ */

const CM_A4_LATO_CORTO = 21;
const CM_A4_LATO_LUNGO = 29.7;
/** Margine di sicurezza: nessuna stampante arriva davvero al bordo. */
const MARGINE_CM = 1;

export interface AreaStampabile {
  larghezza: number;
  altezza: number;
}

export function areaStampabile(verso: VersoFoglio): AreaStampabile {
  const larghezza = verso === 'landscape' ? CM_A4_LATO_LUNGO : CM_A4_LATO_CORTO;
  const altezza = verso === 'landscape' ? CM_A4_LATO_CORTO : CM_A4_LATO_LUNGO;
  return {
    larghezza: larghezza - MARGINE_CM * 2,
    altezza: altezza - MARGINE_CM * 2,
  };
}

export interface OpzioniAdattamento {
  /** Quante tessere ci sono in tutto. */
  elementi: number;
  verso: VersoFoglio;
  /**
   * `colonna`: una tessera per riga (agenda verticale).
   * `griglia`: le tessere vanno a capo riempiendo la larghezza (storie, agenda orizzontale).
   */
  disposizione: 'colonna' | 'griglia';
  /** Spazio verticale occupato dall'etichetta sotto la tessera, in cm. */
  altezzaTesto: number;
  minimo?: number;
  massimo?: number;
}

/**
 * Calcola quanto grandi possono essere le tessere perché il contenuto riempia
 * il foglio senza traboccare.
 *
 * Serve al caso più frequente: un'agenda di quattro voci che, a dimensione
 * fissa, lascia mezza pagina bianca e risulta minuscola appesa al muro.
 *
 * È un calcolo geometrico, non una misura del DOM: sullo schermo il contenitore
 * non è largo quanto un A4, quindi misurare lì darebbe un a capo diverso da
 * quello di stampa e il risultato sarebbe sbagliato.
 */
export interface RisultatoAdattamento {
  /** Lato della tessera, in centimetri. */
  lato: number;
  /** Pagine previste con questa dimensione. */
  pagine: number;
  /** Vero se il contenuto non entra in una pagina nemmeno alla misura minima. */
  traboccante: boolean;
}

/**
 * Calcola quanto grandi possono essere le tessere perché il contenuto riempia
 * il foglio senza traboccare.
 *
 * Serve al caso più frequente: un'agenda di quattro voci che, a dimensione
 * fissa, lascia mezza pagina bianca e risulta minuscola appesa al muro.
 *
 * È un calcolo geometrico, non una misura del DOM: sullo schermo il contenitore
 * non è largo quanto un A4, quindi misurare lì darebbe un a capo diverso da
 * quello di stampa e il risultato sarebbe sbagliato.
 */
export function adattaSimboloAllaPagina(opzioni: OpzioniAdattamento): RisultatoAdattamento {
  const { elementi, verso, disposizione, altezzaTesto } = opzioni;
  const minimo = opzioni.minimo ?? 1.5;
  const massimo = opzioni.massimo ?? 12;

  if (elementi <= 0) return { lato: minimo, pagine: 1, traboccante: false };

  const area = areaStampabile(verso);
  const distanza = 0.3;

  if (disposizione === 'colonna') {
    const desiderato = area.altezza / elementi - distanza;
    const lato = Math.max(minimo, Math.min(massimo, desiderato));
    const perPagina = Math.max(1, Math.floor(area.altezza / (lato + distanza)));
    const pagine = Math.ceil(elementi / perPagina);
    return { lato: Math.round(lato * 100) / 100, pagine, traboccante: pagine > 1 };
  }

  // Griglia: si cerca il lato più grande per cui le righe necessarie stanno
  // ancora in altezza. Passo fine, così la scelta è granulare.
  for (let lato = massimo; lato >= minimo; lato -= 0.05) {
    const perRiga = Math.floor(area.larghezza / (lato + distanza));
    if (perRiga < 1) continue;
    const righe = Math.ceil(elementi / perRiga);
    if (righe * (lato + altezzaTesto + distanza) <= area.altezza) {
      return { lato: Math.round(lato * 100) / 100, pagine: 1, traboccante: false };
    }
  }

  // Nemmeno alla misura minima ci sta: si va su più pagine, e va detto.
  const perRiga = Math.max(1, Math.floor(area.larghezza / (minimo + distanza)));
  const righe = Math.ceil(elementi / perRiga);
  const righePerPagina = Math.max(1, Math.floor(area.altezza / (minimo + altezzaTesto + distanza)));
  return {
    lato: minimo,
    pagine: Math.ceil(righe / righePerPagina),
    traboccante: true,
  };
}
