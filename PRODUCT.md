# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Merchant developers**: backend and full-stack developers at merchants who are integrating NETOPIA Payments card processing (API v2). They read the guide while writing integration code, with an editor and a terminal open beside it, and they need to get from credentials to a working payment and a verified IPN.
- **Agencies and integrators**: third-party developers who build shops or plugins for several merchants. They come back to the same endpoints often and look things up rather than reading the guide from start to finish.
- **NETOPIA implementation team** (implementare@netopia-payments.com): internal staff who support integrations. They send merchants links to specific sections and use the site to answer questions.

## Product Purpose

A web edition of the *API Ghid de Integrare* (NETOPIA Payments API v2) that people can run, not only read. It covers payment initiation, redirects, IPN, recurring and One-Click payments, status, expiry, credit/refund, split payments, Money Send, direct card integration and automated integration.

**Success:** a developer gets their first working Sandbox payment and IPN running quickly, with fewer support emails to the implementation team.

## Positioning

The guide is the console. Every JSON request in the official guide becomes an editable playground that calls the real NETOPIA Sandbox directly from the browser (the API allows CORS, so no proxy is needed). It fills in credentials and order data automatically, explains response codes using the guide's own tables, and generates ready-to-copy cURL, Node.js, PHP and Python from the current request body.

## Operating Context

- **Single source of content:** `API Ghid de Integrare.md`. It is edited locally or on GitHub; a push to `main` makes Cloudflare Pages rebuild and publish the site in about one minute. Markdown conventions turn into UI: playgrounds, callouts, step timelines, status chips, test-card buttons, the changelog and the checklist (see README.md).
- **Access:** the site sits behind Cloudflare Access (login with an email code).
- **Credentials:** the Sandbox API key and POS signature are entered under "Credențiale". They are kept in `sessionStorage` (or `localStorage` when "Ține minte" is checked) and are sent only to NETOPIA.
- **Related tooling:** `packages/netopia` contains the SDK, the `npx netopia init` CLI and an AI-agent skill (guide section 10). The package is local only and not yet published to npm.
- The document has versions and named authors (currently v2.10, 12 November 2026). The version, date and authors appear in the site header, and the changelog lives in section 11.

## Capabilities and Constraints

- **Sandbox only:** the site never calls Production. Production URLs appear only in generated code samples. Features the guide marks as unavailable in Sandbox (such as Money Send) cannot be run.
- **Recognized endpoints:** `/payment/card/start`, `/operation/credit`, `/operation/expire`, `/operation/status`, `/disbursement/card/auth`.
- **Auto-fill:** `posSignature`, a unique `orderID` and the current `dateTime` are filled in automatically. After a successful payment, `ntpID` and `orderID` carry over into Refund, Status and Expiry. The `posID` in Status and Expiry is the POS signature.
- **Other features:** ⌘K search, light and dark themes (dark is the default), an interactive checklist, one-click test cards, `paymentURL` and 3-D Secure (`customerAction`) buttons.
- **Stack:** Vite and TypeScript with no UI framework, markdown-it, Shiki and CodeMirror 6. Static output goes to `dist/`.
- **Language:** Romanian.

## Brand Commitments

- The official NETOPIA Payments logo (`src/assets/netopia-logo.svg`) appears in the top bar.
- The NETOPIA brand is expressed through the logo, not the palette (confirmed 2026-11-12). The site uses a neutral palette with a discreet indigo accent; NETOPIA's indigo backgrounds and cyan–indigo gradient are deliberately not used. Visual details are in DESIGN.md.
- No other binding brand guidelines exist (confirmed).

## Evidence on Hand

- The full guide content, including status and error code tables, test cards, the glossary and the version history.
- The RSA public key for IPN verification, which is the same for Sandbox and Production.
- **Absences:** there are no customer testimonials, usage metrics or merchant case studies. Future work must not invent them.

## Product Principles

1. **Time to first Sandbox payment is the measure.** Every change should make the path from credentials to a working payment and IPN shorter or clearer.
2. **The Markdown guide is the truth.** Content changes go into the `.md` file, and the site derives its structure from it. Do not hard-code content into the UI.
3. **Safe by construction.** Calls go to Sandbox only, secrets stay in the browser and go only to NETOPIA, and the site makes no Production calls.
4. **Show, then let them run it.** Every request example can be run, copied in the developer's language, and explained when it fails.
5. **Fewer support emails.** Errors and statuses explain themselves using the guide's own tables, so developers do not need to ask the implementation team.
