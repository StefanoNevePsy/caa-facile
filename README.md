# CAA Facile

Strumenti di Comunicazione Aumentativa Alternativa: griglie di comunicazione,
agende visive, token economy, storie sociali, tessere PECS da stampare e timer
visivi. Tutto funziona **offline** e i dati restano sul dispositivo.

## Come si usa

### Da PC e iPhone/iPad — nessuna installazione

L'app è pubblicata su GitHub Pages:

**https://stefanonevepsy.github.io/caa-facile/**

Si può usare direttamente dal browser, oppure installarla come app vera e propria:

- **iPhone / iPad (Safari):** tasto Condividi → *Aggiungi a Home*. L'icona compare
  fra le app e si apre a schermo intero, senza barre del browser.
- **Android (Chrome):** menu ⋮ → *Installa app*.
- **PC (Chrome / Edge):** icona di installazione nella barra degli indirizzi.

Dopo la prima apertura l'app resta disponibile anche senza connessione.

### Android — file APK

Ogni modifica pubblicata genera automaticamente l'APK:

1. Aprire la scheda **Actions** del repository.
2. Selezionare l'ultima esecuzione del workflow **Build APK Android**.
3. In fondo alla pagina, scaricare l'artefatto **CAA-Facile-APK**.
4. Copiare l'APK sul dispositivo e installarlo (Android chiederà di autorizzare
   l'installazione da origini sconosciute).

### Mac e Windows

Il workflow **Build App** produce il `.dmg` per Mac e l'`.exe` per Windows,
scaricabili dagli artefatti allo stesso modo.

## Rimozione dello sfondo con AI (RMBG-1.4)

Caricando una foto, l'editor può isolare il soggetto e renderlo simile a un
pittogramma. L'elaborazione avviene **interamente sul dispositivo**: nessuna
immagine viene inviata a servizi esterni.

- Modello: [BriaAI RMBG-1.4](https://huggingface.co/briaai/RMBG-1.4), quantizzato
  a 8 bit (44 MB), incluso nell'app.
- Motore: `onnxruntime-web`, con **WebGPU** quando disponibile e ricaduta
  automatica su WASM. L'inferenza gira in un Web Worker, quindi l'interfaccia
  resta reattiva.
- Il modello viene caricato una sola volta per sessione e riutilizzato.
- Sul web il primo utilizzo scarica il modello (con barra di avanzamento); da
  quel momento resta in cache anche offline.

Il controllo **Rifinitura bordi** regola la curva applicata al matte:

| Modalità | Quando usarla |
|---|---|
| morbido | capelli, pelucchi, contorni sfumati |
| normale | va bene per la maggior parte delle foto |
| netto | oggetti dai contorni definiti, elimina gli aloni |

## Sviluppo

```bash
npm install
npm run dev          # server di sviluppo
npm run build        # build di produzione in dist/
npm run typecheck    # controllo dei tipi
npm run cap:sync     # build + sincronizzazione del progetto Android
npm run electron:dev # app desktop in sviluppo
```

### Percorso base (`base`)

- Build native (Android, Electron): percorsi relativi, nessuna variabile.
- GitHub Pages: il workflow imposta `VITE_BASE=/caa-facile/`, necessario perché
  il service worker abbia lo scope corretto sul sito di progetto.

### Prima pubblicazione su GitHub Pages

In **Settings → Pages**, impostare *Source: **GitHub Actions***. Da quel momento
ogni push su `main` ripubblica il sito.

## Struttura

```
src/
  App.tsx              interfaccia e logica principale
  SyncBackupModal.tsx  backup, ripristino e trasferimento fra dispositivi (P2P)
  lib/rmbg.ts          preparazione immagine e applicazione del matte
  lib/rmbg.worker.ts   inferenza ONNX fuori dal thread principale
  lib/speech.ts        sintesi vocale (Web Speech API)
public/models/         modello RMBG-1.4
```

I dati (progetti, immagini, suoni) sono salvati in IndexedDB sul dispositivo.
Per spostarli si usa il pannello *Sincronizzazione e Backup*.
