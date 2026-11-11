# NETOPIA API — documentație web

Site de documentație generat din **`API Ghid de Integrare.md`**. Fișierul Markdown este singura sursă de conținut: editezi `.md`-ul (local sau direct pe GitHub), faci push pe `main`, iar Cloudflare Pages reconstruiește și publică site-ul în ~1 minut.

## Ce face

- **Exemple rulabile din browser.** Fiecare request JSON din ghid devine un playground editabil care trimite request-ul real către NETOPIA (Sandbox sau Producție). Request-urile pleacă **direct din browser** — API-ul NETOPIA permite CORS — deci nu există niciun server intermediar.
- **Credențiale locale.** Cheia API, semnătura POS și POS ID se setează din „Credențiale”, separat pentru Sandbox și Producție. Se păstrează în `sessionStorage` (sau `localStorage`, dacă bifezi „Ține minte”) și se trimit doar către NETOPIA.
- **Completare automată.** `posSignature`, un `orderID` unic și `dateTime` curent se completează singure; după o plată reușită, `ntpID`/`orderID` sunt preluate automat în Refund / Status / Expirare.
- **Cod gata de copiat** în cURL, Node.js, PHP și Python, generat din body-ul curent.
- **Răspunsuri interpretate**: statusul plății și codurile de eroare sunt explicate pe baza tabelelor din ghid; butoane pentru `paymentURL` și pentru 3-D Secure (`customerAction`).
- Căutare ⌘K, temă light/dark, checklist interactiv, carduri de test cu un click (doar în Sandbox), confirmare dublă în Producție.

## Cum editezi conținutul

Scrii Markdown normal. Câteva convenții sunt recunoscute automat:

| În Markdown | Pe site |
| --- | --- |
| `## 5. Titlu` / `### 5.1 Titlu` | navigare, numerotare, căutare |
| Bloc ` ```json ` cu un request, într-o secțiune care menționează endpoint-ul (ex. `/operation/credit`) | playground rulabil pe acel endpoint |
| Bloc JSON precedat de „Răspuns…”, „…primit” sau care conține `customerAction` / `paymentURL` | exemplu static (nu se rulează) |
| `> **IMPORTANT:** …` / `> *Notă:* …` | casetă de avertizare / informare |
| Tabel cu coloanele `Pas \| …` | timeline pe pași |
| Tabel `Cod \| Status \| Descriere` și `Cod \| Descriere` | chip-uri colorate + explicarea răspunsurilor API |
| Tabel cu coloana `Număr Card` | butoane „Card de test” în playground |
| Tabel `Versiune \| Data \| …` | changelog, cel mai nou primul |
| Listă cu `☐` | checklist bifabil |
| Blocul `> Versiune document: …` de la început | versiune, dată și autori în header |

Dacă detecția automată greșește, pune un comentariu HTML **imediat înaintea** blocului de cod:

```md
<!-- try: /operation/status -->   forțează endpoint-ul
<!-- try: off -->                 nu face blocul rulabil
```

Endpoint-urile recunoscute: `/payment/card/start`, `/operation/credit`, `/operation/expire`, `/operation/status`, `/disbursement/card/auth`. URL-urile de bază pentru Sandbox/Producție sunt în `src/store.ts`.

## Rulare locală

```bash
npm install
npm run dev       # http://localhost:5173 — se reîncarcă la fiecare salvare a .md-ului
npm run build     # generează site-ul static în dist/
```

## Publicare (Cloudflare Pages + Access)

Site-ul e publicat de **Cloudflare Pages**, conectat la acest repository: la fiecare push pe `main` Cloudflare face build și publică automat. Accesul e restricționat cu **Cloudflare Access** (login cu cod pe email).

Setări de build în Cloudflare Pages:

| Setare | Valoare |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Variabilă de mediu | `NODE_VERSION` = `24` |

Linkurile „Editează pe GitHub” și „Istoric modificări” folosesc repository-ul setat în `vite.config.ts`.

## Structură

```
API Ghid de Integrare.md   conținutul (sursa unică)
scripts/docs-plugin.ts     Markdown → HTML, navigare, exemple rulabile, index de căutare (la build)
src/main.ts                layout, navigare, credențiale, îmbunătățiri pe tabele/liste
src/playground.ts          playground-ul pentru request-uri
src/requests.ts            completarea template-urilor și generarea codului
src/styles.css             design system (light/dark)
```
