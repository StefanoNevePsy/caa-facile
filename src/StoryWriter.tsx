import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link as LinkIcon, Scissors, RefreshCw, Check, Loader2, Volume2, Type, Plus, List, ListOrdered } from 'lucide-react';
import { segmentaTesto, normalizza, type Riga } from './lib/italian';
import {
  risolvi,
  ricorda,
  dimentica,
  cerca,
  locuzioniPersonali,
  urlImmagineArasaac,
  type SimboloRisolto,
} from './lib/symbolizer';

/**
 * Writer di simboli per le storie sociali.
 *
 * L'impostazione è rovesciata rispetto ai writer diffusi (SimCAA, Araword,
 * Symwriter): lì le tessere sono la struttura e il testo è un'etichetta, quindi
 * scrivere significa amministrare oggetti. Qui **il testo è la verità** e i
 * simboli sono la sua resa dal vivo: si scrive in un campo unico, come un
 * messaggio, e i simboli si aggiornano sotto mentre si digita.
 *
 * L'altra differenza sostanziale è la memoria: ogni correzione (parole unite,
 * simbolo diverso) viene ricordata e riapplicata in tutte le storie successive.
 */

/** Riga risolta: il testo segmentato più i simboli trovati. */
interface RigaRisolta {
  tipo: Riga['tipo'];
  numero?: number;
  simboli: SimboloRisolto[];
}

/** Coordinate di una tessera: riga e posizione nella riga. */
interface Posizione {
  riga: number;
  simbolo: number;
}

export interface StoryWriterProps {
  testo: string;
  onTestoChange: (testo: string) => void;
  /** Ricostruisce gli elementi salvati (usati da stampa, backup e progetti già esistenti). */
  onSimboliChange: (simboli: SimboloRisolto[]) => void;
  risolviImmagine: (sourceId: string) => Promise<string | null>;
  compattaParoleFunzione: boolean;
  onCompattaChange: (valore: boolean) => void;
  isLocked: boolean;
  onLeggi?: (testo: string) => void;
  /** Apre la ricerca completa (ARASAAC, foto, galleria, link) per un termine. */
  onApriRicerca?: (chiave: string, testo: string) => void;
  /**
   * Cambia quando il vocabolario personale viene modificato dall'esterno
   * (per esempio scegliendo un'immagine dalla ricerca completa): serve a
   * far ricalcolare l'anteprima.
   */
  versioneVocabolario?: number;
  /** Barra dei controlli di dimensione e stampa, resa dal genitore. */
  controlli?: React.ReactNode;
  /** Variabili CSS `--caa-simbolo` e `--caa-testo`. */
  stiliDimensione?: React.CSSProperties;
}

export default function StoryWriter({
  testo,
  onTestoChange,
  onSimboliChange,
  risolviImmagine,
  compattaParoleFunzione,
  onCompattaChange,
  isLocked,
  onLeggi,
  onApriRicerca,
  versioneVocabolario = 0,
  controlli,
  stiliDimensione,
}: StoryWriterProps) {
  const [righe, setRighe] = useState<RigaRisolta[]>([]);
  const [inElaborazione, setInElaborazione] = useState(false);
  const [chipAperto, setChipAperto] = useState<Posizione | null>(null);
  const [alternativeUrl, setAlternativeUrl] = useState<Record<string, string>>({});
  const [personali, setPersonali] = useState<string[]>([]);
  const [ultimaAzione, setUltimaAzione] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    locuzioniPersonali().then(setPersonali);
  }, [versioneVocabolario]);

  const righeSegmentate = useMemo(
    () => segmentaTesto(testo, { locuzioniPersonali: personali, compattaParoleFunzione }),
    [testo, personali, compattaParoleFunzione],
  );

  /**
   * Chiave di contenuto: l'effetto sotto deve ripartire solo quando la storia
   * cambia davvero, non ad ogni nuovo array prodotto da un render del genitore.
   * Dipendendo dall'identità dell'array la risoluzione ripartiva in
   * continuazione e ogni risultato veniva scartato da quello successivo.
   */
  const chiaveRighe = useMemo(
    () =>
      righeSegmentate
        .map((r) => `${r.tipo}${r.numero ?? ''}:${r.segmenti.map((s) => `${s.chiave}|${s.testo}|${s.funzione}`).join(' ')}`)
        .join('\n'),
    [righeSegmentate],
  );

  const righeRef = useRef(righeSegmentate);
  righeRef.current = righeSegmentate;
  const onSimboliChangeRef = useRef(onSimboliChange);
  onSimboliChangeRef.current = onSimboliChange;

  /** Risolve tutte le righe, tenendo la struttura a righe. */
  const risolviRighe = useCallback(
    async (daRisolvere: Riga[]): Promise<RigaRisolta[]> =>
      Promise.all(
        daRisolvere.map(async (r) => ({
          tipo: r.tipo,
          numero: r.numero,
          simboli: r.segmenti.length ? await risolvi(r.segmenti, { risolviImmagine }) : [],
        })),
      ),
    [risolviImmagine],
  );

  useEffect(() => {
    if (!chiaveRighe.replace(/[\n:]/g, '').trim()) {
      setRighe([]);
      onSimboliChangeRef.current([]);
      setInElaborazione(false);
      return;
    }

    let annullato = false;
    setInElaborazione(true);

    // Antirimbalzo: mentre si digita non ha senso interrogare la rete ad ogni
    // lettera.
    const timer = setTimeout(async () => {
      const risultato = await risolviRighe(righeRef.current);
      if (annullato) return;
      setRighe(risultato);
      onSimboliChangeRef.current(risultato.flatMap((r) => r.simboli));
      setInElaborazione(false);
    }, 350);

    return () => {
      annullato = true;
      clearTimeout(timer);
    };
  }, [chiaveRighe, risolviRighe]);

  /** Rilegge il vocabolario e ricalcola l'anteprima dopo una correzione. */
  const rigenera = useCallback(async () => {
    const locuzioni = await locuzioniPersonali();
    setPersonali(locuzioni);
    const risultato = await risolviRighe(
      segmentaTesto(testo, { locuzioniPersonali: locuzioni, compattaParoleFunzione }),
    );
    setRighe(risultato);
    onSimboliChangeRef.current(risultato.flatMap((r) => r.simboli));
  }, [testo, compattaParoleFunzione, risolviRighe]);

  const annuncia = (messaggio: string) => {
    setUltimaAzione(messaggio);
    setTimeout(() => setUltimaAzione((v) => (v === messaggio ? null : v)), 2600);
  };

  const simboloIn = (p: Posizione) => righe[p.riga]?.simboli[p.simbolo];

  /* ---------------------------------------------------------------- */
  /* ELENCHI                                                           */
  /* ---------------------------------------------------------------- */

  /**
   * Mette o toglie il marcatore di elenco sulle righe selezionate.
   * Chi non conosce le convenzioni di scrittura usa questi pulsanti; chi le
   * conosce può continuare a digitare "- " a mano, con lo stesso effetto.
   */
  const applicaMarcatore = (tipo: 'punto' | 'numero') => {
    const area = textareaRef.current;
    if (!area) return;

    const inizio = testo.lastIndexOf('\n', Math.max(0, area.selectionStart - 1)) + 1;
    const fineRiga = testo.indexOf('\n', area.selectionEnd);
    const fine = fineRiga === -1 ? testo.length : fineRiga;

    const righeSelezionate = testo.slice(inizio, fine).split('\n');
    const haGiaMarcatore = righeSelezionate.every(
      (r) => !r.trim() || (tipo === 'punto' ? /^\s*[-*•]\s+/.test(r) : /^\s*\d+[.)]\s+/.test(r)),
    );

    const trasformate = righeSelezionate.map((r, i) => {
      if (!r.trim()) return r;
      const nuda = r.replace(/^\s*([-*•]|\d+[.)])\s+/, '');
      if (haGiaMarcatore) return nuda;
      return tipo === 'punto' ? `- ${nuda}` : `${i + 1}. ${nuda}`;
    });

    const nuovo = testo.slice(0, inizio) + trasformate.join('\n') + testo.slice(fine);
    onTestoChange(nuovo);

    // Riporta il cursore in fondo alla parte modificata, così si continua a
    // scrivere senza doverlo riposizionare.
    const nuovaFine = inizio + trasformate.join('\n').length;
    requestAnimationFrame(() => {
      area.focus();
      area.setSelectionRange(nuovaFine, nuovaFine);
    });
  };

  /* ---------------------------------------------------------------- */
  /* CORREZIONI                                                        */
  /* ---------------------------------------------------------------- */

  /** Unisce due tessere adiacenti della stessa riga e ricorda l'unione. */
  const unisci = async (p: Posizione) => {
    const a = simboloIn(p);
    const b = simboloIn({ ...p, simbolo: p.simbolo + 1 });
    if (!a || !b) return;

    const frase = `${a.testo} ${b.testo}`.trim();
    setChipAperto(null);
    setInElaborazione(true);

    // Se ARASAAC ha un simbolo per l'espressione intera lo si adotta, altrimenti
    // si ricorda comunque l'unione: la tessera mostrerà il testo unito.
    const ids = await cerca(frase);
    await ricorda(frase, ids[0] ?? null, true);
    await rigenera();
    setInElaborazione(false);
    annuncia(`"${frase}" resterà unito, anche nelle prossime storie.`);
  };

  /** Scioglie un'unione o dimentica un simbolo scelto. */
  const dividi = async (simbolo: SimboloRisolto) => {
    setChipAperto(null);
    setInElaborazione(true);
    await dimentica(simbolo.chiave);
    await rigenera();
    setInElaborazione(false);
    annuncia(`"${simbolo.testo}": scelta dimenticata.`);
  };

  /** Apre le alternative di una tessera, caricandone le anteprime. */
  const apriAlternative = async (p: Posizione) => {
    if (chipAperto && chipAperto.riga === p.riga && chipAperto.simbolo === p.simbolo) {
      setChipAperto(null);
      return;
    }
    setChipAperto(p);

    const simbolo = simboloIn(p);
    if (!simbolo) return;

    let ids = simbolo.alternative;
    if (ids.length === 0 && simbolo.chiave) ids = await cerca(simbolo.chiave);

    const nuovi: Record<string, string> = {};
    await Promise.all(
      ids.slice(0, 6).map(async (id) => {
        if (alternativeUrl[id]) return;
        const url = await risolviImmagine(id);
        if (url) nuovi[id] = url;
      }),
    );
    if (Object.keys(nuovi).length) setAlternativeUrl((v) => ({ ...v, ...nuovi }));

    if (simbolo.alternative.length === 0 && ids.length) {
      setRighe((prev) =>
        prev.map((r, ri) =>
          ri !== p.riga
            ? r
            : { ...r, simboli: r.simboli.map((s, si) => (si === p.simbolo ? { ...s, alternative: ids.slice(0, 6) } : s)) },
        ),
      );
    }
  };

  /** Sceglie un simbolo fra i suggeriti e lo ricorda per quel termine. */
  const scegli = async (p: Posizione, sourceId: string) => {
    const simbolo = simboloIn(p);
    if (!simbolo) return;
    setChipAperto(null);
    await ricorda(simbolo.chiave, sourceId, simbolo.testo.trim().includes(' '));
    await rigenera();
    annuncia(`Simbolo memorizzato per "${simbolo.testo}".`);
  };

  const chipUnito = (s: SimboloRisolto) =>
    s.testo.trim().includes(' ') && personali.includes(normalizza(s.testo));

  const soloLettura = isLocked;
  const aperto = (p: Posizione) =>
    !!chipAperto && chipAperto.riga === p.riga && chipAperto.simbolo === p.simbolo;

  /* ---------------------------------------------------------------- */
  /* RESA                                                              */
  /* ---------------------------------------------------------------- */

  const haContenuto = righe.some((r) => r.simboli.length > 0);

  return (
    <div className="flex flex-col gap-4">
      {/* ---------- BARRA DI SCRITTURA ---------- */}
      {!soloLettura && (
        <div className="print:hidden">
          <div className="relative rounded-2xl border-2 border-pink-200 dark:border-pink-800 bg-white dark:bg-slate-900 shadow-sm focus-within:border-pink-500 transition-colors">
            <textarea
              ref={textareaRef}
              value={testo}
              onChange={(e) => onTestoChange(e.target.value)}
              rows={4}
              placeholder={'Scrivi la storia come la racconteresti a voce.\nVai a capo quando vuoi: ogni riga diventa una riga di simboli.'}
              aria-label="Testo della storia"
              className="w-full resize-y bg-transparent px-4 py-3 pr-12 text-lg leading-relaxed outline-none text-slate-800 dark:text-white placeholder:text-slate-400 rounded-2xl min-h-[7rem]"
            />
            {inElaborazione && (
              <Loader2 className="absolute right-4 top-4 w-5 h-5 text-pink-500 animate-spin" aria-label="Sto cercando i simboli" />
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {/* Elenchi */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
              <button
                type="button"
                onClick={() => applicaMarcatore('punto')}
                title="Elenco puntato (oppure scrivi &quot;- &quot; a inizio riga)"
                aria-label="Elenco puntato"
                className="p-2 min-h-touch min-w-touch flex items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => applicaMarcatore('numero')}
                title="Elenco numerato (oppure scrivi &quot;1. &quot; a inizio riga)"
                aria-label="Elenco numerato"
                className="p-2 min-h-touch min-w-touch flex items-center justify-center rounded-md text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700"
              >
                <ListOrdered className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => onCompattaChange(!compattaParoleFunzione)}
              aria-pressed={compattaParoleFunzione}
              title="Articoli e preposizioni: tessera propria oppure unite alla parola che reggono"
              className={`flex items-center gap-2 px-3 py-2 min-h-touch rounded-lg text-xs font-bold transition-colors ${
                compattaParoleFunzione
                  ? 'bg-pink-100 dark:bg-pink-900/40 text-pink-800 dark:text-pink-200'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              <Type className="w-4 h-4" />
              {compattaParoleFunzione ? 'Articoli uniti' : 'Un simbolo per parola'}
            </button>

            {onLeggi && testo.trim() && (
              <button
                type="button"
                onClick={() => onLeggi(testo)}
                className="flex items-center gap-2 px-3 py-2 min-h-touch rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100"
              >
                <Volume2 className="w-4 h-4" /> Ascolta
              </button>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400 ml-auto">
              Tocca un simbolo per cambiarlo · <LinkIcon className="w-3 h-3 inline" /> per unire due parole
            </p>
          </div>
        </div>
      )}

      {controlli}

      {ultimaAzione && (
        <p role="status" className="print:hidden text-xs font-medium text-emerald-800 dark:text-emerald-200 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-lg px-3 py-2">
          {ultimaAzione}
        </p>
      )}

      {/* ---------- ANTEPRIMA / CONTENUTO STAMPABILE ---------- */}
      <div style={stiliDimensione} className="story-print-container print-only-content flex-1 bg-white dark:bg-slate-800 p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 min-h-[40vh]">
        {!haContenuto ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 py-16 print:hidden">
            <p className="text-center max-w-sm">
              Scrivi qui sopra e i simboli compariranno subito, senza dover aggiungere
              una parola alla volta.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {righe.map((riga, ri) => {
              // Una riga vuota è uno stacco voluto fra due blocchi.
              if (riga.tipo === 'vuota' || riga.simboli.length === 0) {
                return <div key={ri} className="h-6" aria-hidden="true" />;
              }

              return (
                <div key={ri} className="flex items-end gap-2 break-inside-avoid">
                  {/* Marcatore dell'elenco. `min-w` invece di larghezza fissa:
                      con la numerazione a due cifre il numero andrebbe a capo. */}
                  {riga.tipo !== 'normale' && (
                    <span
                      aria-hidden="true"
                      className={`shrink-0 mb-10 min-w-[2.2rem] text-right font-bold text-slate-600 dark:text-slate-300 tabular-nums ${
                        riga.tipo === 'punto' ? 'text-4xl leading-none' : 'text-2xl'
                      }`}
                    >
                      {riga.tipo === 'punto' ? '•' : `${riga.numero}.`}
                    </span>
                  )}

                  <div className="flex flex-wrap items-end gap-x-1 gap-y-6">
                    {riga.simboli.map((simbolo, si) => {
                      const p: Posizione = { riga: ri, simbolo: si };
                      return (
                        <React.Fragment key={`${simbolo.chiave}-${si}`}>
                          <div style={{ width: 'var(--caa-simbolo, 3.5cm)' }}
                            className="relative flex flex-col items-center justify-end break-inside-avoid w-[3.5cm]">
                            <button
                              type="button"
                              disabled={soloLettura}
                              onClick={() => apriAlternative(p)}
                              aria-label={`Simbolo per ${simbolo.testo}. Tocca per cambiarlo.`}
                              aria-expanded={aperto(p)}
                              className={`w-full aspect-square rounded-xl overflow-hidden mb-1 bg-white relative border-2 transition-colors print:border-none print:shadow-none ${
                                soloLettura
                                  ? 'border-transparent'
                                  : aperto(p)
                                    ? 'border-pink-500 ring-2 ring-pink-200'
                                    : 'border-slate-100 dark:border-slate-700 hover:border-pink-400'
                              }`}
                            >
                              {simbolo.imageUrl ? (
                                <img src={simbolo.imageUrl} alt="" className="w-full h-full object-contain p-1" />
                              ) : (
                                <span className="absolute inset-0 flex items-center justify-center p-2 text-center text-xs font-bold uppercase text-slate-400 break-words print:text-black">
                                  {simbolo.testo}
                                </span>
                              )}
                              {simbolo.daMemoria && !soloLettura && (
                                <span className="absolute top-1 right-1 print:hidden" title="Simbolo memorizzato da te">
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                </span>
                              )}
                            </button>

                            <span
                              style={{ fontSize: 'var(--caa-testo, 1.125rem)' }}
                              className="font-bold font-sans text-center leading-tight text-slate-800 dark:text-slate-200 break-words w-full"
                            >
                              {simbolo.testo}
                            </span>

                            {!soloLettura && chipUnito(simbolo) && (
                              <button
                                type="button"
                                onClick={() => dividi(simbolo)}
                                className="print:hidden mt-1 flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 hover:bg-red-100 hover:text-red-700"
                              >
                                <Scissors className="w-3 h-3" /> dividi
                              </button>
                            )}

                            {/* Tendina rapida: suggeriti + ricerca completa */}
                            {aperto(p) && !soloLettura && (
                              <div className="print:hidden absolute z-30 top-full mt-2 left-1/2 -translate-x-1/2 w-[16rem] p-2 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2 px-1">
                                  Simbolo per "{simbolo.testo}"
                                </p>

                                <div className="grid grid-cols-4 gap-1">
                                  {simbolo.alternative.map((id) => (
                                    <button
                                      key={id}
                                      type="button"
                                      onClick={() => scegli(p, id)}
                                      title="Usa questo simbolo"
                                      className={`aspect-square rounded-lg border-2 p-1 hover:border-pink-500 transition-colors ${
                                        id === simbolo.sourceId ? 'border-pink-500 bg-pink-50' : 'border-slate-200 dark:border-slate-600'
                                      }`}
                                    >
                                      <img
                                        src={alternativeUrl[id] ?? urlImmagineArasaac(id)}
                                        alt=""
                                        className="w-full h-full object-contain"
                                      />
                                    </button>
                                  ))}

                                  {/* Sempre presente, anche senza suggerimenti e
                                      anche sulle tessere di più parole: apre la
                                      ricerca completa (foto, galleria, link). */}
                                  {onApriRicerca && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setChipAperto(null);
                                        onApriRicerca(simbolo.chiave || normalizza(simbolo.testo), simbolo.testo);
                                      }}
                                      title="Cerca altre immagini o carica la tua"
                                      aria-label="Cerca altre immagini o carica la tua"
                                      className="aspect-square rounded-lg border-2 border-dashed border-slate-300 dark:border-slate-600 flex items-center justify-center text-slate-500 hover:border-pink-500 hover:text-pink-600 transition-colors"
                                    >
                                      <Plus className="w-5 h-5" />
                                    </button>
                                  )}
                                </div>

                                {simbolo.alternative.length === 0 && (
                                  <p className="mt-2 text-[11px] text-slate-500 px-1">
                                    Nessun suggerimento per "{simbolo.testo}". Usa
                                    <Plus className="w-3 h-3 inline mx-0.5" />
                                    per cercarne uno o caricare un'immagine tua.
                                  </p>
                                )}

                                {simbolo.daMemoria && (
                                  <button
                                    type="button"
                                    onClick={() => dividi(simbolo)}
                                    className="mt-2 w-full px-2 py-2 min-h-touch rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                                  >
                                    <RefreshCw className="w-3 h-3 inline mr-1" /> Dimentica questa scelta
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Unione fra due tessere: sempre visibile, anche al
                              tocco. Prima era `opacity-0 group-hover:opacity-100`,
                              quindi su tablet e telefono non compariva mai. */}
                          {!soloLettura && si < riga.simboli.length - 1 && (
                            <button
                              type="button"
                              onClick={() => unisci(p)}
                              aria-label={`Unisci "${simbolo.testo}" e "${riga.simboli[si + 1].testo}" in un unico simbolo`}
                              title="Unisci in un unico simbolo"
                              className="print:hidden self-center mb-8 shrink-0 w-8 h-11 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-pink-500 transition-colors"
                            >
                              <LinkIcon className="w-4 h-4" />
                            </button>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
