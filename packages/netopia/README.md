# netopia

Client pentru **NETOPIA Payments API v2** (Node.js 18+, fără dependențe) și CLI care integrează plățile cu cardul într-un proiect în mai puțin de un minut.

> Pachetul este doar local deocamdată (`"private": true`, nepublicat pe npm). Pentru testare, instalați-l din tarball: `npm pack` în acest folder, apoi `--package /cale/netopia-0.1.0.tgz`.

## Integrare automată

Din rădăcina proiectului comerciantului:

```bash
npx netopia init
```

CLI-ul cere cheia API, semnătura POS, POS ID-ul și URL-ul public al aplicației, apoi:

| Pas | Ce face |
| --- | --- |
| Detectare | Next.js (App Router, TS/JS), Express (ESM/CommonJS) sau Node fără framework; npm / pnpm / yarn / bun |
| `.env` / `.env.local` | scrie `NETOPIA_*` (fișier cu permisiuni 600) și îl adaugă în `.gitignore`; cheia nu este afișată |
| Instalare | `npm install netopia` (sau `--package <spec>`) |
| Rute | `POST /api/netopia/start`, `POST /api/netopia/notify` (IPN verificat JWT + SHA-512), `GET /netopia/return` |
| Express | montează routerul imediat după `express()`, înainte de `express.json()` (IPN-ul are nevoie de body-ul brut) |
| Hook-uri | `resolveOrder` (suma calculată pe server) și `onPaymentUpdate` (salvare `ntpID` / token) — nu se suprascriu niciodată |

Fără întrebări (CI, agenți AI): secretele prin variabile de mediu, nu prin argumente.

```bash
NETOPIA_API_KEY=… NETOPIA_POS_SIGNATURE=XXXX-XXXX-XXXX-XXXX-XXXX NETOPIA_POS_ID=… \
  npx netopia init --yes --app-url https://magazin.ro [--production]
```

`npx netopia --help` listează toate opțiunile.

## Skill pentru agenți AI

```bash
npx netopia skill
```

Skill-ul îi spune agentului AI cum să ceară credențialele, când să folosească CLI-ul, cum să integreze în proiecte nestandard sau în alte limbaje (PHP, Python…) și ce reguli să verifice la final. `reference.md` este generat din ghid: după orice modificare a „API Ghid de Integrare.md” rulați `npm run sync:reference`.

## SDK

```js
import { Netopia, IPN_ACK, parseIpn } from 'netopia';

const netopia = Netopia.fromEnv();
// sau: new Netopia({ apiKey, posSignature, posID, sandbox: true, notifyUrl, redirectUrl })

const { paymentURL, orderID } = await netopia.startPayment({
  amount: 100, currency: 'RON', description: 'Comanda 123',
  billing: { email: 'client@example.com', firstName: 'Ion', lastName: 'Popescu', city: 'Bucuresti' },
});
// → redirect browser la paymentURL

// notifyUrl — body-ul BRUT:
const check = netopia.verifyIpn(rawBody, req.headers);
if (check.valid) {
  const ipn = parseIpn(check.payload); // { orderID, ntpID, status, statusName, paid, token, … }
  // actualizați comanda, apoi răspundeți HTTP 200 + IPN_ACK ({ errorCode: 0 })
}

await netopia.getStatus({ ntpID, orderID });
await netopia.refund({ ntpID, amount: 50 });     // refund parțial
await netopia.expire({ ntpID, orderID });

// Recurent: prima plată cu { clientID }, ulterior { token, scaExemptionInd: 'MIT', ipAddress }
```

| Variabilă | Rol |
| --- | --- |
| `NETOPIA_API_KEY` | cheia API (diferită pentru Sandbox și Producție) |
| `NETOPIA_POS_SIGNATURE` | semnătura POS |
| `NETOPIA_POS_ID` | POS ID (status / expirare) |
| `NETOPIA_SANDBOX` | `true` (implicit) / `false` |
| `NETOPIA_APP_URL` | URL public; din el se deduc `notifyUrl` și `redirectUrl` |
| `NETOPIA_NOTIFY_URL`, `NETOPIA_REDIRECT_URL`, `NETOPIA_CANCEL_URL` | suprascriu valorile deduse |
| `NETOPIA_API_BASE_URL` | alt URL de API (teste cu server simulat) |

## Teste

```bash
npm test
```
