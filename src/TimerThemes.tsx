import React from 'react';

/**
 * Rappresentazioni visive del tempo che passa.
 *
 * Ogni tema riceve gli stessi dati e disegna il tempo a modo suo. Il criterio
 * di scelta non è estetico: bambini diversi leggono il tempo in modi diversi.
 * Il disco (Time Timer) mostra una quantità che si riduce, la sabbia mostra un
 * travaso continuo, la batteria e il razzo mostrano un traguardo da
 * raggiungere. Averne più di uno serve a trovare quello che funziona.
 */

export type TimerTheme = 'liquid' | 'mouse' | 'disc' | 'sand' | 'battery' | 'rocket' | 'cake';

export interface TimerThemeProps {
  /** Percentuale di tempo ancora disponibile (100 -> 0). */
  percentuale: number;
  timeLeft: number;
  isActive: boolean;
  isFinished: boolean;
  /** Colore che segue l'avanzamento (verde -> giallo -> rosso). */
  colore: string;
  /** Immagine premio scelta dall'utente, mostrata al traguardo. */
  immagine?: React.ReactNode;
  onSelectImage?: () => void;
}

const formatta = (s: number) =>
  `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

/* ------------------------------------------------------------------ */
/* DISCO (Time Timer)                                                  */
/* ------------------------------------------------------------------ */

/**
 * Il settore colorato si rimpicciolisce girando in senso orario. È lo standard
 * di fatto in ambito autismo perché mostra il tempo come *quantità*, leggibile
 * anche da chi non ha ancora il concetto di numero.
 */
export function DiscoTimer({ percentuale, timeLeft, isFinished, colore }: TimerThemeProps) {
  const R = 46;
  const angolo = (percentuale / 100) * 360;

  // Un arco SVG non può descrivere un giro completo: sopra i 359.9° si disegna
  // un cerchio pieno, altrimenti il settore collasserebbe a zero.
  const settore = (() => {
    if (percentuale >= 99.95) return null;
    const rad = ((angolo - 90) * Math.PI) / 180;
    const x = 50 + R * Math.cos(rad);
    const y = 50 + R * Math.sin(rad);
    return `M 50 50 L 50 ${50 - R} A ${R} ${R} 0 ${angolo > 180 ? 1 : 0} 1 ${x} ${y} Z`;
  })();

  return (
    <div className="relative mt-4 w-64 h-64 md:w-96 md:h-96 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
        {/* Quadrante */}
        <circle cx="50" cy="50" r="48" className="fill-white dark:fill-slate-800" />
        <circle cx="50" cy="50" r="48" fill="none" strokeWidth="3" className="stroke-slate-300 dark:stroke-slate-600" />

        {/* Tacche dei cinque minuti: danno riferimenti senza numeri */}
        {Array.from({ length: 12 }).map((_, i) => {
          const rad = ((i * 30 - 90) * Math.PI) / 180;
          return (
            <line
              key={i}
              x1={50 + 40 * Math.cos(rad)} y1={50 + 40 * Math.sin(rad)}
              x2={50 + 45 * Math.cos(rad)} y2={50 + 45 * Math.sin(rad)}
              strokeWidth={i % 3 === 0 ? 2 : 1}
              className="stroke-slate-400 dark:stroke-slate-500"
            />
          );
        })}

        {percentuale >= 99.95 ? (
          <circle cx="50" cy="50" r={R} fill={colore} className="transition-[fill] duration-700" />
        ) : settore ? (
          <path d={settore} fill={colore} className="transition-[fill] duration-700" />
        ) : null}

        <circle cx="50" cy="50" r="3.5" className="fill-slate-700 dark:fill-slate-300" />
      </svg>

      <div className="absolute inset-0 flex items-end justify-center pb-6 md:pb-10 pointer-events-none">
        <span className={`font-black text-3xl md:text-5xl tabular-nums drop-shadow-sm ${isFinished ? 'text-green-600' : 'text-slate-700 dark:text-white'}`}>
          {isFinished ? 'Finito!' : formatta(timeLeft)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* CLESSIDRA                                                           */
/* ------------------------------------------------------------------ */

/**
 * La sabbia scende dall'ampolla superiore a quella inferiore. Molto concreto:
 * si vede da dove viene e dove va il tempo, senza bisogno di leggere nulla.
 */
export function ClessidraTimer({ percentuale, timeLeft, isActive, isFinished }: TimerThemeProps) {
  const sopra = percentuale / 100;
  const sotto = 1 - sopra;

  return (
    <div className="relative mt-4 mb-12 w-56 h-72 md:w-72 md:h-96 mx-auto">
      <svg viewBox="0 0 100 140" className="w-full h-full drop-shadow-xl">
        <defs>
          {/* Le ampolle ritagliano la sabbia, così resta dentro il vetro. */}
          <clipPath id="ampolla-sopra">
            <path d="M 20 12 L 80 12 L 55 68 L 45 68 Z" />
          </clipPath>
          <clipPath id="ampolla-sotto">
            <path d="M 45 72 L 55 72 L 80 128 L 20 128 Z" />
          </clipPath>
          <linearGradient id="sabbia" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
        </defs>

        {/* Montatura */}
        <rect x="12" y="4" width="76" height="8" rx="4" className="fill-amber-800" />
        <rect x="12" y="128" width="76" height="8" rx="4" className="fill-amber-800" />

        {/* Vetro */}
        <path d="M 20 12 L 80 12 L 55 68 L 55 72 L 80 128 L 20 128 L 45 72 L 45 68 Z"
              className="fill-sky-50/70 dark:fill-slate-700/50 stroke-slate-400" strokeWidth="1.5" />

        {/* Sabbia in alto: si abbassa consumando il tempo */}
        <g clipPath="url(#ampolla-sopra)">
          <rect x="0" y={12 + (1 - sopra) * 56} width="100" height="60" fill="url(#sabbia)"
                className="transition-[y] duration-1000 ease-linear" />
        </g>

        {/* Sabbia in basso: cresce come un mucchietto */}
        <g clipPath="url(#ampolla-sotto)">
          <rect x="0" y={128 - sotto * 56} width="100" height="60" fill="url(#sabbia)"
                className="transition-[y] duration-1000 ease-linear" />
        </g>

        {/* Filo di sabbia che cade, solo mentre scorre il tempo */}
        {isActive && !isFinished && percentuale > 0.5 && (
          <line x1="50" y1="66" x2="50" y2="120" stroke="#f59e0b" strokeWidth="1.6" opacity="0.85">
            <animate attributeName="opacity" values="0.85;0.35;0.85" dur="0.7s" repeatCount="indefinite" />
          </line>
        )}
      </svg>

      {/* Sotto la montatura, non sopra: sulla base di legno era illeggibile. */}
      <div className="absolute inset-x-0 -bottom-10 flex justify-center">
        <span className={`font-black text-2xl md:text-4xl tabular-nums ${isFinished ? 'text-green-600' : 'text-amber-700 dark:text-amber-300'}`}>
          {isFinished ? 'Finito!' : formatta(timeLeft)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* BATTERIA                                                            */
/* ------------------------------------------------------------------ */

/** Metafora quotidiana: la carica cala a tacche, come su ogni telefono. */
export function BatteriaTimer({ percentuale, timeLeft, isFinished, colore }: TimerThemeProps) {
  const tacche = 10;
  const piene = Math.ceil((percentuale / 100) * tacche);

  return (
    <div className="relative mt-6 w-full max-w-md mx-auto">
      <svg viewBox="0 0 220 100" className="w-full drop-shadow-xl">
        <rect x="4" y="14" width="196" height="72" rx="12"
              className="fill-white dark:fill-slate-800 stroke-slate-400 dark:stroke-slate-500" strokeWidth="4" />
        <rect x="202" y="38" width="14" height="24" rx="4" className="fill-slate-400 dark:fill-slate-500" />

        {Array.from({ length: tacche }).map((_, i) => (
          <rect
            key={i}
            x={14 + i * 18.4} y={26} width="15" height="48" rx="3"
            fill={i < piene ? colore : 'transparent'}
            className={`transition-all duration-500 ${i < piene ? '' : 'fill-slate-100 dark:fill-slate-700'}`}
          />
        ))}
      </svg>
      <div className="text-center mt-3">
        <span className={`font-black text-3xl md:text-5xl tabular-nums ${isFinished ? 'text-green-600' : 'text-slate-700 dark:text-white'}`}>
          {isFinished ? 'Finito!' : formatta(timeLeft)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* RAZZO                                                               */
/* ------------------------------------------------------------------ */

/**
 * Il razzo sale verso il premio man mano che il tempo passa: qui il tempo non
 * è una perdita ma un avvicinamento, utile quando l'attesa va incoraggiata.
 */
export function RazzoTimer({ percentuale, timeLeft, isActive, isFinished, immagine, onSelectImage }: TimerThemeProps) {
  const salita = 100 - percentuale; // 0 in basso, 100 al traguardo

  return (
    <div className="relative mt-4 w-full max-w-xs mx-auto h-80 md:h-96 rounded-3xl bg-gradient-to-b from-indigo-900 via-indigo-700 to-sky-300 overflow-hidden border-4 border-indigo-200 dark:border-slate-700 shadow-xl">
      {/* Stelle: fisse, così non distraggono */}
      {[[18, 14], [72, 22], [40, 34], [86, 46], [26, 58], [60, 70]].map(([x, y], i) => (
        <span key={i} className="absolute rounded-full bg-white/80"
              style={{ left: `${x}%`, top: `${y}%`, width: i % 2 ? 3 : 5, height: i % 2 ? 3 : 5 }} />
      ))}

      {/* Traguardo */}
      <button
        type="button"
        onClick={onSelectImage}
        className={`absolute top-3 left-1/2 -translate-x-1/2 w-20 h-20 rounded-2xl bg-white/90 flex items-center justify-center p-2 transition-transform duration-700 ${isFinished ? 'scale-125 ring-4 ring-yellow-300' : ''}`}
      >
        {immagine ?? <span className="text-[10px] font-bold uppercase text-slate-500 text-center leading-tight">Tocca img finale</span>}
      </button>

      {/* Razzo */}
      <div
        className="absolute left-1/2 -translate-x-1/2 transition-[bottom] duration-1000 ease-linear"
        style={{ bottom: `calc(${Math.min(salita, 92)}% + 8px)` }}
      >
        <svg viewBox="0 0 40 64" className="w-12 h-20 drop-shadow-lg">
          <path d="M20 2 C 30 14, 32 30, 30 42 L 10 42 C 8 30, 10 14, 20 2 Z" className="fill-slate-100" />
          <circle cx="20" cy="20" r="5" className="fill-sky-400 stroke-slate-400" strokeWidth="1.5" />
          <path d="M10 34 L 2 48 L 10 44 Z" className="fill-red-500" />
          <path d="M30 34 L 38 48 L 30 44 Z" className="fill-red-500" />
          {isActive && !isFinished && (
            <path d="M14 42 Q 20 60, 26 42 Z" className="fill-amber-400">
              <animate attributeName="opacity" values="1;0.45;1" dur="0.35s" repeatCount="indefinite" />
            </path>
          )}
        </svg>
      </div>

      <div className="absolute inset-x-0 bottom-2 text-center">
        <span className={`font-black text-2xl tabular-nums drop-shadow ${isFinished ? 'text-green-200' : 'text-white'}`}>
          {isFinished ? 'Arrivato!' : formatta(timeLeft)}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TORTA                                                               */
/* ------------------------------------------------------------------ */

/** Le fette spariscono una alla volta: il tempo diventa una quantità contabile. */
export function TortaTimer({ percentuale, timeLeft, isFinished, colore }: TimerThemeProps) {
  const fette = 8;
  const rimaste = Math.ceil((percentuale / 100) * fette);

  return (
    <div className="relative mt-4 w-64 h-64 md:w-80 md:h-80 mx-auto">
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-xl">
        <circle cx="50" cy="50" r="47" className="fill-amber-50 dark:fill-slate-800 stroke-amber-200 dark:stroke-slate-600" strokeWidth="2" strokeDasharray="3 3" />
        {Array.from({ length: fette }).map((_, i) => {
          const a0 = (i * 360) / fette - 90;
          const a1 = ((i + 1) * 360) / fette - 90;
          const r = 45;
          const p = (a: number) => [50 + r * Math.cos((a * Math.PI) / 180), 50 + r * Math.sin((a * Math.PI) / 180)];
          const [x0, y0] = p(a0);
          const [x1, y1] = p(a1);
          const presente = i < rimaste;
          return (
            <path
              key={i}
              d={`M 50 50 L ${x0} ${y0} A ${r} ${r} 0 0 1 ${x1} ${y1} Z`}
              fill={presente ? colore : 'transparent'}
              className={`transition-opacity duration-500 stroke-white ${presente ? 'opacity-100' : 'opacity-0'}`}
              strokeWidth="1.5"
            />
          );
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={`font-black text-3xl md:text-4xl tabular-nums drop-shadow ${isFinished ? 'text-green-600' : 'text-white'}`}>
          {isFinished ? 'Finito!' : formatta(timeLeft)}
        </span>
      </div>
    </div>
  );
}
