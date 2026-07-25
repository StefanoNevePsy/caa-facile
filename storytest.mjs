import { chromium } from 'playwright';

/**
 * Prova end-to-end del writer con ARASAAC simulato: la sandbox non lascia
 * uscire il browser, e un finto server rende comunque il test deterministico.
 */
const S = '/tmp/claude-0/-home-user-caa-facile/08477034-a693-54d4-8383-8417ad2275fe/scratchpad/t';

// Vocabolario finto: termine -> id dei pittogrammi
const VOCAB = {
  oggi: [101], vado: [], andare: [102], scuola: [103], mamma: [104],
  mangio: [], mangiare: [105], merenda: [106], domani: [107],
  'a scuola': [], 'andare a scuola': [108], bambino: [109], bambini: [],
};

// PNG 1x1 trasparente
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await browser.newPage({ viewport: { width: 1100, height: 950 }, deviceScaleFactor: 2 });

let chiamate = 0;
await page.route('**/api.arasaac.org/**', async (route) => {
  const url = decodeURIComponent(route.request().url());
  const m = url.match(/search\/(.+)$/);
  if (m) {
    chiamate++;
    const ids = VOCAB[m[1].toLowerCase()] ?? [];
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(ids.map((id) => ({ _id: id }))),
    });
  }
  return route.fulfill({ status: 200, contentType: 'image/png', body: PNG });
});

const errs = [];
page.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 150)); });

const tessere = () => page.evaluate(() =>
  [...document.querySelectorAll('.story-print-container .w-\\[3\\.5cm\\]')].map((d) => ({
    testo: d.querySelector('span.text-lg')?.textContent?.trim(),
    simbolo: !!d.querySelector('img'),
  })),
);
const mostra = (t) => t.map((x) => `${x.testo}${x.simbolo ? '✓' : '·'}`).join(' | ');

await page.goto('http://127.0.0.1:5178/', { waitUntil: 'networkidle' });
await page.getByRole('button', { name: /Storia Sociale/ }).first().click();
await page.waitForTimeout(500);

// 1. Anteprima dal vivo mentre si scrive
await page.getByLabel('Testo della storia').fill('Oggi vado a scuola con la mamma');
await page.waitForTimeout(2500);
console.log('1. dal vivo      :', mostra(await tessere()));
await page.screenshot({ path: `${S}/story-1-live.png` });

// 2. "vado" non esiste su ARASAAC: deve risolversi tramite il lemma "andare"
const t1 = await tessere();
console.log('   "vado" ha simbolo (via lemma andare):', t1.find((x) => x.testo === 'vado')?.simbolo);

// 3. Unione a tocco, senza hover
const unisci = page.getByRole('button', { name: /^Unisci/ });
console.log('2. pulsanti unisci visibili:', await unisci.count());
const idx = t1.findIndex((x) => x.testo === 'a');
await unisci.nth(idx).click();
await page.waitForTimeout(2500);
console.log('3. dopo unione   :', mostra(await tessere()));
await page.screenshot({ path: `${S}/story-2-unito.png` });

// 4. La memoria vale in una storia NUOVA
await page.getByRole('button', { name: /Torna ai progetti/ }).click();
await page.waitForTimeout(400);
await page.getByRole('button', { name: /Storia Sociale/ }).first().click();
await page.waitForTimeout(400);
await page.getByLabel('Testo della storia').fill('Domani vado a scuola');
await page.waitForTimeout(2500);
console.log('4. storia NUOVA  :', mostra(await tessere()));
await page.screenshot({ path: `${S}/story-3-memoria.png` });

// 5. Interruttore articoli
await page.getByRole('button', { name: /Un simbolo per parola|Articoli uniti/ }).click();
await page.waitForTimeout(2000);
console.log('5. articoli uniti:', mostra(await tessere()));

console.log('\nchiamate ARASAAC totali:', chiamate);
console.log('errori:', errs.length ? '\n  ' + errs.slice(0, 5).join('\n  ') : 'nessuno');
await browser.close();
