---
name: NETOPIA API — Ghid de Integrare
description: Documentația care se comportă ca o consolă — carbon neutru, linii de 1px, codul ca suprafață principală.
colors:
  carbon: "#09090b"
  carbon-surface: "#111113"
  carbon-raised: "#18181b"
  carbon-line: "#27272a"
  carbon-line-strong: "#3f3f46"
  ink: "#e4e4e7"
  ink-secondary: "#a1a1aa"
  ink-faint: "#85858f"
  console-indigo: "#7c8cf8"
  console-indigo-text: "#a5b0fb"
  signal-emerald: "#6ec5a0"
  signal-sky: "#7ab8dc"
  signal-amber: "#d4a54a"
  signal-red: "#e07a7a"
  signal-violet: "#a99bdc"
  code-bar: "#0c0c0e"
  code-muted: "#71717a"
  paper: "#ffffff"
  paper-surface: "#fafafa"
  paper-raised: "#f4f4f5"
  paper-line: "#e4e4e7"
  paper-line-strong: "#d4d4d8"
  paper-ink: "#18181b"
  paper-ink-secondary: "#52525b"
  paper-ink-faint: "#6b6b74"
  console-indigo-light: "#4f5bd5"
  console-indigo-text-light: "#4049b8"
  signal-emerald-light: "#2f7d5c"
  signal-sky-light: "#2f6f96"
  signal-amber-light: "#96650f"
  signal-red-light: "#b33d3d"
  signal-violet-light: "#6a55b8"
typography:
  display:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(34px, 4.6vw, 48px)"
    fontWeight: 600
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "26px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 600
    letterSpacing: "-0.015em"
  body:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Geist, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    letterSpacing: "0.04em"
  code:
    fontFamily: "JetBrains Mono, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "12.5px"
    fontWeight: 400
    lineHeight: 1.7
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "40px"
  section: "64px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.ink-secondary}"
    textColor: "{colors.carbon}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0 14px"
    height: "36px"
  button-ghost-hover:
    backgroundColor: "{colors.carbon-raised}"
  button-run:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.carbon}"
    rounded: "{rounded.md}"
    padding: "0 6px 0 12px"
    height: "30px"
  input:
    backgroundColor: "{colors.carbon-surface}"
    textColor: "{colors.ink}"
    typography: "{typography.code}"
    rounded: "{rounded.md}"
    padding: "0 10px"
    height: "36px"
  status-chip:
    backgroundColor: "transparent"
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.sm}"
    padding: "1px 7px"
  method-badge:
    textColor: "{colors.signal-emerald}"
    rounded: "{rounded.sm}"
    padding: "1px 6px"
  nav-link-active:
    backgroundColor: "{colors.carbon-raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "5px 10px"
  console:
    backgroundColor: "{colors.carbon-surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
---

# Design System: NETOPIA API — Ghid de Integrare

## Overview

**Creative North Star: "The Integration Console"**

Ghidul nu e o broșură despre API, ci locul în care dezvoltatorul îl folosește. Sistemul vizual tratează documentația ca pe o unealtă de lucru deschisă lângă editor și terminal: un fond de carbon neutru, linii de 1px care organizează fără să decoreze, și codul ca suprafață principală. Proza e calmă și lizibilă la măsură de 70ch; consolele (playground, blocuri de cod, răspunsuri) ocupă toată coloana și rămân întunecate în ambele teme, pentru că acolo se lucrează.

Tema întunecată este cea principală și implicită; tema deschisă oglindește exact aceleași reguli pe o scală zinc. Brandul NETOPIA trăiește în siglă și într-un singur accent indigo discret, nu în paletă: nu există gradiente, umbre, blur sau fundaluri colorate. Culoarea apare doar ca semnal — stare de plată, avertizare, succes, eroare — iar fiecare nuanță are mereu același sens.

Densitatea e de unealtă, nu de pagină de prezentare: tabele compacte, navigare în trei coloane, stări vizibile dintr-o privire (Sandbox, credențiale lipsă/setate). Componentele sunt precise și liniștite; nimic nu concurează cu codul.

**Key Characteristics:**
- Carbon neutru, întunecat implicit; tema deschisă e oglinda exactă pe zinc.
- Linii de 1px în loc de umbre; adâncimea vine din trei trepte tonale.
- Consolele de cod rămân întunecate în ambele teme.
- Culoare doar pentru semnal, cu sens stabil; un singur accent indigo pentru focus și selecție.
- Un singur buton primar luminos pe zonă; restul sunt fantome cu contur.

## Colors

Grayscale zinc rece cu un accent indigo rar și cinci culori-semnal desaturate, calibrate separat pentru fiecare temă.

### Primary
- **Console Indigo** (dark `console-indigo`, light `console-indigo-light`): inelul de focus, sublinierea termenilor găsiți în căutare, selecția de text și din editor. Varianta „text” (`console-indigo-text`) pentru legăturile de acțiune (`link-btn`) și flash-ul titlului la care ai sărit. Nu se folosește niciodată ca fundal plin.

### Secondary (semnale)
- **Signal Emerald**: succes și „gata” — plată `paid`/`confirmed`, credențiale setate, punctul Sandbox, bara de progres a checklist-ului, metoda `POST`, versiunea curentă din changelog.
- **Signal Amber**: atenție — credențiale lipsă, `expired`, avertizări `IMPORTANT`, funcționalități indisponibile în Sandbox.
- **Signal Red**: eroare și `fraud` — răspunsuri API eșuate, toast de eroare.
- **Signal Sky**: informație neutră — note, status `new`, metoda `GET`, toast informativ.
- **Signal Violet**: `refunded` — singura utilizare.

Fiecare semnal are trei forme derivate în CSS: culoarea plină pentru text și puncte, `-soft` (opacitate 6–10%) pentru fundal, `-border` (opacitate 22–28%) pentru contur.

### Neutral
- **Carbon / Paper** (`carbon`, `paper`): fundalul paginii și al drawer-ului.
- **Carbon Surface / Paper Surface**: sidebar, antet de tabel, câmpuri, paleta de căutare, blocuri de cod.
- **Carbon Raised / Paper Raised**: hover pe rânduri, elementul activ din navigare.
- **Carbon Line / Line Strong**: toate bordurile (1px); varianta „strong” pentru hover pe contur și puncte de pas.
- **Ink / Ink Secondary / Ink Faint**: text principal, proză și valori secundare, etichete și metadate. Ink Faint trece de 4.5:1 pe toate suprafețele.
- **Code Bar / Code Muted**: bara de tab-uri și subsolul consolei; text secundar în interiorul consolelor.

### Named Rules
**The Signal-Only Rule.** Culoarea saturată apare doar ca semnal de stare. Dacă un element colorat nu comunică o stare sau o semnificație, devine gri.

**The Stable Meaning Rule.** Emerald înseamnă reușită, amber atenție, red eroare, sky informație, violet refund — în chip-uri, toast-uri, răspunsuri și callout-uri deopotrivă. Nu se reutilizează o nuanță pentru alt sens.

**The Logo Carries the Brand Rule.** Identitatea NETOPIA stă în sigla oficială din bara de sus. Paleta nu reintroduce indigo-ul de brand ca fundal, nici gradientul cyan–indigo.

## Typography

**Body Font:** Geist (cu Inter, apoi system-ui)
**Mono Font:** JetBrains Mono (cu SF Mono, Menlo)

**Character:** O pereche de lucru: Geist pentru proză și interfață, neutru și strâns la dimensiuni mari; JetBrains Mono doar acolo unde caracterul contează — cod, endpoint-uri, chei, coduri de stare, numere de secțiune.

### Hierarchy
- **Display** (600, clamp 34–48px, 1.08, -0.035em): doar titlul ghidului în hero.
- **Headline** (600, 26px, 1.2, -0.025em; 22px pe mobil): titlurile de secțiune numerotate.
- **Title** (600, 18px, -0.015em; 17px pe mobil): subsecțiunile 5.1, 6.2 etc.
- **Body** (400, 15px, 1.7): proza, la măsură maximă de 70ch; culoarea Ink Secondary, cu `strong` în Ink.
- **Label** (500, 11px, 0.04em, majuscule): doar etichetele de grup din sidebar și rail („Ghid de integrare”, „Pe această pagină”).
- **Code** (400, 12.5px, 1.7; editorul 13px): blocuri de cod, editor, răspunsuri.

Numerele de secțiune (`h-num`) sunt mono la 0.62em, Ink Faint, aliniate pe linia de bază cu titlul.

### Named Rules
**The Mono-Means-Machine Rule.** Monospace doar pentru ce ar putea fi copiat într-un terminal sau într-un request: cod, chei, endpoint-uri, coduri, versiuni, numere de secțiune. Numele, datele și stările în cuvinte („Lipsește”, „Setată”) folosesc Geist cu cifre tabulare.

**The No-Eyebrow Rule.** Niciun rând-etichetă deasupra unui titlu. Titlul își poartă singur greutatea.

## Layout

Trei coloane pe desktop: sidebar de navigare (272px), conținut (max 820px, centrat, padding lateral 56px) și rail-ul „Pe această pagină” (232px) cu cardul de sesiune. Bara de sus e fixă, 56px, cu bordură inferioară de 1px.

- **≤1240px:** dispare rail-ul; sidebar 256px, padding conținut 40px.
- **≤960px:** sidebar-ul devine panou glisant din stânga (max 300px / 86vw) cu scrim; căutarea se reduce la iconiță; coloana „Conținut” din index dispare.
- **≤640px:** gutter 16px; eticheta credențialelor devine iconiță cheie + punct de stare; insigna Sandbox din bară dispare (rămâne în fiecare consolă); subsolul consolei se stivuiește cu butonul de rulare pe toată lățimea.

Ritmul vertical: secțiunile de nivel 2 sunt separate de 64px + o linie de 1px + 56px (44/40px pe mobil); subsecțiunile încep la 48px deasupra și 12px dedesubt. Proza, titlurile și callout-urile rămân la 70ch; tabelele, consolele, checklist-ul, pașii și changelog-ul folosesc toată coloana.

## Elevation & Depth

Sistemul este plat. Nu există `box-shadow`, blur sau gradient nicăieri. Adâncimea vine din trei trepte tonale (Carbon → Surface → Raised) și din linii de 1px. Suprapunerile (drawer, paleta de căutare, scrim-ul de pe mobil) se separă de pagină printr-un backdrop negru la 60% și o bordură Line Strong, nu prin umbră.

### Named Rules
**The Line-Not-Shadow Rule.** Orice separare se face cu o linie de 1px sau cu o treaptă tonală. O umbră nouă e o abatere de la sistem.

## Shapes

Colțuri mici și strânse: 4px pentru chip-uri, kbd, cod inline și focus; 6px pentru butoane, câmpuri, rânduri de navigare; 8px pentru containere (console, tabele, callout-uri, checklist, paletă). Singurele forme rotunde sunt punctele de stare (6px), cercurile pașilor (27px) și comutatorul. Bordurile sunt întotdeauna de 1px, inclusiv marcajele active din navigare (o linie de 1px în Ink pe stânga) și sublinierea tab-ului activ.

## Components

### Buttons
Precise și liniștite: un singur buton luminos per zonă, restul contur.
- **Shape:** colțuri de 6px; înălțime 36px (30px pentru varianta mică și pentru rularea din consolă).
- **Primary:** fundal Ink, text Carbon — adică alb pe întunecat și negru pe deschis. Hover: fundal Ink Secondary.
- **Ghost:** contur Carbon Line, text Ink; hover: contur Line Strong + fundal Raised.
- **Run („Trimite request”):** primar în consolă, cu indiciul `⌘ ↵` într-un kbd transparent. În rulare pulsează la 55% opacitate; indisponibil în Sandbox devine contur fără kbd.
- **Icon button:** 32×32 (28×28 în consolă), Ink Secondary, hover pe Raised.
- **Focus:** inel de 1px Console Indigo, offset 2px, pe toate controalele.

### Chips
- **Status chip:** mono 11.5px, colț 4px, trio-ul semnalului (text plin, fundal soft, contur border) după codul de stare din ghid.
- **Card de test:** chip text 12px cu contur Line; hover luminează conturul și textul.
- **Method badge:** mono 10.5px, 600, emerald pentru POST, sky pentru GET.

### Cards / Containers
- **Corner Style:** 8px.
- **Background:** transparent pe pagină (index, meta, checklist, changelog, tabele), Surface pentru cardul de sesiune și antete de tabel.
- **Shadow Strategy:** niciuna (vezi Elevation).
- **Border:** 1px Carbon Line; rândurile interne se despart cu aceeași linie.
- **Internal Padding:** 10–16px pe rânduri, 12px în cardul de sesiune.

### Callouts
Casetă nuanțată de 1px în culoarea semnalului: fundal `-soft`, contur `-border`, colț 8px, padding 12×16px. Warning = amber, Note = sky. Fără bare laterale groase.

### Inputs / Fields
- **Style:** 36px, Surface, contur 1px Carbon Line, colț 6px; valorile (chei, semnături) în mono 12.5px.
- **Focus:** conturul trece la Ink Secondary; fără halo.
- **Helper:** text 12px Ink Faint dedesubt, cu termenii tehnici în cod inline.

### Navigation
- **Sidebar:** fundal Surface, linkuri 13.5px Ink Secondary cu număr mono Ink Faint; hover și activ pe Raised cu text Ink. Subsecțiunile se deschid sub secțiunea curentă, marcate cu o linie de 1px care devine Ink pe elementul activ.
- **Rail:** aceeași linie verticală de 1px; elementul activ e în Ink cu marcaj de 1px.
- **Mobil:** panou glisant cu scrim 60%, aceeași ierarhie.

### The Console (signature)
Playground-ul este componenta care definește sistemul. Container întunecat în ambele teme (Carbon Surface, colț 8px, contur 1px), în patru benzi despărțite de linii de 1px: antet (metodă, endpoint mono, subtitlu, pastila Sandbox), bara de tab-uri pe Code Bar (Body / cURL / Node.js / PHP / Python; tab-ul activ subliniat cu 1px), editorul CodeMirror cu numere de linie, apoi ajutoarele (avertizare amber cu iconiță, placeholder-e de completat, carduri de test) și subsolul cu URL-ul Sandbox și butonul de rulare. Răspunsul apare dedesubt pe Carbon pur, cu status colorat după semnal, interpretarea codurilor din ghid și butoane pentru `paymentURL` / 3-D Secure.

## Do's and Don'ts

### Do:
- **Do** separa totul cu linii de 1px Carbon Line și trepte tonale Carbon → Surface → Raised.
- **Do** păstra consolele de cod întunecate și în tema deschisă.
- **Do** folosi trio-ul semnalului (plin / soft / border) pentru orice stare, cu sensul fix din Colors.
- **Do** ține proza la 70ch și lasă consolele și tabelele pe toată coloana.
- **Do** verifica Ink Faint și orice text secundar la minimum 4.5:1 în ambele teme.
- **Do** da fiecărui control un inel de focus de 1px Console Indigo, offset 2px.

### Don't:
- **Don't** adăuga umbre, blur, glassmorphism sau gradiente — inclusiv gradientul vechi cyan–indigo NETOPIA.
- **Don't** folosi indigo-ul de brand ca fundal plin sau ca culoare de buton.
- **Don't** pune bare colorate laterale mai groase de 1px pe callout-uri, rânduri sau alerte.
- **Don't** pune un rând-etichetă (eyebrow) deasupra titlurilor.
- **Don't** scrie nume, date sau stări în cuvinte cu monospace.
- **Don't** pune mai mult de un buton primar luminos în aceeași zonă.
