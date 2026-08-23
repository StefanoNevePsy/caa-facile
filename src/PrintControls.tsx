import React from 'react';
import { Printer, Maximize2, ImageIcon, Type } from 'lucide-react';
import { adattaSimboloAllaPagina, type VersoFoglio } from './lib/stampa';

/**
 * Controlli di dimensione e stampa, condivisi da agenda e storie sociali.
 *
 * La dimensione delle tessere e del testo si regola in centimetri e in punti,
 * non con etichette vaghe come "medio": chi stampa un'agenda da appendere sa
 * quanto grande la vuole, e vedere la misura permette di ripetere lo stesso
 * risultato la volta dopo.
 */

export interface ImpostazioniStampa {
  simboloCm: number;
  testoPt: number;
  adattaPagina: boolean;
  verso: VersoFoglio;
}

export interface ControlliStampaProps {
  impostazioni: ImpostazioniStampa;
  onCambia: (campo: keyof ImpostazioniStampa, valore: number | boolean | string) => void;
  onStampa: () => void;
  /** Quante tessere verranno stampate: serve al calcolo dell'adattamento. */
  elementi: number;
  /** Come si dispongono in stampa. */
  disposizione: 'colonna' | 'griglia';
  /** Colore di accento, per restare in tinta con lo strumento. */
  tinta: 'emerald' | 'pink';
}

const TINTE = {
  emerald: {
    sfondo: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800',
    attivo: 'bg-emerald-100 text-emerald-800',
    bottone: 'bg-emerald-600 hover:bg-emerald-700',
    cursore: 'accent-emerald-600',
    etichetta: 'text-emerald-700 dark:text-emerald-300',
  },
  pink: {
    sfondo: 'bg-pink-50 dark:bg-pink-900/20 border-pink-100 dark:border-pink-800',
    attivo: 'bg-pink-100 text-pink-800',
    bottone: 'bg-pink-600 hover:bg-pink-700',
    cursore: 'accent-pink-600',
    etichetta: 'text-pink-700 dark:text-pink-300',
  },
};

export default function ControlliStampa({
  impostazioni,
  onCambia,
  onStampa,
  elementi,
  disposizione,
  tinta,
}: ControlliStampaProps) {
  const c = TINTE[tinta];
  const { simboloCm, testoPt, adattaPagina, verso } = impostazioni;

  // Con l'adattamento attivo la misura la decide il calcolo, non il cursore.
  const adattamento = adattaSimboloAllaPagina({
    elementi,
    verso,
    disposizione,
    altezzaTesto: testoPt / 28.35, // punti -> centimetri, con un po' di respiro
  });
  const latoEffettivo = adattaPagina ? adattamento.lato : simboloCm;

  const id = React.useId();

  return (
    <div className={`print:hidden w-full rounded-xl border p-3 ${c.sfondo} flex flex-col gap-3`}>
      <div className="flex flex-wrap items-end gap-4">
        {/* Dimensione delle tessere */}
        <div className="flex flex-col gap-1 min-w-[11rem] flex-1">
          <label htmlFor={`${id}-simbolo`} className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 ${c.etichetta}`}>
            <ImageIcon className="w-3 h-3" /> Simboli
            <span className="ml-auto tabular-nums font-mono normal-case tracking-normal">
              {latoEffettivo.toFixed(1)} cm
            </span>
          </label>
          <input
            id={`${id}-simbolo`}
            type="range"
            min={1.5}
            max={12}
            step={0.1}
            value={simboloCm}
            disabled={adattaPagina}
            onChange={(e) => onCambia('simboloCm', Number(e.target.value))}
            className={`w-full ${c.cursore} disabled:opacity-40`}
          />
        </div>

        {/* Dimensione del testo */}
        <div className="flex flex-col gap-1 min-w-[11rem] flex-1">
          <label htmlFor={`${id}-testo`} className={`text-[10px] uppercase font-bold tracking-wider flex items-center gap-1 ${c.etichetta}`}>
            <Type className="w-3 h-3" /> Testo
            <span className="ml-auto tabular-nums font-mono normal-case tracking-normal">{testoPt} pt</span>
          </label>
          <input
            id={`${id}-testo`}
            type="range"
            min={8}
            max={48}
            step={1}
            value={testoPt}
            onChange={(e) => onCambia('testoPt', Number(e.target.value))}
            className={`w-full ${c.cursore}`}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Adatta alla pagina */}
        <button
          type="button"
          onClick={() => onCambia('adattaPagina', !adattaPagina)}
          aria-pressed={adattaPagina}
          title="Ingrandisce le tessere fino a riempire il foglio"
          className={`flex items-center gap-2 px-3 py-2 min-h-touch rounded-lg text-xs font-bold transition-colors ${
            adattaPagina ? c.attivo : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          <Maximize2 className="w-4 h-4" /> Adatta alla pagina
        </button>

        {/* Verso del foglio */}
        <div className="flex bg-white dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={() => onCambia('verso', 'portrait')}
            aria-pressed={verso === 'portrait'}
            title="Foglio verticale"
            className={`px-2.5 py-2 min-h-touch rounded text-xs font-bold flex items-center gap-1 transition-colors ${
              verso === 'portrait' ? c.attivo : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <div className="w-3 h-4 border-2 border-current rounded-sm" /> Vert.
          </button>
          <button
            type="button"
            onClick={() => onCambia('verso', 'landscape')}
            aria-pressed={verso === 'landscape'}
            title="Foglio orizzontale"
            className={`px-2.5 py-2 min-h-touch rounded text-xs font-bold flex items-center gap-1 transition-colors ${
              verso === 'landscape' ? c.attivo : 'text-slate-500 dark:text-slate-400 hover:text-slate-700'
            }`}
          >
            <div className="w-4 h-3 border-2 border-current rounded-sm" /> Orizz.
          </button>
        </div>

        <button
          type="button"
          onClick={onStampa}
          className={`${c.bottone} text-white px-4 py-2 min-h-touch rounded-lg font-bold flex items-center gap-2 shadow-sm text-sm`}
        >
          <Printer className="w-4 h-4" /> Stampa
        </button>

        {/* Quante pagine usciranno: meglio saperlo prima di premere. */}
        {elementi > 0 && (
          <p className={`text-xs ml-auto ${adattamento.traboccante && adattaPagina ? 'text-amber-700 dark:text-amber-300 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
            {adattaPagina
              ? adattamento.pagine === 1
                ? 'Entra in una pagina'
                : `Servono ${adattamento.pagine} pagine`
              : 'Dimensione fissa'}
          </p>
        )}
      </div>
    </div>
  );
}

/** Variabili CSS lette dai renderer di agenda e storie. */
export function variabiliDimensione(latoCm: number, testoPt: number): React.CSSProperties {
  return {
    ['--caa-simbolo' as any]: `${latoCm}cm`,
    ['--caa-testo' as any]: `${testoPt}pt`,
  };
}
