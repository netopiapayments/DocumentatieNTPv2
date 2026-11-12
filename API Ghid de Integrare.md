# API Ghid de Integrare

# NETOPIA Financial Services S.A. — API Ghid de Integrare

> Versiune document: 2.10
> 
> Ultima actualizare: 12 Noiembrie 2026
> 
> Autori: @Cezar Marcaru , @Andreea Bulai
> 
> Contact: implementare@netopia-payments.com

---

## Cuprins

1. [Public Țintă și Scop](https://netopia.atlassian.net/wiki/spaces/NE/pages/636125186/API+Ghid+de+Integrare#public-țintă-și-scop)
2. [Checklist Rapid de Implementare](https://netopia.atlassian.net/wiki/spaces/NE/pages/636125186/API+Ghid+de+Integrare#1-checklist-rapid-de-implementare)
3. [Medii de Lucru și Endpoints API](https://netopia.atlassian.net/wiki/spaces/NE/pages/636125186/API+Ghid+de+Integrare#2-medii-de-lucru-și-endpoints-api)
4. [Autentificare și Securitate](https://netopia.atlassian.net/wiki/spaces/NE/pages/636125186/API+Ghid+de+Integrare#3-autentificare-și-securitate)
5. [Fluxul Tipic al unei Plăți](https://netopia.atlassian.net/wiki/spaces/NE/pages/636125186/API+Ghid+de+Integrare#4-fluxul-tipic-al-unei-plăți)
6. [Apeluri API de Bază](https://netopia.atlassian.net/wiki/spaces/NE/pages/636125186/API+Ghid+de+Integrare#5-apeluri-api-de-bază)
7. [Operațiuni Avansate](https://netopia.atlassian.net/wiki/spaces/NE/pages/636125186/API+Ghid+de+Integrare#6-operațiuni-avansate)
8. [Funcționalități Speciale](https://netopia.atlassian.net/wiki/spaces/NE/pages/636125186/API+Ghid+de+Integrare#7-funcționalități-speciale)
9. [Referințe](https://netopia.atlassian.net/wiki/spaces/NE/pages/636125186/API+Ghid+de+Integrare#8-referințe)
10. [Integrare Directă Card](https://netopia.atlassian.net/wiki/spaces/NE/pages/636125186/API+Ghid+de+Integrare#9-integrare-directă-card)
11. [Integrare Automată (SDK, CLI și Agent AI)](https://netopia.atlassian.net/wiki/spaces/NE/pages/636125186/API+Ghid+de+Integrare#10-integrare-automată-sdk-cli-și-agent-ai)
12. [Glosar de Termeni](https://netopia.atlassian.net/wiki/spaces/NE/pages/636125186/API+Ghid+de+Integrare#glosar-de-termeni--netopia-api-v2)
13. [Versionare Document](https://netopia.atlassian.net/wiki/spaces/NE/pages/636125186/API+Ghid+de+Integrare#11-versionare-document)

---

## Public Țintă și Scop

|  |  |
| --- | --- |
| **Audiență** | Dezvoltatori Backend / Full-stack care integrează procesarea de carduri NETOPIA. |
| **Scop** | Inițierea plăților, gestionarea redirectărilor și IPN (server-to-server), plăți recurente, interogare status, expirare, creditare/refund și plăți divizate (split payments), Money Send. |

---

## 1. Checklist Rapid de Implementare

### Checklist — Verificare Rapidă

Folosiți acest checklist înainte de a scrie cod:

- ☐ Acces la Consola Merchant (Sandbox + Producție)
- ☐ Cheie API creată din Profil → Securitate
- ☐ Semnătură POS identificată
- ☐ IP-uri NETOPIA adăugate în whitelist (Producție: 217.156.103.68 / Sandbox: 217.156.103.69)
- ☐ URL de notificare (notifyUrl) configurat — HTTPS, răspunde cu { "errorCode": 0 }
- ☐ Plan de verificare JWT pentru IPN stabilit
- ☐ Gestionare redirect pe paymentURL planificată
- ☐ Stocare ntpID și payment token la primul IPN implementată
- ☐ Conformitate PCI verificată (TLS 1.2+, fără logare date sensibile)

Fiecare punct este detaliat mai jos cu explicații și trimiteri la secțiunile relevante.

Folosiți această listă de verificare înainte de a scrie cod. Fiecare punct conține un rezumat și o trimitere la secțiunea relevantă pentru detalii complete.

- Acces la Consola NETOPIA (Sandbox și Producție) — Creați cont pe [admin.netopia-payments.com](https://admin.netopia-payments.com). → Detalii: Secțiunea 2 — Medii de Lucru și Endpoints API
- Cheie API creată din Profil → Securitate — Generați chei separate pentru fiecare mediu; se trimite în header-ul Authorization. → Detalii: Secțiunea 3.1 — Cheia API
- Puncte de vânzare configurate din consola NETOPIA — În Sandbox nu se pot adăuga POS-uri; acestea se creează și se configurează în mediul Live/Producție.
- Semnătură POS identificată — Admin → Puncte de vânzare → Setări tehnice; se trimite în order.posSignature. → Detalii: Secțiunea 3.2 — Semnătura POS
- IP-uri NETOPIA în whitelist — acceptați IPN doar de la:

  → Detalii: Secțiunea 3.3 — Whitelisting IP pentru IPN
- URL de notificare (notifyUrl) — cerințe obligatorii: HTTPS public, răspunde cu { "errorCode": 0 } și HTTP 200 OK; NETOPIA retrimite dacă nu răspunde corect. → Detalii: Secțiunea 5.2 — Gestionarea Notificării IPN
- Plan de verificare JWT pentru IPN — pas cu pas: salvați body-ul raw, extrageți JWT din Authorization, decodificați sub, calculați SHA-512 pe body, comparați cu sub, verificați semnătura RS512 cu cheia publică. → Detalii: Secțiunea 3.4 — Securitatea IPN: Verificarea JWT
- Gestionare redirect pe paymentURL — redirecționați browser-ul la payment.paymentURL; gestionați redirectUrl/cancelUrl; nu stocați paymentURL pentru mai târziu. → Detalii: Secțiunea 4 și Secțiunea 5.1
- Stocare ntpID și token la primul IPN — la status 3 salvați payment.ntpID (necesar pentru refund/status/expire) și, dacă ați trimis clientID, salvați payment.instrument.token pentru plăți recurente. → Detalii: Secțiunea 5.2, Secțiunea 6 și Secțiunea 7.1
- Conformitate PCI — nu logați date sensibile; folosiți TLS 1.2+; pentru integrare directă card este necesară certificare PCI-DSS. → Detalii: Secțiunea 9 — Integrare Directă Card

---

## 2. Medii de Lucru și Endpoints API

### Console Merchant

| **Mediu** | **URL Consolă** |
| --- | --- |
| Producție | <https://admin.netopia-payments.com/> |
| Sandbox | <https://sandbox.netopia-payments.com/> |

### Endpoints API

| **Operațiune** | **Sandbox** | **Producție** |
| --- | --- | --- |
| Inițiere Plată | <https://secure.sandbox.netopia-payments.com/payment/card/start> | <https://secure.mobilpay.ro/pay/payment/card/start> |
| Credit / Refund | <https://secure.sandbox.netopia-payments.com/operation/credit> | <https://secure.mobilpay.ro/pay/operation/credit> |
| Expirare Link | <https://secure.sandbox.netopia-payments.com/operation/expire> | <https://secure.mobilpay.ro/pay/operation/expire> |
| Interogare Status | <https://secure.sandbox.netopia-payments.com/operation/status> | <https://secure.mobilpay.ro/pay/operation/status> |

---

## 3. Autentificare și Securitate

### 3.1 Cheia API (API Key)

Cheia trebuie trimisă în header-ul HTTP Authorization la fiecare request:

Generarea și adăugarea unei chei API se face din platforma NETOPIA, urmând pașii de mai jos:

1. Autentificați-vă în platforma de producție la [https://admin.netopia-payments.com](https://admin.netopia-payments.com/) sau, pentru testare, în platforma Sandbox la [https://sandbox.netopia-payments.com](https://sandbox.netopia-payments.com/).
2. Apăsați pictograma utilizatorului din dreapta sus și accesați secțiunea **Securitate**.
3. Selectați **Cheie API**, introduceți denumirea cheii și apăsați **Generează Cheie**.
4. După generare, copiați cheia apăsând pictograma verde din stânga cheii.

**Important:** Cheia API este generată și gestionată de comerciant. NETOPIA nu are acces la cheia API generată; păstrați-o în siguranță și nu o divulgați.

Aceiași pași se urmează și în mediul de test Sandbox. Utilizați chei API distincte pentru Producție și Sandbox.

```plain
Authorization: YOUR_API_KEY
```

> **IMPORTANT: Cheile sunt specifice mediului (Sandbox/Producție). Nu folosiți cheia de Sandbox în Producție și viceversa.**

### 3.2 Semnătura POS (POS Signature)

Se găsește în Admin → Puncte de vânzare → Setări tehnice și se trimite în câmpul order.posSignature. Aceeași valoare se trimite în câmpul posID la operațiunile de Expirare Link și Interogare Status (Secțiunea 6).

### 3.3 Whitelisting IP pentru IPN

| **Mediu** | **Adresă IP** |
| --- | --- |
| Producție | `217.156.103.68` |
| Sandbox | `217.156.103.69` |

### 3.4 Securitatea IPN: Verificarea JWT

Fiecare notificare IPN trimisă de NETOPIA conține un header Authorization: Token. Validarea acestui token este opțională pentru a garanta autenticitatea notificării.

**Pași de validare:**

1. Capturați body-ul raw al request-ului IPN. (Atenție: majoritatea framework-urilor web parsează automat JSON-ul — salvați corpul original brut.)
2. Extrageți token-ul JWT din header-ul Authorization.
3. Decodificați token-ul pentru a obține claim-ul sub.
4. Calculați hash-ul SHA-512 al body-ului raw.
5. Comparați hash-ul calculat cu cel din sub.
6. Verificați semnătura RS512 cu cheia publică RSA furnizată de NETOPIA.
7. Dacă toate verificările trec, procesați IPN-ul și răspundeți cu: { "errorCode": 0 }

> *Notă: Cheia publică RSA pentru validarea semnăturii RS512 a token-ului JWT este aceeași atât în mediul Live/Producție, cât și în Sandbox.*

**Cheie publică RSA pentru verificarea semnăturii JWT (RS512):**

```plain
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAy6pUDAFLVul4y499gz1P
gGSvTSc82U3/ih3e5FDUs/F0Jvfzc4cew8TrBDrw7Y+AYZS37D2i+Xi5nYpzQpu7
ryS4W+qvgAA1SEjiU1Sk2a4+A1HeH+vfZo0gDrIYTh2NSAQnDSDxk5T475ukSSwX
L9tYwO6CpdAv3BtpMT5YhyS3ipgPEnGIQKXjh8GMgLSmRFbgoCTRWlCvu7XOg94N
fS8l4it2qrEldU8VEdfPDfFLlxl3lUoLEmCncCjmF1wRVtk4cNu+WtWQ4mBgxpt0
tX2aJkqp4PV3o5kI4bqHq/MS7HVJ7yxtj/p8kawlVYipGsQj3ypgltQ3bnYV/LRq
8QIDAQAB
-----END PUBLIC KEY-----
```


---

## 4. Fluxul Tipic al unei Plăți

| **Pas** | **Acțiune** | **Detalii** |
| --- | --- | --- |
| 1 | Server POST /payment/card/start | Server-ul face un request POST cu detaliile comenzii pentru a crea o sesiune de plată. |
| 2 | Primire paymentURL → redirect browser | Server-ul primește un răspuns ce conține un paymentURL. Redirectați browser-ul clientului la această adresă. |
| 3 | Clientul plătește (3-D Secure dacă e necesar) | Clientul introduce datele cardului pe pagina securizată NETOPIA și efectuează autentificarea 3-D Secure. |
| 4 | NETOPIA trimite IPN la notifyUrl | NETOPIA trimite o notificare server-to-server la notifyUrl-ul specificat. Server-ul validează JWT-ul și răspunde cu { "errorCode": 0 }. |
| 5 | Clientul este redirectat la redirectUrl | După finalizarea plății, browser-ul clientului este redirectat la redirectUrl-ul specificat de dvs. |
| 6 | Opțional: interogați status, expirați, creditați | Puteți interoga statusul, anula sau returna plata folosind endpoint-urile de operațiuni. |

---

## 5. Apeluri API de Bază

### 5.1 Inițierea unei Plăți (/payment/card/start)

**Metodă: POST**

**Scop: Creează o sesiune de plată și obține un paymentURL pentru redirectare.**

**Request Body (JSON):**

```json
{
  "config": {
    "notifyUrl": "https://www.your-domain.com/notify",
    "redirectUrl": "https://www.your-domain.com/redirect",
    "cancelUrl": "https://www.your-domain.com/cancel",
    "language": "ro"
  },
  "order": {
    "posSignature": "XXXX-XXXX-XXXX-XXXX-XXXX",
    "orderID": "YourOrderId-12345",
    "dateTime": "2025-01-01T10:00:00+02:00",
    "description": "Descriere comanda",
    "amount": 100,
    "currency": "RON",
    "billing": {
      "email": "client@example.com",
      "phone": "+40700000000",
      "firstName": "Ion",
      "lastName": "Popescu",
      "city": "Bucuresti",
      "country": 642,
      "countryName": "Romania",
      "state": "Bucuresti",
      "postalCode": "010000",
      "details": ""
    },
    "shipping": { /* same structure as billing */ }
  },
  "payment": {
    "options": { "installments": 0 },
    "instrument": { "type": "card" }
  }
}
```

**Răspuns de succes — folosiți valoarea payment.paymentURL pentru redirectare:**

```json
{
  "payment": {
    "paymentURL": "https://secure.netopia-payments.com/ui/card?p=...",
    "status": 1
  }
}
```

### 5.2 Gestionarea Notificării IPN

NETOPIA va trimite un request POST la config.notifyUrl de fiecare dată când statusul unei tranzacții se schimbă.

> **IMPORTANT: Serverul dvs. TREBUIE să răspundă cu { "errorCode": 0 } și HTTP status 200 OK pentru ca NETOPIA să considere notificarea livrată cu succes. Dacă nu răspundeți corect, NETOPIA va retrimite notificarea.**

**Exemplu body IPN primit:**

```json
{
  "order": {
    "orderID": "YourOrderId-12345"
  },
  "payment": {
    "ntpID": "2502464",
    "amount": 100,
    "currency": "RON",
    "code": "00",
    "message": "Approved",
    "status": 3,
    "data": {
      "AuthCode": "qO51",
      "RRN": "DLsdOxRfRvfK"
    }
  }
}
```

---

## 6. Operațiuni Avansate

### 6.1 Creditare / Refund

**Endpoint: POST /operation/credit**

```json
{ "ntpID": "1309088", "amount": 100 }
```

> *Notă: Puteți face refund parțial specificând o sumă mai mică decât suma originală.*

### 6.2 Expirare Link

**Endpoint: POST /operation/expire**

```json
{ "posID": "XXXX-XXXX-XXXX-XXXX-XXXX", "ntpID": "1309088", "orderID": "1234" }
```

> *Notă: `posID` este semnătura POS — aceeași valoare trimisă în `order.posSignature` la inițierea plății.*

### 6.3 Interogare Status

**Endpoint: POST /operation/status**

```json
{ "posID": "XXXX-XXXX-XXXX-XXXX-XXXX", "ntpID": "1309088", "orderID": "1234" }
```

> *Notă: `posID` este semnătura POS — aceeași valoare trimisă în `order.posSignature` la inițierea plății.*

> *Notă: Acest apel este util pentru a verifica starea finală a unei tranzacții în cazul în care IPN-ul nu a putut fi procesat din motive excepționale.*

---

## 7. Funcționalități Speciale

### 7.1 Plăți Recurente (Tokenizare)

Pentru generarea unui token de plată, trebuie să trimiteți parametrul clientID (string unic pentru fiecare client/card) în obiectul order doar la prima tranzacție (plata de inițiere). Trimiterea acestui parametru la prima plată permite obținerea tokenului în mod automat, fără a fi necesară activarea unei setări globale pe întregul cont de comerciant. La plățile ulterioare, tranzacțiile se vor efectua folosind direct tokenul stocat, fără a mai fi necesară trimiterea parametrului clientID.

> *Notă: În cazul în care, după trimiterea parametrului clientID, nu primiți token-ul în notificarea IPN, vă rugăm să solicitați activarea funcționalității către implementare@netopia-payments.com, specificând username-ul și semnătura/identificatorul contului dvs.*

| **Pas** | **Acțiune** |
| --- | --- |
| 1 — Prima Plată | Trimiteți clientID în obiectul order la prima plată. |
| 2 — Primire Token | În notificarea IPN pentru prima plată reușită, veți primi un token în câmpul payment.instrument.token. |
| 3 — Stocare Token | Stocați acest token în baza de date, asociat cu clientul dvs. |
| 4 — Plăți Ulterioare | Pentru plățile viitoare, includeți token-ul în payment.instrument.token, fără a mai include clientID. |

Gestionarea indicatorilor SCA (Strong Customer Authentication):  
În funcție de tipul de plată ulterioară, puteți specifica modul de procesare folosind câmpul `scaExemptionInd`:

- **Plată Recurentă (MIT - Merchant Initiated Transaction)**: Folosiți `"scaExemptionInd": "MIT"`. Tranzacția este inițiată de comerciant în baza unui acord prealabil, fără prezența clientului în flux.
- **Plată One-Click (TRA - Transaction Risk Analysis)**: Folosiți `"scaExemptionInd": "TRA"`. Aceasta permite efectuarea plății fără reintroducerea datelor cardului, însă tranzacția va fi trimisă către protocolul 3D Secure pentru autentificare (clientul participă la procesul de autorizare).

**Notă privind Plățile One-Click (TRA):**

În cazul în care banca emitentă solicită autentificarea (step-up la 3-D Secure), tranzacția va primi **status 15**. În acest scenariu, **trebuie să redirecționați clientul către procesul de autentificare 3D**, urmând pașii detaliați la 

[**Secțiunea 9.3 — Necesită Autentificare 3D Secure**](https://netopia.atlassian.net/wiki/spaces/NE/pages/636125186/API+Ghid+de+Integrare#9.3-necesită-autentificare-3d-secure) (verificare `customerAction.type`, redirecționare către `url` și transmiterea parametrilor din `formData`) .

**Exemplu request obținere token (prima plată):**

```json
{
  "payment": {
    "instrument": {
      "type": "card"
    }
  },
  "order": {
    "posSignature": "XXXX-XXXX-XXXX-XXXX-XXXX",
    "amount": 50,
    "currency": "RON",
    "clientID": "exempludeclientID"
  }
}
```

**Exemplu request plată recurentă (plata ulterioară):**

```json
{
  "payment": {
    "instrument": {
      "type": "card",
      "token": "bxxxxxxx-1234-xxxx-2347-xxxx568dxxxx"
    }
  },
  "order": {
    "posSignature": "XXXX-XXXX-XXXX-XXXX-XXXX",
    "amount": 50,
    "currency": "RON",
    "scaExemptionInd": "MIT" // Schimbați în "TRA" pentru plățile One-Click trimise la 3D
    
  }
}
```

** Notă: Adresa IP a plătitorului este obligatorie pentru plățile cu token**

Este obligatoriu să trimiteți adresa IP a plătitorului în request-ul de plată cu token.

- **Prima plată: **Capturați și stocați IP-ul clientului.
- **Plata cu token: **Includeți IP-ul stocat în payment data.

Aceasta este o cerință de securitate impusă direct de **banca procesatoare**; fără acest parametru, tranzacția va fi respinsă.

### 7.2 Plăți Divizate (Split Payments)

Permite divizarea sumei unei tranzacții între compania-mamă și alte companii partenere. Necesită activare și configurare prealabilă de către NETOPIA.

**Exemplu request cu split:**

```json
{
  "config": {},
  "payment": {
    "options": {
      "split": [
        { "amount": 10, "posID": 123456 }
      ]
    },
    "instrument": { "type": "card" }
  },
  "order": { "amount": 50 }
}
```

### 7.3 Plăți în Rate (Instalments)

Funcționalitate opțională, activată la cerere. Pagina de plată este comună pentru plata integrală și în rate.

- Dacă sunt trimise în order.installments.available ratele aprobate (ex: \[3, 6, 12\]), platforma le afișează doar pentru cardurile eligibile.
- Plata se decontează integral comerciantului.
- Dacă câmpul installments lipsește, plata este integrală.

**Structură JSON installments:**

```json
"installments": {
  "selected": 6,
  "available": [3, 6, 12]
}
```

### 7.4 Money Send

Serviciul Money Send facilitează transferurile de fonduri către clienții care dețin carduri emise de instituțiile financiare partenere.

> **IMPORTANT: Money Send nu este disponibil în mediul Sandbox.** Serviciul poate fi utilizat și testat exclusiv în mediul Live/Producție, cu un punct de vânzare pentru care funcționalitatea a fost activată.

#### Fluxul de Lucru

1. Confirmarea Cardului (Obligatorie): Înainte de utilizarea serviciului, clientul trebuie să confirme cardul beneficiar prin efectuarea unei tranzacții de valoare mică (0 RON). Această tranzacție trebuie autentificată prin standardul 3D Secure.
2. Trimiterea Fondurilor: După confirmare, transferul se poate efectua folosind fie datele cardului (doar dacă dețineți certificare PCI-DSS), fie token-ul obținut la prima plată.

#### Endpoint-uri (POST)

- `Producție: https://secure.mobilpay.ro/pay/disbursement/card/auth`
- Sandbox: indisponibil — Money Send nu poate fi testat în Sandbox.

#### Exemplu Request

```json
{
  "config": {
    "language": "ro",
    "notifyUrl": "https://www.my.domain/my_notify_url"
  },
  "recipient": {
    "type": "token",
    "token": "bxxxxxx8-xxxx-xxxx-xxxx-0xxxxxxxxxa"
  },
  "order": {
    "posSignature": "XXXX-XXXX-XXXX-XXXX-XXXX",
    "dateTime": "2026-03-16T10:48:17+02:00",
    "id": "YourOrderId-12345",
    "description": "Sendmoney",
    "amount": 0.1,
    "currency": "RON",
    "billing": {
      "firstName": "Testare",
      "lastName": "Test",
      "country": 642,
      "city": "Bucuresti",
      "details": "xxx",
      "postalCode": "032716",
      "email": "aaa@aaa.com",
      "phone": "0722222222"
    },
    "data": {}
  }
}
```

### 7.5 Integrare Apple Pay & Google Pay

Integrarea se face prin tokenizarea plăților direct de la Apple / Google. Token-ul se transmite în câmpul payment.instrument.token.

#### Principiu general

1. Verificare disponibilitate metodă pe dispozitiv
2. Obținere token criptat de la Apple / Google
3. Trimitere token → backend comerciant
4. Backend apelează NETOPIA Payments cu tokenul

#### Implementare Google Pay

Verificare disponibilitate:

```js
const allowedCards = ['VISA', 'MASTERCARD'];
const allowedMethods = ['PAN_ONLY', 'CRYPTOGRAM_3DS'];
GooglePay.isReadyToPay(gPayOpt.allowedCards, gPayOpt.allowedMethods);
```

Solicitare token Google Pay:

```js
GooglePay.requestPayment(requestData)
  .then(token => resolve(token))
  .catch(error => reject(error));
```

#### Implementare Apple Pay

Verificare disponibilitate:

```js
if (window.ApplePaySession && ApplePaySession.canMakePayments()) {
  // Apple Pay disponibil
}
```

Creare sesiune Apple Pay:

```js
const session = new ApplePaySession(3, applePayRequest);
session.onpaymentauthorized = (event) => {
  const token = event.payment.token.paymentData;
  // Trimite token la backend
};
session.begin();
```

#### Apel NETOPIA Backend (comun pentru Apple Pay / Google Pay)

```json
{
  "config": {
    "language": "",
    "notifyUrl": "https://www.your-domain.com/notify",
    "redirectUrl": "https://www.your-domain.com/redirect"
  },
  "order": {
    "amount": 50,
    "billing": { "city": "", "country": 642, "countryName": "Romania" }
  },
  "payment": {
    "instrument": {
      "type": "card",
      "token": "<token-criptat-de-la-apple-sau-google>"
    }
  }
}
```

> *Notă: Atât pentru Apple Pay cât și pentru Google Pay, flow-ul backend este identic cu cel al unui card standard, cu diferența că payment.instrument.token este furnizat de portofelul digital, nu stocat de voi.*

---

## 8. Referințe

### 8.1 Coduri de Status ale Plății

| **Cod** | **Status** | **Descriere** |
| --- | --- | --- |
| 1 | `new` | Nou — tranzacție creată, neprocesată |
| 3 | `paid` | Autorizat — suma a fost autorizată pe card |
| 5 | `confirmed` | Capturat — suma a fost capturată / decontată |
| 8 | `refunded` | Returnat — refund processat cu succes |
| 4 | `canceled` | Anulat — tranzacție anulată |
| 23 | `expired` | Expirat — link de plată expirat |
| 11 | `error` | Eroare — eroare la procesare |
| 13 | `fraud` | Fraudă suspectată |

### 8.2 Coduri de Eroare la Inițierea Plății

| **Cod** | **Descriere** |
| --- | --- |
| 101 | Succes — redirect user to payment URL |
| 100 | Necesită autentificare 3-D Secure |
| 20 | Fonduri insuficiente |
| 19 | Card expirat |
| 17 | Număr card invalid |
| 21 | CVV invalid |
| 36 | Refuzat de antifraudă |
| 39 | Autentificare 3-D Secure eșuată |
| 99 | Eroare generală |

### 8.3 Carduri de Test pentru Sandbox

Folosiți orice dată de expirare viitoare, CVV: 111

| **Număr Card** | **Rezultat Așteptat** |
| --- | --- |
| `9900 0048 1022 5098` | Acceptat |
| `9900 0091 8421 4768` | 3-D Secure — Acceptat |
| `9900 5416 3143 7790` | Card expirat |
| `9900 5185 7283 1942` | Fonduri insuficiente |
| `9900 8279 7999 1500` | CVV incorect |
| `9900 0029 2274 2471` | 3-D Secure — Respins |
| `9900 1305 9749 7640` | Eroare emitent bancar |

---

## 9. Integrare Directă Card

Această soluție permite partenerilor să păstreze controlul total asupra experienței de utilizare, permițând clienților să introducă datele cardului direct pe site-ul comerciantului, fără redirecționare către o pagină externă de plată.

> **Important: Utilizarea acestei metode este condiționată de deținerea unei certificări PCI-DSS valide de către comerciant, deoarece datele sensibile ale cardului tranzitează serverele proprii.**

### 9.1 Fluxul de Plată

1. Colectarea datelor: Clientul introduce datele cardului (număr, expirare, CVV) în formularul de pe site-ul tău.
2. În cazul integrării directe (unde clientul rămâne pe site-ul tău), ești responsabil pentru colectarea informațiilor despre dispozitivul și browser-ul utilizat de client. Aceste date trebuie transmise în obiectul payment.data.
3. Cererea API: Serverul tău trimite aceste date către NETOPIA Payments printr-un request securizat de tip POST.
4. Procesarea: NETOPIA procesează tranzacția prin sistemele bancare.
5. Răspunsul: Primești un răspuns JSON cu starea tranzacției (aprobată, refuzată sau necesită 3D Secure).
6. 3D Secure (dacă e necesar): Dacă banca emitentă solicită autentificare, vei primi un URL de redirecționare către care trebuie să trimiți clientul.

**Request plată (integrare directă):**

```json
{
  "config": {
    "notifyUrl": "https://www.your-domain.com/notify",
    "redirectUrl": "https://www.your-domain.com/redirect",
    "cancelUrl": "https://www.your-domain.com/cancel",
    "language": "ro"
  },
  "order": {
    "posSignature": "XXXX-XXXX-XXXX-XXXX-XXXX",
    "orderID": "YourOrderId-12345",
    "dateTime": "2025-01-01T10:00:00+02:00",
    "description": "Descriere comanda",
    "amount": 100,
    "currency": "RON",
    "billing": {
      "email": "client@example.com",
      "phone": "+40700000000",
      "firstName": "Ion",
      "lastName": "Popescu",
      "city": "Bucuresti",
      "country": 642,
      "countryName": "Romania",
      "state": "Bucuresti",
      "postalCode": "010000",
      "details": ""
    }
  },
  "payment": {
    "options": { "installments": 0 },
    "instrument": {
      "type": "card",
      "account": "<card_number>",
      "expMonth": 12,
      "expYear": 2027,
      "secretCode": "<cvv>"
    },
    "data": {
      "BROWSER_USER_AGENT": "Mozilla/5.0 ...",
      "OS": "Linux",
      "OS_VERSION": "x86_64",
      "MOBILE": "false",
      "BROWSER_COLOR_DEPTH": "24",
      "BROWSER_SCREEN_HEIGHT": "1080",
      "BROWSER_SCREEN_WIDTH": "1920",
      "BROWSER_JAVA_ENABLED": "false",
      "BROWSER_LANGUAGE": "en-US",
      "BROWSER_TZ": "Europe/Bucharest",
      "BROWSER_TZ_OFFSET": "-120",
      "IP_ADDRESS": "37.221.166.134"
    }
  }
}
```

### 9.2 Plată Aprobată Direct (Fără 3DS)

Acest răspuns apare atunci când tranzacția este finalizată cu succes fără a fi nevoie de pași suplimentari din partea clientului.

```json
{
  "customerAction": {},
  "error": {
    "code": "00",
    "message": "Approved"
  },
  "payment": {
    "amount": 200,
    "currency": "RON",
    "data": {
      "AuthCode": "24od",
      "BIN": "990000",
      "ISSUER": "Netopia GB",
      "ISSUER_COUNTRY": "642",
      "RRN": "hYnY8zpdcNo-"
    },
    "ntpID": "1309088",
    "status": 3,
    "token": "MjMyMjqqdx3XTbYC78Oo..."
  }
}
```

### 9.3 Necesită Autentificare 3D Secure

Dacă banca emitentă a cardului solicită o verificare suplimentară, obiectul customerAction va conține datele necesare pentru redirecționare.

**Acțiuni obligatorii:**

1. Verificați dacă customerAction.type este "Authentication3D".
2. Redirecționați clientul către URL-ul specificat în customerAction.url.
3. Includeți parametrii din formData (ex: paReq, backUrl) dacă este un request de tip POST, sau folosiți authenticationToken.

```json
{
  "customerAction": {
    "authenticationToken": "iNPqJWDRoRX...",
    "formData": {
      "backUrl": "http://yourdomain.com/example/backUrl.php",
      "paReq": "AT5ewtLVDsEgB5lcRjeEoSMF6RZ4A3s..."
    },
    "type": "Authentication3D",
    "url": "https://secure.sandbox.netopia-payments.com/sandbox/authorize"
  },
  "error": {
    "code": "100",
    "message": "Approved"
  },
  "payment": {
    "amount": 200,
    "currency": "RON",
    "ntpID": "1310396",
    "status": 15
  }
}
```

---

## 10. Integrare Automată (SDK, CLI și Agent AI)

Pe lângă integrarea manuală descrisă în secțiunile 4–7, proiectele **Node.js** pot fi integrate automat cu pachetul `netopia`. Pachetul conține un client API, o comandă care generează integrarea în proiect și un skill pentru agenți AI. Rezultatul respectă același flux: inițiere plată, redirect, IPN verificat, status, refund și expirare.

> **IMPORTANT:** Pachetul `netopia` este în pregătire și nu este încă publicat în registrul npm. Până la publicare, comenzile `npx netopia …` de mai jos nu sunt disponibile public.

### 10.1 Ce conține pachetul

| **Componentă** | **Rol** |
| --- | --- |
| SDK (`import { Netopia } from 'netopia'`) | Client fără dependențe pentru /payment/card/start, /operation/status, /operation/credit, /operation/expire și verificarea IPN (JWT RS512 + SHA-512). |
| CLI (`npx netopia init`) | Detectează proiectul, scrie credențialele, instalează pachetul și generează rutele de plată. |
| Skill pentru agenți AI (`npx netopia skill`) | Instrucțiuni pentru agenți AI (ex. Claude Code) care completează integrarea în codul existent sau o scriu în alt limbaj, pe baza acestui ghid. |

### 10.2 Ce aveți nevoie

- Cheia API a mediului ales (Secțiunea 3.1) — Sandbox sau Producție.
- Semnătura POS (Secțiunea 3.2), în formatul `XXXX-XXXX-XXXX-XXXX-XXXX`.
- POS ID — necesar pentru interogarea statusului și expirarea linkului.
- Un URL public HTTPS al aplicației, la care NETOPIA poate trimite IPN-ul.
- Node.js 18.17 sau mai nou și un proiect **Next.js (App Router)**, **Express** sau Node.js fără framework.

### 10.3 Integrare cu CLI

Rulați comanda din rădăcina proiectului și răspundeți la întrebări:

```bash
npx netopia init
```

| **Pas** | **Acțiune** | **Detalii** |
| --- | --- | --- |
| 1 | Detectare proiect | Next.js (App Router, TypeScript sau JavaScript), Express (ESM sau CommonJS) sau Node.js fără framework; npm, pnpm, yarn sau bun. |
| 2 | Credențiale | Cheia API, semnătura POS, POS ID-ul și URL-ul public sunt scrise în `.env` (Express / Node) sau `.env.local` (Next.js), cu acces doar pentru proprietar. Fișierul este adăugat în `.gitignore`, iar cheia nu este afișată. |
| 3 | Instalare | Se instalează pachetul `netopia` cu managerul de pachete al proiectului. |
| 4 | Rute generate | POST /api/netopia/start (inițiere plată), POST /api/netopia/notify (IPN), GET /netopia/return (pagina de revenire). |
| 5 | Montare (Express) | Routerul este adăugat imediat după `express()`, înainte de `express.json()`, pentru ca IPN-ul să primească body-ul brut. |
| 6 | Fișier cu hook-uri | `resolveOrder` și `onPaymentUpdate` — logica magazinului. Acest fișier nu este suprascris niciodată de comandă. |

Pentru rulare fără întrebări (servere de build, agenți AI), transmiteți secretele prin variabile de mediu, nu ca argumente în linia de comandă:

```bash
NETOPIA_API_KEY='…' NETOPIA_POS_SIGNATURE='XXXX-XXXX-XXXX-XXXX-XXXX' NETOPIA_POS_ID='…' \
  npx netopia init --yes --app-url https://www.your-domain.com
```

| **Opțiune** | **Efect** |
| --- | --- |
| `--production` | Configurează mediul Producție (implicit: Sandbox). |
| `--app-url <url>` | URL-ul public din care se formează notifyUrl și redirectUrl. |
| `--framework next\|express\|node` | Suprascrie detectarea automată. |
| `--no-install` | Nu instalează pachetul. |
| `--no-mount` | (Express) Nu modifică fișierul aplicației. |
| `--force` | Regenerează rutele (fișierul cu hook-uri rămâne neatins). |

### 10.4 Ce rămâne de implementat

Comanda generează tot ce ține de NETOPIA. Logica magazinului rămâne în sarcina dvs.:

1. **resolveOrder** — calculați suma pe server, din coș sau din baza de date. Nu folosiți suma trimisă de browser. Rutele generate refuză plățile în Producție până când această funcție este implementată.
2. **onPaymentUpdate** — actualizați comanda la fiecare IPN verificat; marcați-o plătită doar la status 3 sau 5 (Secțiunea 8.1). Salvați ntpID-ul și, dacă ați trimis clientID, token-ul (Secțiunea 7.1). Funcția trebuie să fie idempotentă, deoarece NETOPIA poate retrimite aceeași notificare.
3. **Butonul de plată** — apelați ruta de inițiere și redirecționați clientul:

```js
const res = await fetch('/api/netopia/start', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ orderID: 'COMANDA-123' }),
});
const { paymentURL, customerAction, error } = await res.json();
if (paymentURL) window.location.href = paymentURL;
```

4. **3-D Secure** — dacă răspunsul conține customerAction (status 15), urmați pașii din Secțiunea 9.3.
5. **URL public** — NETOPIA nu poate trimite IPN la localhost. În dezvoltare, expuneți aplicația printr-un tunel HTTPS și rulați din nou comanda cu `--app-url <url public>`.

### 10.5 Integrare cu un agent AI

```bash
npx netopia skill
```

Comanda copiază skill-ul în `.claude/skills/netopia-integration/`. La o cerere de tipul „integrează plățile NETOPIA”, agentul:

- folosește CLI-ul pentru Next.js și Express, apoi completează `resolveOrder`, `onPaymentUpdate` și butonul de plată în codul existent;
- pentru alte framework-uri Node.js folosește SDK-ul direct;
- pentru PHP, Python, Java, .NET sau alte limbaje scrie integrarea nativ, după acest ghid (inclus în skill);
- verifică la final regulile obligatorii din Secțiunea 10.8.

> **IMPORTANT:** Nu scrieți cheia API în conversația cu agentul: tot ce scrieți ajunge la furnizorul modelului AI. Setați variabilele NETOPIA_API_KEY, NETOPIA_POS_SIGNATURE și NETOPIA_POS_ID în terminal sau în fișierul `.env` înainte de a porni agentul.

### 10.6 Utilizare directă a SDK-ului

```js
import { Netopia, IPN_ACK, parseIpn } from 'netopia';

const netopia = Netopia.fromEnv();

// Inițiere plată → redirect la paymentURL
const { paymentURL, orderID } = await netopia.startPayment({
  amount: 100,
  currency: 'RON',
  description: 'Comanda 123',
  billing: { email: 'client@example.com', firstName: 'Ion', lastName: 'Popescu', city: 'Bucuresti' },
});

// notifyUrl — verificați body-ul BRUT, înainte de orice parsare
const check = netopia.verifyIpn(rawBody, req.headers);
if (check.valid) {
  const ipn = parseIpn(check.payload); // { orderID, ntpID, status, paid, token, … }
  // actualizați comanda, apoi răspundeți HTTP 200 cu IPN_ACK ({ "errorCode": 0 })
}

await netopia.getStatus({ ntpID, orderID });
await netopia.refund({ ntpID, amount: 50 }); // refund parțial
await netopia.expire({ ntpID, orderID });

// Plăți recurente: prima plată cu { clientID }, ulterior { token, scaExemptionInd: 'MIT', ipAddress }
```

SDK-ul acceptă și opțiunile din Secțiunea 7: `split`, `installments`, `clientID`, `token` și `scaExemptionInd`. Money Send (7.4) și integrarea directă card (Secțiunea 9) nu sunt incluse.

### 10.7 Variabile de mediu

| **Variabilă** | **Rol** |
| --- | --- |
| `NETOPIA_API_KEY` | Cheia API — diferită pentru Sandbox și Producție. |
| `NETOPIA_POS_SIGNATURE` | Semnătura POS. |
| `NETOPIA_POS_ID` | POS ID — pentru status și expirare. |
| `NETOPIA_SANDBOX` | `true` (implicit) sau `false` pentru Producție. |
| `NETOPIA_APP_URL` | URL-ul public; din el rezultă notifyUrl (`/api/netopia/notify`) și redirectUrl (`/netopia/return`). |
| `NETOPIA_NOTIFY_URL`, `NETOPIA_REDIRECT_URL`, `NETOPIA_CANCEL_URL` | Suprascriu URL-urile deduse. |

### 10.8 Securitate și verificări înainte de Producție

Integrarea automată aplică regulile din Secțiunile 3–7: verifică semnătura RS512 și hash-ul SHA-512 al fiecărui IPN, răspunde cu `{ "errorCode": 0 }` doar după procesare (altfel NETOPIA retrimite), cere IP-ul plătitorului la plățile cu token și nu afișează cheia API. Înainte de trecerea în Producție, verificați:

- ☐ Cheia API și semnătura POS de Producție sunt setate, iar NETOPIA_SANDBOX=false
- ☐ resolveOrder calculează suma pe server
- ☐ onPaymentUpdate salvează ntpID-ul (și token-ul) și este idempotentă
- ☐ notifyUrl este HTTPS public și accesibil din internet
- ☐ IPN-ul este acceptat doar de la 217.156.103.68 (firewall sau `netopia.isNetopiaIp(ip)`) — rutele generate nu aplică automat această restricție
- ☐ A fost testată o plată în Sandbox cu un card de test (Secțiunea 8.3), iar IPN-ul a ajuns și a fost procesat

---

## Glosar de Termeni — NETOPIA API V2

### A

Acțiune de redirectare (Redirect)  Procesul prin care utilizatorul este direcționat automat către pagina securizată NETOPIA pentru introducerea datelor de card și finalizarea plății.

Admin Merchant / Consola Merchant  Interfața web unde comerciantul configurează punctele de vânzare (POS), cheile API, semnăturile și URL-urile de notificare.

API Key (Cheie API)  Token unic folosit pentru autentificarea cererilor HTTP către API-ul NETOPIA. Se transmite în header-ul Authorization.

Apple Pay  Metodă de plată mobilă dezvoltată de Apple. În integrarea NETOPIA, plata se face printr-un token criptat trimis în câmpul payment.instrument.token.

AuthCode  Cod de autorizare emis de banca emitentă pentru o tranzacție aprobată (prezent în răspunsul IPN).

### B

Billing (Facturare)  Secțiunea din request care conține datele clientului: nume, e-mail, telefon, oraș, țară, cod poștal etc.

Body Raw  Varianta neprocesată a corpului unui request HTTP, necesară pentru validarea JWT a IPN-urilor.

### C

cancelUrl  URL-ul la care este redirectat clientul dacă anulează plata pe pagina NETOPIA.

config (obiect request)  Obiectul din request ce conține notifyUrl, redirectUrl, cancelUrl și language.

Credit / Refund  Operațiune prin care o sumă este returnată clientului, total sau parțial, după capturarea plății.

currency  Codul ISO 4217 al monedei tranzacției. De obicei RON pentru tranzacții în lei românești.

### G

Google Pay  Metodă de plată mobilă/web dezvoltată de Google. Token-ul criptat obținut este trimis în payment.instrument.token.

### I

IPN (Instant Payment Notification)  Notificare server-to-server trimisă de NETOPIA la notifyUrl-ul comerciantului ori de câte ori statusul unei tranzacții se schimbă.

Instalments (Plăți în Rate)  Funcționalitate opțională prin care clientul poate plăti în rate. Se configurează prin câmpul order.installments.

### J

JWT (JSON Web Token)  Standard de autentificare folosit de NETOPIA pentru a semna notificările IPN. Token-ul se transmite în header-ul Authorization: Bearer.

**M**  
MIT (Merchant Initiated Transaction) O tranzacție de plată inițiată de comerciant fără participarea activă a clientului în momentul plății. Se folosește pentru plăți recurente (abonamente) în baza unui acord prealabil („mandat”) oferit de client la prima tranzacție. În API, se semnalează prin câmpul `scaExemptionInd: "MIT"`.

### N

notifyUrl  URL-ul publicat pe serverul comerciantului unde NETOPIA trimite notificările IPN. Trebuie să fie HTTPS și să răspundă cu { "errorCode": 0 }.

ntpID  Identificatorul unic al tranzacției generat de NETOPIA. Folosit în operațiunile de credit, expirare și interogare status.

### O

orderID  Identificatorul unic al comenzii generat de comerciant. Trebuie să fie unic per tranzacție.

### P

paymentURL  URL-ul returnat de NETOPIA după inițierea plății. Comerciantul redirectează browser-ul clientului la această adresă.

PCI DSS  Standard internațional de securitate pentru datele cardurilor. Comercianții nu trebuie să stocheze date sensibile (nr. card, CVV) și trebuie să folosească TLS 1.2+.

POS Signature (Semnătură POS)  Identificatorul punctului de vânzare. Se găsește în Admin → Puncte de vânzare → Setări tehnice și se trimite în order.posSignature.

### R

redirectUrl  URL-ul la care este redirectat clientul după finalizarea (cu succes sau eșec) a plății.

RS512  Algoritm de semnătură criptografică (RSA cu SHA-512) folosit pentru semnarea JWT-urilor IPN de către NETOPIA.


### S

Sandbox  Mediu de testare izolat, fără tranzacții reale. Folosiți cheile și endpoint-urile de Sandbox exclusiv pentru dezvoltare și testare.

SHA-512  Funcție criptografică folosită pentru a valida integritatea corpului unui IPN, comparând hash-ul calculat cu valoarea sub din JWT.

Split Payments (Plăți Divizate)  Funcționalitate prin care suma unei tranzacții poate fi împărțită automat între mai mulți destinatari (companie-mamă și parteneri).

SCA (Strong Customer Authentication) Cerință europeană (sub PSD2) care obligă la autentificarea biometrică sau prin doi factori a plăților. Anumiți indicatori (precum MIT sau TRA) permit gestionarea modului în care banca aplică sau exceptează această autentificare.  
SCA Exemption Indicator Parametru trimis în request pentru a specifica tipul tranzacției și a ghida banca în aplicarea regulilor de autentificare. (Exemple: MIT, TRA).

### T

Token (Plăți Recurente / One-Click) Identificator criptat al unui card stocat, obținut după prima plată reușită. Permite inițierea de plăți viitoare fără ca clientul să reintroducă datele cardului.

  
TRA (Transaction Risk Analysis) Indicator de scutire bazat pe analiza riscului tranzacției. În contextul plăților One-Click, utilizarea `scaExemptionInd: "TRA"` permite procesarea plății fără reintroducerea datelor cardului, dar tranzacția este de regulă trimisă către 3D Secure pentru a confirma prezența și acordul posesorului de card.

### W

Whitelist IP  Listă de adrese IP de la care serverul comerciantului acceptă conexiuni IPN. Trebuie să conțină IP-urile NETOPIA: 217.156.103.68 (Producție) și 217.156.103.69 (Sandbox).

---

## 11. Versionare Document

Această secțiune înregistrează toate modificările aduse documentului (adăugiri, modificări, ștergeri).

| **Versiune** | **Data** | **Autor** | **Tip Modificare** | **Descriere** |
| --- | --- | --- | --- | --- |
| 1.0 | 21.04.2026 | Marcaru Cezar | Adăugare | Creare document Markdown din documentația originală .docx; includere jurnal de testare din Teste credit split.xlsx; adăugare secțiune de versionare. |
| 1.1 | 21.04.2026 | Marcaru Cezar | Adăugare | Includere teste suplimentare din Excel: SendMoney (H-6, H-7, H-8), teste New vs Old API (H-1 la H-4), și teste Preauth Response (P-1 la P-4); actualizare jurnal de testare cu secțiuni 10.13. |
| 2.2 | 05.05.2026 | Marcaru Cezar | Modificare | Adăugare checklist rapid cu checkbox-uri în Secțiunea 1; eliminare Jurnal de Testare (mutat în document separat); actualizare cuprins și versionare. |
| 2.4 | 06.05.2026 | Marcaru Cezar | Modificare | Actualizare Secțiunea 7.1 cu indicatorii SCA (MIT/TRA) pentru plăți recurente și One-Click; adăugare termeni aferenți în Glosar. |
| 2.5 | 07.05.2026 | Marcaru Cezar | Modificare | Adăugare notă importantă (Warning) în Secțiunea 7.1 privind comportamentul status 15 pentru plățile One-Click (TRA) și necesitatea redirecționării către 3D Secure; adăugare link ancoră către Secțiunea 9.3. |
| 2.6 | 28.08.2026 | Marcaru Cezar | Adăugare | Documentarea faptului că punctele de vânzare nu pot fi adăugate în Sandbox și se configurează din consola NETOPIA; adăugarea cheii publice RSA pentru verificarea IPN și precizarea că este aceeași în Live/Producție și Sandbox. |
| 2.7 | 28.08.2026 | Marcaru Cezar | Adăugare | Adăugare cheie publică RSA pentru verificarea semnăturii JWT/RS512 a notificărilor IPN în Secțiunea 3.4; cheia este comună pentru mediile Live/Producție și Sandbox. |
| 2.8 | 11.11.2026 | Marcaru Cezar | Modificare | Secțiunea 7.4: precizarea că Money Send nu este disponibil în Sandbox; eliminarea notei privind copierea/distribuirea; corectarea legăturii din Cuprins către Secțiunea 10 — Versionare Document; ordonarea cronologică a tabelului de versiuni. |
| 2.9 | 11.11.2026 | Marcaru Cezar | Adăugare | Secțiunea 10 nouă — Integrare Automată (SDK, CLI și Agent AI): pachetul netopia, comanda npx netopia init, skill-ul pentru agenți AI, variabile de mediu și verificări înainte de Producție; Versionare Document devine Secțiunea 11. |
| 2.10 | 12.11.2026 | Marcaru Cezar | Modificare | Precizarea că posID din Secțiunile 6.2 (Expirare Link) și 6.3 (Interogare Status) este semnătura POS (aceeași valoare ca order.posSignature); actualizarea exemplelor și a Secțiunii 3.2. |

---
