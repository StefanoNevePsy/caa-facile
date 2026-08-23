/**
 * Conoscenza minima dell'italiano necessaria a trasformare una frase scritta
 * normalmente in una sequenza di simboli, senza correzioni manuali.
 *
 * Risolve tre problemi che rendono macchinosi i writer di simboli:
 *
 *  1. ARASAAC indicizza gli infiniti e i singolari maschili ("mangiare",
 *     "bambino"). Chi scrive usa le forme flesse ("mangio", "bambine").
 *     -> `candidateLemmas` genera le forme da provare, in ordine di probabilità.
 *
 *  2. Molte espressioni sono un concetto solo e ARASAAC le ha come simbolo
 *     unico ("andare a scuola", "per favore"), ma i writer le spezzano.
 *     -> `LOCUZIONI` le riconosce prima della segmentazione.
 *
 *  3. Articoli e preposizioni non hanno un simbolo sensato da soli.
 *     -> `PAROLE_FUNZIONE` permette di agglutinarle alla parola che reggono.
 */

/** Articoli, preposizioni e congiunzioni: nessun simbolo proprio utile. */
export const PAROLE_FUNZIONE = new Set([
  // articoli
  'il', 'lo', 'la', 'i', 'gli', 'le', 'un', 'uno', 'una', "un'",
  // preposizioni semplici
  'di', 'a', 'da', 'in', 'con', 'su', 'per', 'tra', 'fra',
  // preposizioni articolate
  'del', 'dello', 'della', 'dei', 'degli', 'delle',
  'al', 'allo', 'alla', 'ai', 'agli', 'alle',
  'dal', 'dallo', 'dalla', 'dai', 'dagli', 'dalle',
  'nel', 'nello', 'nella', 'nei', 'negli', 'nelle',
  'sul', 'sullo', 'sulla', 'sui', 'sugli', 'sulle',
  'col', 'coi',
  // congiunzioni e particelle
  'e', 'ed', 'o', 'od', 'che', 'ma', 'se', 'ci', 'ne', 'si',
]);

/**
 * Espressioni che ARASAAC rappresenta con un simbolo unico o che in CAA si
 * trattano come blocco. Ordinate per lunghezza in fase di ricerca, così le
 * più specifiche vincono ("andare a scuola" prima di "andare").
 *
 * L'elenco copre le routine quotidiane, i bisogni, le emozioni e le formule
 * di cortesia: sono le espressioni che ricorrono in quasi ogni storia sociale.
 */
export const LOCUZIONI: string[] = [
  // routine e spostamenti
  'andare a scuola', 'andare a casa', 'andare a letto', 'andare a dormire',
  'andare in bagno', 'andare fuori', 'andare via', 'andare a passeggio',
  'tornare a casa', 'uscire di casa', 'salire in macchina', 'scendere dalla macchina',
  'prendere il pullman', 'prendere il treno', 'aspettare il turno',
  // igiene e cura di sé
  'lavarsi le mani', 'lavarsi i denti', 'lavare i denti', 'fare la doccia',
  'fare il bagno', 'mettersi il pigiama', 'vestirsi da solo', 'pettinarsi i capelli',
  'soffiarsi il naso', 'andare in bagno da solo',
  // pasti
  'fare colazione', 'apparecchiare la tavola', 'sparecchiare la tavola',
  'mangiare la merenda', 'bere l’acqua', 'bere acqua', 'avere fame', 'avere sete',
  // scuola
  'fare i compiti', 'alzare la mano', 'stare seduto', 'stare in fila',
  'ascoltare la maestra', 'ascoltare il maestro', 'leggere un libro',
  'fare merenda', 'suonare la campanella', 'ricreazione a scuola',
  // gioco e tempo libero
  'giocare con gli amici', 'giocare fuori', 'guardare la televisione',
  'guardare un cartone', 'ascoltare la musica', 'andare al parco',
  'andare in piscina', 'andare al mare', 'fare un disegno', 'giocare a palla',
  // relazioni
  'mamma e papà', 'i miei amici', 'la mia famiglia', 'il mio fratello',
  'la mia sorella', 'i nonni', 'stare insieme', 'fare amicizia',
  'dare la mano', 'fare un abbraccio', 'dare un bacio',
  // emozioni e stati
  'essere felice', 'essere triste', 'essere arrabbiato', 'essere stanco',
  'essere contento', 'avere paura', 'avere sonno', 'stare bene', 'stare male',
  'sentirsi meglio', 'fare un respiro', 'stare calmo', 'stare tranquillo',
  // cortesia e comunicazione
  'per favore', 'per piacere', 'grazie mille', 'buon giorno', 'buongiorno',
  'buona notte', 'buonanotte', 'buona sera', 'buonasera', 'a domani',
  'ci vediamo', 'mi dispiace', 'chiedere aiuto', 'chiedere scusa',
  'dire di sì', 'dire di no', 'non voglio', 'voglio ancora', 'ho finito',
  'aiutami per favore', 'posso avere',
  // tempo
  'oggi pomeriggio', 'domani mattina', 'la settimana prossima',
  'fra poco', 'più tardi', 'fine settimana', 'tutti i giorni',
  'prima di', 'dopo di', 'adesso subito',
  // salute
  'andare dal dottore', 'andare dal dentista', 'prendere la medicina',
  'mi fa male', 'fare la puntura', 'misurare la febbre',
  // casa
  'mettere in ordine', 'fare il letto', 'buttare la spazzatura',
  'aiutare la mamma', 'aiutare il papà', 'stare a tavola',
];

/** Indice per lunghezza decrescente: le locuzioni lunghe vanno provate prima. */
const LOCUZIONI_ORDINATE = [...LOCUZIONI].sort(
  (a, b) => b.split(' ').length - a.split(' ').length,
);

const MAX_PAROLE_LOCUZIONE = Math.max(
  ...LOCUZIONI.map((l) => l.split(' ').length),
);

export function normalizza(testo: string): string {
  return testo
    .toLowerCase()
    .replace(/[’']/g, '’')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Verbi irregolari ad alta frequenza: le regole a suffisso non li recuperano
 * ("vado" non deriva da "vadare") e sono proprio quelli che si usano di più
 * scrivendo una storia. Mappa forma flessa -> infinito.
 */
const VERBI_IRREGOLARI: Record<string, string> = {};
const coniugazioni: Array<[string, string[]]> = [
  ['andare', ['vado', 'vai', 'va', 'andiamo', 'andate', 'vanno', 'andato', 'andata', 'andrò', 'andrai']],
  ['essere', ['sono', 'sei', 'è', 'siamo', 'siete', 'stato', 'stata', 'sarà', 'era', 'erano']],
  ['avere', ['ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno', 'avuto', 'avrò', 'aveva']],
  ['fare', ['faccio', 'fai', 'fa', 'facciamo', 'fate', 'fanno', 'fatto', 'fatta', 'farò', 'faceva']],
  ['dire', ['dico', 'dici', 'dice', 'diciamo', 'dite', 'dicono', 'detto', 'detta', 'dirò']],
  ['stare', ['sto', 'stai', 'sta', 'stiamo', 'state', 'stanno', 'starò']],
  ['dare', ['do', 'dai', 'dà', 'diamo', 'date', 'danno', 'dato', 'darò']],
  ['venire', ['vengo', 'vieni', 'viene', 'veniamo', 'venite', 'vengono', 'venuto', 'verrò']],
  ['potere', ['posso', 'puoi', 'può', 'possiamo', 'potete', 'possono', 'potuto', 'potrò']],
  ['volere', ['voglio', 'vuoi', 'vuole', 'vogliamo', 'volete', 'vogliono', 'voluto', 'vorrei']],
  ['dovere', ['devo', 'devi', 'deve', 'dobbiamo', 'dovete', 'devono', 'dovuto', 'dovrò']],
  ['sapere', ['so', 'sai', 'sa', 'sappiamo', 'sapete', 'sanno', 'saputo', 'saprò']],
  ['uscire', ['esco', 'esci', 'esce', 'usciamo', 'uscite', 'escono', 'uscito']],
  ['bere', ['bevo', 'bevi', 'beve', 'beviamo', 'bevete', 'bevono', 'bevuto']],
  ['vedere', ['vedo', 'vedi', 'vede', 'vediamo', 'vedete', 'vedono', 'visto', 'vista', 'vedrò']],
  ['mettere', ['metto', 'metti', 'mette', 'mettiamo', 'mettete', 'mettono', 'messo', 'messa']],
  ['tenere', ['tengo', 'tieni', 'tiene', 'teniamo', 'tenete', 'tengono', 'tenuto']],
  ['salire', ['salgo', 'sali', 'sale', 'saliamo', 'salite', 'salgono', 'salito']],
  ['scegliere', ['scelgo', 'scegli', 'sceglie', 'scegliamo', 'scelto']],
  ['rimanere', ['rimango', 'rimani', 'rimane', 'rimaniamo', 'rimasto']],
  ['prendere', ['prendo', 'prendi', 'prende', 'prendiamo', 'prendete', 'prendono', 'preso', 'presa']],
  ['leggere', ['leggo', 'leggi', 'legge', 'leggiamo', 'leggete', 'leggono', 'letto', 'letta']],
  ['scrivere', ['scrivo', 'scrivi', 'scrive', 'scriviamo', 'scrivete', 'scrivono', 'scritto']],
  ['aprire', ['apro', 'apri', 'apre', 'apriamo', 'aprite', 'aprono', 'aperto']],
  ['chiudere', ['chiudo', 'chiudi', 'chiude', 'chiudiamo', 'chiudono', 'chiuso']],
];
for (const [infinito, forme] of coniugazioni) {
  for (const forma of forme) VERBI_IRREGOLARI[forma] = infinito;
}

/** Desinenze che indicano con buona sicurezza un verbo coniugato. */
const DESINENZE_VERBALI = [
  'eranno', 'iranno', 'eremo', 'iremo', 'erebbe', 'irebbe',
  'avano', 'evano', 'ivano', 'ando', 'endo', 'iamo', 'iate',
  'ano', 'ono', 'ate', 'ete', 'ite', 'avo', 'evo', 'ivo',
  'ato', 'ata', 'ati', 'uto', 'uta', 'uti', 'ute', 'ito', 'ita', 'iti',
  'erò', 'irò',
];

const SUFFISSI_ALTERATI = ['ino', 'ina', 'etto', 'etta', 'one', 'ona', 'uccio', 'uccia'];

/**
 * Genera le forme da provare su ARASAAC, dalla più probabile alla meno.
 *
 * Non è un lemmatizzatore completo: è una cascata di regole tarata su ciò che
 * si scrive davvero in una storia sociale. L'ordine conta, perché ogni forma
 * provata è una possibile chiamata di rete: prima le ipotesi solide (verbi
 * irregolari, desinenze inequivocabili), poi quelle ambigue.
 */
export function candidateLemmas(parola: string): string[] {
  const base = normalizza(parola).replace(/[.,;:!?"()]/g, '');
  if (!base) return [];

  const out: string[] = [base];
  const add = (v: string) => {
    if (v.length >= 3 && !out.includes(v)) out.push(v);
  };

  // 1. Verbo irregolare noto: è la risposta, non un tentativo.
  if (VERBI_IRREGOLARI[base]) add(VERBI_IRREGOLARI[base]);

  // 2. Desinenza inequivocabilmente verbale -> infiniti delle tre coniugazioni.
  const desinenza = DESINENZE_VERBALI.find(
    (d) => base.endsWith(d) && base.length - d.length >= 2,
  );
  if (desinenza) {
    const stem = base.slice(0, base.length - desinenza.length);
    add(stem + 'are');
    add(stem + 'ere');
    add(stem + 'ire');
  }

  // 3. Nomi e aggettivi: plurale -> singolare, femminile -> maschile.
  //    Va prima dei tentativi verbali ambigui: "bambini" è un nome molto più
  //    spesso di quanto "bambinare" sia un verbo.
  const singolari: string[] = [];
  if (base.endsWith('chi')) singolari.push(base.slice(0, -3) + 'co');
  else if (base.endsWith('ghi')) singolari.push(base.slice(0, -3) + 'go');
  else if (base.endsWith('che')) singolari.push(base.slice(0, -3) + 'ca');
  else if (base.endsWith('ghe')) singolari.push(base.slice(0, -3) + 'ga');
  else if (base.endsWith('i')) singolari.push(base.slice(0, -1) + 'o', base.slice(0, -1) + 'e');
  else if (base.endsWith('e')) singolari.push(base.slice(0, -1) + 'a');
  else if (base.endsWith('a')) singolari.push(base.slice(0, -1) + 'o');
  singolari.forEach(add);

  // 4. Diminutivi e accrescitivi, applicati anche al singolare ricostruito
  //    ("sorelline" -> "sorellina" -> "sorella").
  for (const forma of [base, ...singolari]) {
    for (const suf of SUFFISSI_ALTERATI) {
      if (forma.endsWith(suf) && forma.length - suf.length >= 3) {
        const radice = forma.slice(0, forma.length - suf.length);
        add(radice + (suf.endsWith('a') ? 'a' : 'o'));
      }
    }
  }

  // 5. Ultima risorsa per le desinenze ambigue (-o, -a, -e, -i): un solo
  //    tentativo sulla coniugazione più comune.
  if (!desinenza && !VERBI_IRREGOLARI[base] && /[aeio]$/.test(base) && base.length >= 4) {
    add(base.slice(0, -1) + 'are');
  }

  return out.slice(0, 5);
}

export interface Segmento {
  /** Testo mostrato sotto il simbolo, come l'ha scritto l'utente. */
  testo: string;
  /** Termine da cercare su ARASAAC (locuzione o parola portante). */
  chiave: string;
  /** Vero per articoli e preposizioni isolati: nessun simbolo proprio. */
  funzione: boolean;
}

export interface OpzioniSegmentazione {
  /** Espressioni imparate dall'utente, unite prima di quelle predefinite. */
  locuzioniPersonali?: string[];
  /** Se vero, articoli e preposizioni si attaccano alla parola successiva. */
  compattaParoleFunzione?: boolean;
}

/**
 * Divide una frase in unità di significato.
 *
 * L'ordine conta: prima le locuzioni personali (l'utente ha già deciso), poi
 * quelle predefinite, infine parola per parola.
 */
export function segmenta(testo: string, opzioni: OpzioniSegmentazione = {}): Segmento[] {
  const { locuzioniPersonali = [], compattaParoleFunzione = false } = opzioni;

  const parole = testo.split(/\s+/).filter(Boolean);
  if (parole.length === 0) return [];

  // Le personali per prime, poi le predefinite; entrambe dalla più lunga.
  const personaliOrdinate = [...locuzioniPersonali].sort(
    (a, b) => b.split(' ').length - a.split(' ').length,
  );
  const finestraMax = Math.max(
    MAX_PAROLE_LOCUZIONE,
    ...personaliOrdinate.map((l) => l.split(' ').length),
    1,
  );

  const segmenti: Segmento[] = [];
  let i = 0;

  while (i < parole.length) {
    let trovata: { testo: string; lunghezza: number } | null = null;

    // Finestra scorrevole dalla più lunga alla più corta.
    for (let n = Math.min(finestraMax, parole.length - i); n >= 2 && !trovata; n--) {
      const candidata = normalizza(parole.slice(i, i + n).join(' '));
      const match =
        personaliOrdinate.find((l) => normalizza(l) === candidata) ??
        LOCUZIONI_ORDINATE.find((l) => normalizza(l) === candidata);
      if (match) trovata = { testo: parole.slice(i, i + n).join(' '), lunghezza: n };
    }

    if (trovata) {
      segmenti.push({
        testo: trovata.testo,
        chiave: normalizza(trovata.testo),
        funzione: false,
      });
      i += trovata.lunghezza;
      continue;
    }

    const parola = parole[i];
    const pulita = normalizza(parola).replace(/[.,;:!?"()]/g, '');
    const eFunzione = PAROLE_FUNZIONE.has(pulita);

    if (eFunzione && compattaParoleFunzione) {
      // Accorpa la parola funzione (e le eventuali successive) al termine che
      // regge: "a scuola" diventa una tessera sola con il simbolo di scuola.
      const prefisso: string[] = [parola];
      let j = i + 1;
      while (j < parole.length && PAROLE_FUNZIONE.has(normalizza(parole[j]).replace(/[.,;:!?"()]/g, ''))) {
        prefisso.push(parole[j]);
        j++;
      }
      if (j < parole.length) {
        const portante = parole[j];
        segmenti.push({
          testo: [...prefisso, portante].join(' '),
          chiave: normalizza(portante).replace(/[.,;:!?"()]/g, ''),
          funzione: false,
        });
        i = j + 1;
      } else {
        // Parole funzione in fondo alla frase: nessun termine da reggere.
        segmenti.push({ testo: prefisso.join(' '), chiave: pulita, funzione: true });
        i = j;
      }
      continue;
    }

    segmenti.push({ testo: parola, chiave: pulita, funzione: eFunzione });
    i++;
  }

  return segmenti;
}

/* ------------------------------------------------------------------ */
/* RIGHE ED ELENCHI                                                    */
/* ------------------------------------------------------------------ */

export type TipoRiga = 'normale' | 'punto' | 'numero' | 'vuota';

export interface Riga {
  tipo: TipoRiga;
  /** Numero mostrato negli elenchi numerati (rinumerato in modo continuo). */
  numero?: number;
  segmenti: Segmento[];
}

/**
 * Riconosce i marcatori di elenco all'inizio di una riga.
 *
 * Si accettano le convenzioni che una persona scrive d'istinto ("- ", "* ",
 * "1. ", "1) ") senza doverle imparare: chi non le conosce usa i pulsanti
 * della barra strumenti, che inseriscono esattamente questi caratteri.
 */
function riconosciMarcatore(riga: string): { tipo: TipoRiga; resto: string } {
  const puntato = riga.match(/^\s*[-*•]\s+(.*)$/);
  if (puntato) return { tipo: 'punto', resto: puntato[1] };

  const numerato = riga.match(/^\s*\d+[.)]\s+(.*)$/);
  if (numerato) return { tipo: 'numero', resto: numerato[1] };

  return { tipo: 'normale', resto: riga };
}

/**
 * Divide un testo su più righe in unità di significato, riga per riga.
 *
 * Prima `segmenta` veniva applicata all'intero testo e gli a capo sparivano,
 * perché la divisione su `\s+` tratta il ritorno a capo come uno spazio: una
 * storia scritta su più righe usciva come un unico blocco continuo.
 */
export function segmentaTesto(testo: string, opzioni: OpzioniSegmentazione = {}): Riga[] {
  const righe = testo.split('\n');
  const risultato: Riga[] = [];
  let contatoreNumerato = 0;

  for (const riga of righe) {
    if (!riga.trim()) {
      // Una riga vuota resta uno stacco visivo e interrompe la numerazione.
      risultato.push({ tipo: 'vuota', segmenti: [] });
      contatoreNumerato = 0;
      continue;
    }

    const { tipo, resto } = riconosciMarcatore(riga);

    // La numerazione la decide l'app, non il numero scritto: così inserendo
    // una voce in mezzo non serve rinumerare tutto a mano.
    if (tipo === 'numero') contatoreNumerato++;
    else contatoreNumerato = 0;

    risultato.push({
      tipo,
      numero: tipo === 'numero' ? contatoreNumerato : undefined,
      segmenti: segmenta(resto, opzioni),
    });
  }

  return risultato;
}
