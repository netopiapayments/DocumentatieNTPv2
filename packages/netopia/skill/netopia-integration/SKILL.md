---
name: netopia-integration
description: Integrează plățile cu cardul NETOPIA Payments (API v2) în proiectul curent — inițiere plată, redirect, IPN cu verificare JWT, status, refund, expirare, plăți recurente cu token. Folosește-l când utilizatorul cere integrare NETOPIA / mobilPay, „plăți cu cardul prin NETOPIA”, sau dă o cheie API, o semnătură POS și un POS ID NETOPIA.
---

# Integrare NETOPIA Payments

Specificația API completă este în [reference.md](reference.md). Citește-o înainte să scrii cod de integrare.

## 1. Credențiale

Ai nevoie de: **cheia API**, **semnătura POS** (`XXXX-XXXX-XXXX-XXXX-XXXX`), **POS ID** și mediul (implicit **Sandbox**).

- Dacă utilizatorul nu le-a dat, cere-le. Spune-i unde le găsește: cheia API în consolă → iconița utilizatorului → Securitate → Cheie API; semnătura POS în Admin → Puncte de vânzare → Setări tehnice.
- **Nu scrie niciodată cheia API în cod sursă, în commit-uri sau în mesaje.** Ea ajunge doar în fișierul `.env` / `.env.local`, care trebuie să fie în `.gitignore`.
- Când rulezi CLI-ul, transmite secretele prin variabile de mediu, nu prin argumente.
- Cheile de Sandbox și de Producție sunt diferite; nu le amesteca.

## 2. Alege calea

Detectează stack-ul din `package.json`, `composer.json`, `requirements.txt`/`pyproject.toml` etc.

**A. Node.js cu Next.js (App Router) sau Express** → folosește CLI-ul (determinist):

```bash
NETOPIA_API_KEY='…' NETOPIA_POS_SIGNATURE='XXXX-…' NETOPIA_POS_ID='…' \
  npx netopia init --yes --app-url https://<domeniu-public>
```

Opțiuni utile: `--production`, `--framework next|express|node`, `--package <cale/tarball>` (dacă pachetul nu e publicat pe npm), `--no-install`, `--no-mount`.
CLI-ul scrie `.env(.local)`, instalează pachetul `netopia`, generează rutele `POST /api/netopia/start`, `POST /api/netopia/notify`, `GET /netopia/return` și un fișier de hook-uri (`resolveOrder`, `onPaymentUpdate`).

Apoi **tu** completezi integrarea în codul existent:
1. `resolveOrder`: calculează suma pe server din coșul/comanda reală (nu din body-ul trimis de browser).
2. `onPaymentUpdate`: actualizează comanda în baza de date a proiectului; salvează `ntpID` și, dacă există, `token`. Trebuie să fie idempotent.
3. Conectează butonul de plată din frontend: `POST /api/netopia/start` → `window.location = paymentURL`.
4. Dacă răspunsul conține `customerAction` (status 15 / 3-D Secure), redirecționează conform reference.md §9.3.

**B. Node.js cu alt framework** → instalează pachetul `netopia` și folosește SDK-ul direct (API mai jos), urmând modelul rutelor din calea A. Ruta de IPN trebuie să primească **body-ul brut**, înainte de orice parser JSON.

**C. Alt limbaj (PHP, Python, Java, .NET, Go…)** → scrie integrarea nativ, urmând reference.md: aceleași trei rute, același contract.

## 3. SDK `netopia` (Node.js 18+)

```js
import { Netopia, IPN_ACK, parseIpn, STATUS } from 'netopia';
const netopia = Netopia.fromEnv(); // NETOPIA_API_KEY, NETOPIA_POS_SIGNATURE, NETOPIA_POS_ID, NETOPIA_SANDBOX, NETOPIA_APP_URL

const { paymentURL, orderID, customerAction } = await netopia.startPayment({ amount: 100, currency: 'RON', description: '…', billing: { email, firstName, lastName, city } });
const check = netopia.verifyIpn(rawBody, headers);   // { valid, payload, reason }
if (check.valid) { const ipn = parseIpn(check.payload); /* ipn.paid, ipn.ntpID, ipn.token */ } // răspuns: IPN_ACK
await netopia.getStatus({ ntpID, orderID });
await netopia.refund({ ntpID, amount });
await netopia.expire({ ntpID, orderID });
// Recurent: prima plată cu clientID; ulterior { token, scaExemptionInd: 'MIT' | 'TRA', ipAddress }
```

## 4. Reguli obligatorii (verifică-le la final)

- [ ] `notifyUrl` e HTTPS public și răspunde `HTTP 200` + `{"errorCode":0}` **doar după** ce IPN-ul a fost procesat.
- [ ] IPN-ul e verificat: JWT RS512 + SHA-512 al body-ului brut = claim-ul `sub`. Body-ul nu e parsat înainte.
- [ ] Procesarea IPN e idempotentă; comanda e marcată plătită doar la status 3 sau 5.
- [ ] `ntpID` e salvat (pentru refund / status / expire); token-ul e salvat dacă s-a trimis `clientID`.
- [ ] Plățile cu token trimit IP-ul plătitorului.
- [ ] `orderID` e unic per tranzacție.
- [ ] Nicio dată de card și nicio cheie API în log-uri.
- [ ] Nu se stochează `paymentURL` pentru mai târziu.
- [ ] În Producție: IPN acceptat doar de la `217.156.103.68`.

## 5. Testare

Pornește aplicația, expune-o public dacă rulează local (ex. `cloudflared tunnel --url http://localhost:3000`, apoi `npx netopia init --app-url <url>` din nou), fă o plată în Sandbox cu cardul `9900 0048 1022 5098`, orice dată viitoare, CVV `111`, și confirmă că IPN-ul ajunge și comanda trece în „plătită”. Alte carduri de test sunt în reference.md §8.3.

Raportează utilizatorului: fișierele create sau modificate, ce a rămas de făcut de el (de ex. HTTPS public, trecerea pe Producție) și rezultatul testului. Nu afișa cheia API.
