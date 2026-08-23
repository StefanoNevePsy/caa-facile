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
