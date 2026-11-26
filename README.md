# NETOPIA API — Ghid de Integrare

Documentația web pentru NETOPIA Payments API v2, generată din `API Ghid de Integrare.md`.

Conținutul se editează doar în fișierul `.md`. La fiecare push pe `main`, Cloudflare Pages publică site-ul în aproximativ un minut.

## Ce oferă

- Exemple JSON care pot fi rulate direct din browser, doar în NETOPIA Sandbox.
- Credențialele de Sandbox rămân în browser și se trimit doar către NETOPIA.
- Cod gata de copiat în cURL, Node.js, PHP și Python.
- Explicarea răspunsurilor pe baza tabelelor de coduri din ghid.
- Căutare (⌘K), temă deschisă și întunecată, checklist și carduri de test.

## Convenții în Markdown

| În Markdown | Pe site |
| --- | --- |
| `## 5. Titlu` / `### 5.1 Titlu` | navigare și căutare |
| Bloc `json` într-o secțiune cu un endpoint | exemplu rulabil |
| `> **IMPORTANT:** …` / `> *Notă:* …` | casetă de avertizare / informare |
| Tabel `Pas \| …` | pași numerotați |
| Tabel `Cod \| Status \| Descriere` | stări colorate |
| Tabel cu coloana `Număr Card` | carduri de test |
| Tabel `Versiune \| Data \| …` | istoricul versiunilor |
| Listă cu `☐` | checklist |

Pentru a forța sau a opri un exemplu rulabil, se pune înaintea blocului de cod:

```md
<!-- try: /operation/status -->
<!-- try: off -->
```

## Rulare locală

```bash
npm install
npm run dev
npm run build
```

## Publicare

Cloudflare Pages: build command `npm run build`, output `dist`, `NODE_VERSION` = `24`. Accesul este protejat cu Cloudflare Access.
