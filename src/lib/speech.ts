/**
 * Sintesi vocale (Web Speech API).
 *
 * È il pezzo che trasforma una griglia di simboli in un vero ausilio di
 * comunicazione: il bambino tocca il pittogramma e la frase viene pronunciata.
 * Funziona offline su iOS, Android e desktop, senza servizi esterni.
 */

const VOICE_PREF_KEY = 'caa_voice_uri';
const RATE_PREF_KEY = 'caa_voice_rate';

export interface VoiceOption {
  uri: string;
  name: string;
  lang: string;
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/**
 * L'elenco delle voci si popola in modo asincrono su Chrome: chi legge subito
 * dopo il caricamento della pagina trova un array vuoto. Questa funzione
 * attende l'evento `voiceschanged`, con un limite di tempo per non bloccare.
 */
function loadVoices(): Promise<SpeechSynthesisVoice[]> {
  if (!isSpeechSupported()) return Promise.resolve([]);
  const existing = speechSynthesis.getVoices();
  if (existing.length) return Promise.resolve(existing);

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      speechSynthesis.removeEventListener('voiceschanged', finish);
      resolve(speechSynthesis.getVoices());
    };
    speechSynthesis.addEventListener('voiceschanged', finish);
    setTimeout(finish, 1500);
  });
}

let cachedVoices: SpeechSynthesisVoice[] = [];

export async function listVoices(): Promise<VoiceOption[]> {
  cachedVoices = await loadVoices();
  return cachedVoices
    // Le voci italiane per prime: è la lingua dell'app.
    .filter((v) => v.lang.toLowerCase().startsWith('it') || v.default)
    .map((v) => ({ uri: v.voiceURI, name: v.name, lang: v.lang }));
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  if (!cachedVoices.length) cachedVoices = speechSynthesis.getVoices();

  let preferred: string | null = null;
  try {
    preferred = localStorage.getItem(VOICE_PREF_KEY);
  } catch { /* storage non disponibile */ }

  if (preferred) {
    const match = cachedVoices.find((v) => v.voiceURI === preferred);
    if (match) return match;
  }
  return (
    cachedVoices.find((v) => v.lang.toLowerCase().startsWith('it')) ??
    cachedVoices.find((v) => v.default)
  );
}

export function setPreferredVoice(uri: string | null): void {
  try {
    if (uri) localStorage.setItem(VOICE_PREF_KEY, uri);
    else localStorage.removeItem(VOICE_PREF_KEY);
  } catch { /* storage non disponibile */ }
}

export function getPreferredVoice(): string | null {
  try {
    return localStorage.getItem(VOICE_PREF_KEY);
  } catch {
    return null;
  }
}

export function getRate(): number {
  try {
    const raw = Number(localStorage.getItem(RATE_PREF_KEY));
    // Una velocità ridotta aiuta la comprensione: 0.9 è un buon punto di partenza.
    return Number.isFinite(raw) && raw >= 0.5 && raw <= 1.5 ? raw : 0.9;
  } catch {
    return 0.9;
  }
}

export function setRate(rate: number): void {
  try {
    localStorage.setItem(RATE_PREF_KEY, String(rate));
  } catch { /* storage non disponibile */ }
}

/**
 * Pronuncia un testo. Interrompe sempre l'enunciato precedente: se il bambino
 * tocca due simboli di seguito deve sentire il secondo, non una coda.
 */
export function speak(text: string): void {
  if (!isSpeechSupported()) return;
  const trimmed = text?.trim();
  if (!trimmed) return;

  speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(trimmed);
  const voice = pickVoice();
  if (voice) utterance.voice = voice;
  utterance.lang = voice?.lang ?? 'it-IT';
  utterance.rate = getRate();
  utterance.pitch = 1;

  speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (isSpeechSupported()) speechSynthesis.cancel();
}

/** Prepara il motore vocale: su iOS la prima riproduzione richiede un gesto. */
export function primeSpeech(): void {
  if (!isSpeechSupported()) return;
  void listVoices();
}
