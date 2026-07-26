/**
 * Trasforma i segmenti di una frase in simboli, ricordando le scelte fatte.
 *
 * È la parte che rende il writer progressivamente più veloce: ogni correzione
 * dell'utente (simbolo diverso, parole unite) finisce nel vocabolario personale
 * e viene riapplicata ovunque, in tutte le storie, per sempre. Gli altri writer
 * di simboli ripropongono lo stesso errore in ogni nuovo documento.
 *
 * Vive in un database separato da quello dei progetti: è memoria dello
 * strumento, non contenuto dell'utente, e non deve entrare nei backup né
 * complicare le migrazioni del database principale.
 */
import { candidateLemmas, normalizza, type Segmento } from './italian';

const DB_NAME = 'CaaVocabolario';
const DB_VERSION = 1;
const STORE_SCELTE = 'scelte';
const STORE_RICERCHE = 'ricerche';

const ARASAAC_SEARCH = 'https://api.arasaac.org/api/pictograms/it/search/';
const ARASAAC_IMAGE = (id: string | number) =>
  `https://api.arasaac.org/api/pictograms/${id}?download=false`;

/** Scelta memorizzata: la frase esatta -> il simbolo deciso dall'utente. */
interface Scelta {
  chiave: string;
  /** Null quando l'utente ha unito parole per cui ARASAAC non ha un simbolo:
   *  l'unione va comunque ricordata, la tessera mostrerà solo il testo. */
  sourceId: string | null;
  /** Vero quando l'utente ha unito più parole: serve alla segmentazione. */
  locuzione: boolean;
  aggiornata: number;
}

interface RicercaCache {
  termine: string;
  ids: string[];
  aggiornata: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function apriDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SCELTE)) {
        db.createObjectStore(STORE_SCELTE, { keyPath: 'chiave' });
      }
      if (!db.objectStoreNames.contains(STORE_RICERCHE)) {
        db.createObjectStore(STORE_RICERCHE, { keyPath: 'termine' });
      }
    };
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

function leggi<T>(store: string, chiave: string): Promise<T | undefined> {
  return apriDb().then(
    (db) =>
      new Promise<T | undefined>((resolve) => {
        const req = db.transaction([store], 'readonly').objectStore(store).get(chiave);
        req.onsuccess = () => resolve(req.result as T | undefined);
        req.onerror = () => resolve(undefined);
      }),
  ).catch(() => undefined);
}

function scrivi(store: string, valore: unknown): Promise<void> {
  return apriDb().then(
    (db) =>
      new Promise<void>((resolve) => {
        const req = db.transaction([store], 'readwrite').objectStore(store).put(valore);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      }),
  ).catch(() => undefined);
}

function tutte<T>(store: string): Promise<T[]> {
  return apriDb().then(
    (db) =>
      new Promise<T[]>((resolve) => {
        const req = db.transaction([store], 'readonly').objectStore(store).getAll();
        req.onsuccess = () => resolve((req.result ?? []) as T[]);
        req.onerror = () => resolve([]);
      }),
  ).catch(() => []);
}

/** Le locuzioni imparate, da passare alla segmentazione. */
export async function locuzioniPersonali(): Promise<string[]> {
  const scelte = await tutte<Scelta>(STORE_SCELTE);
  return scelte.filter((s) => s.locuzione).map((s) => s.chiave);
}

/** Registra la scelta dell'utente perché valga anche in futuro. */
export async function ricorda(chiave: string, sourceId: string | null, locuzione: boolean): Promise<void> {
  await scrivi(STORE_SCELTE, {
    chiave: normalizza(chiave),
    sourceId,
    locuzione,
    aggiornata: Date.now(),
  } satisfies Scelta);
}

export async function dimentica(chiave: string): Promise<void> {
  const db = await apriDb().catch(() => null);
  if (!db) return;
  await new Promise<void>((resolve) => {
    const req = db.transaction([STORE_SCELTE], 'readwrite').objectStore(STORE_SCELTE).delete(normalizza(chiave));
    req.onsuccess = () => resolve();
    req.onerror = () => resolve();
  });
}

export async function contaScelte(): Promise<number> {
  return (await tutte<Scelta>(STORE_SCELTE)).length;
}

/**
 * Cerca un termine su ARASAAC restituendo gli id dei risultati.
 * La cache locale evita di ripetere la stessa chiamata e fa funzionare la
 * ricerca offline sul vocabolario già usato.
 */
export async function cerca(termine: string): Promise<string[]> {
  const chiave = normalizza(termine);
  if (!chiave) return [];

  const inCache = await leggi<RicercaCache>(STORE_RICERCHE, chiave);
  if (inCache) return inCache.ids;

  try {
    const risposta = await fetch(ARASAAC_SEARCH + encodeURIComponent(chiave));
    if (!risposta.ok) return [];
    const dati = await risposta.json();
    const ids = Array.isArray(dati) ? dati.slice(0, 8).map((d: any) => String(d._id)) : [];
    await scrivi(STORE_RICERCHE, { termine: chiave, ids, aggiornata: Date.now() } satisfies RicercaCache);
    return ids;
  } catch {
    // Offline: nessun risultato, la parola resta come testo. Non è un errore
    // da mostrare, la storia si scrive lo stesso.
    return [];
  }
}

export interface SimboloRisolto extends Segmento {
  sourceId: string | null;
  imageUrl: string | null;
  /** Prime alternative, per cambiare simbolo con un tocco senza aprire nulla. */
  alternative: string[];
  /** Vero se il simbolo viene da una scelta già fatta dall'utente. */
  daMemoria: boolean;
}

export interface OpzioniRisoluzione {
  /** Scarica e mette in cache l'immagine, restituendo un URL utilizzabile. */
  risolviImmagine: (sourceId: string) => Promise<string | null>;
  segnale?: AbortSignal;
}

/**
 * Risolve un singolo segmento: prima la memoria, poi la ricerca con le forme
 * flesse ricondotte al lemma.
 */
async function risolviSegmento(
  segmento: Segmento,
  opzioni: OpzioniRisoluzione,
): Promise<SimboloRisolto> {
  const vuoto: SimboloRisolto = {
    ...segmento,
    sourceId: null,
    imageUrl: null,
    alternative: [],
    daMemoria: false,
  };

  // Le parole funzione isolate non hanno un simbolo sensato.
  if (segmento.funzione || !segmento.chiave) return vuoto;

  // 1. La scelta dell'utente vince sempre.
  const scelta = await leggi<Scelta>(STORE_SCELTE, segmento.chiave);
  if (scelta?.sourceId) {
    const imageUrl = await opzioni.risolviImmagine(scelta.sourceId);
    return { ...vuoto, sourceId: scelta.sourceId, imageUrl, daMemoria: true };
  }
  // Unione ricordata ma senza simbolo: si continua a cercare, e se non si
  // trova nulla la tessera resta di solo testo (l'unione è comunque rispettata).

  // 2. Ricerca provando le forme, dalla più probabile.
  for (const forma of candidateLemmas(segmento.chiave)) {
    if (opzioni.segnale?.aborted) return vuoto;
    const ids = await cerca(forma);
    if (ids.length === 0) continue;
    const imageUrl = await opzioni.risolviImmagine(ids[0]);
    return { ...vuoto, sourceId: ids[0], imageUrl, alternative: ids.slice(0, 6) };
  }

  return vuoto;
}

/**
 * Risolve tutti i segmenti di una frase.
 *
 * Volutamente in parallelo: la scrittura non deve aspettare la rete parola per
 * parola. Le richieste già in cache si risolvono subito.
 */
export async function risolvi(
  segmenti: Segmento[],
  opzioni: OpzioniRisoluzione,
): Promise<SimboloRisolto[]> {
  return Promise.all(segmenti.map((s) => risolviSegmento(s, opzioni)));
}

export function urlImmagineArasaac(sourceId: string): string {
  return ARASAAC_IMAGE(sourceId);
}
