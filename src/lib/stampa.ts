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

/* ------------------------------------------------------------------ */
/* MISURE DELLE TESSERE                                                */
/* ------------------------------------------------------------------ */

/**
 * L'etichetta non si taglia mai e non si spezza a metà parola: è la parte che
 * si legge, e "COLAZIO/NE" su due righe è peggio che nulla.
 *
 * Le due misure regolabili (lato del simbolo e corpo del testo) sono
 * indipendenti, quindi possono entrare in conflitto: un simbolo da 2,5 cm con
 * il testo a 30 pt darebbe una tessera troppo stretta per la parola che
 * contiene. Invece di indovinare quanto serve, lo si chiede al browser:
 *
 * - `min-width: min-content` sulla tessera: la larghezza minima diventa quella
 *   della parola più lunga dell'etichetta (o del simbolo, se è più largo);
 * - `max-width` sull'etichetta: oltre quel limite la tessera non cresce più —
 *   una parola chilometrica non deve sfondare la riga — e da lì in poi la
 *   parola va a capo davvero. Il limite è il maggiore fra il doppio del
 *   simbolo e una decina di caratteri, perché con simboli piccoli e testo
 *   grande il doppio del simbolo non basterebbe nemmeno per "oggi".
 *
 * Perché funzioni l'etichetta deve usare `overflow-wrap: break-word`
 * (`break-words`) e **non** `anywhere`: quest'ultimo azzera la larghezza
 * minima intrinseca e la tessera resterebbe stretta.
 */
export function misureTessera(latoPredefinito: string) {
  const lato = `var(--caa-simbolo, ${latoPredefinito})`;
  return {
    tessera: { width: lato, minWidth: 'min-content' as const },
    simbolo: { width: lato, height: lato },
    etichetta: { maxWidth: `max(calc(${lato} * 2), calc(var(--caa-testo, 1rem) * 10))` },
  };
}

/**
 * Riga di una lista in colonna: simbolo a sinistra, etichetta a destra.
 *
 * Qui la tessera non può allargarsi, è già larga quanto il foglio: se il
 * simbolo se lo prende tutto, all'etichetta restano due lettere per riga.
 * Quando lo spazio non basta per entrambi, a cedere è il simbolo.
 *
 * Lo decide il flexbox, non un calcolo a occhio: l'etichetta accanto non ha
 * `min-w-0`, quindi la sua larghezza minima automatica è quella della parola
 * più lunga; il simbolo è l'unico che può restringersi e lo fa solo di quanto
 * serve, fermandosi a 2 cm. Alle misure normali non si restringe affatto.
 */
export function misureRiga(latoPredefinito: string) {
  const lato = `var(--caa-simbolo, ${latoPredefinito})`;
  return {
    simbolo: { width: lato, minWidth: '2cm', aspectRatio: '1' },
  };
}

/**
 * Larghezza massima di una lista in colonna (agenda verticale).
 *
 * Con simboli grandi la riga deve poter crescere, altrimenti al simbolo
 * resterebbe tutto lo spazio e all'etichetta accanto una colonna di due
 * parole. Resta comunque dentro la finestra: `100%` ha la precedenza.
 */
export function larghezzaColonna(latoPredefinito: string): string {
  return `min(100%, max(42rem, calc(var(--caa-simbolo, ${latoPredefinito}) * 3)))`;
}
