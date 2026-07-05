> ⚠️ **BACKEND CONVEX PARTAGÉ — LIS CECI AVANT TOUTE CHOSE.**
>
> Les apps (Mes Outils, Recyclerie/Recycapp, Klyde, Cycle en Bray, Bennes & Pro)
> partagent **un seul déploiement Convex**. Le dossier `convex/` **canonique**
> (sur-ensemble de toutes les apps) vit dans **`~/mesoutils`** — c'est la SEULE
> source de vérité. Les `convex/` des autres dépôts ne sont que des copies pour
> le typecheck local.
>
> **🔁 Lance ce script AVANT *et* APRÈS toute intervention sur n'importe quelle app :**
>
> ```
> bash ~/mesoutils/scripts/sync-convex.sh
> ```
>
> Il réaligne tous les dossiers `convex/` sur le canonique.
>
> **Règles impératives :**
> - Toute fonction ou table backend — **même pour CETTE app** — s'écrit dans `~/mesoutils/convex/`, jamais ailleurs.
> - On **déploie le backend uniquement depuis Mes Outils** : `cd ~/mesoutils && npx convex deploy`.
> - Ne lance **jamais** `npx convex dev` ni `npx convex deploy` depuis un autre dépôt.

---

## Bennes & Pro

Application de suivi des **dépôts de déchets** par les entreprises (marque
**Déchet'Lab**, logo `public/logo.png`). Tables backend préfixées `bp*`
(`bpCompanies`, `bpVehicles`, `bpDepots`, `bpSettings`) + module `convex/bennespro.ts`.
Accès géré par les permissions Mes Outils (clés `bennespro:*`). Bon de dépôt PDF
généré côté client avec `jspdf` (`src/lib/bonDepotPdf.ts`).

- **QR codes entreprises** : générés côté client (`src/lib/qr.ts`), étiquette PDF
  62 × 29 mm pour Brother QL-500 (`src/lib/companyLabelPdf.ts`). L'URL encodée
  `/?entreprise=<bpCompanies id>` ouvre un nouveau dépôt présélectionné
  (géré dans `AppLayout`) ; scan in-app via `QrScannerModal` (BarcodeDetector + jsQR).
- **Facturation Stripe du DIB** : seul le flux « Tout venant/DIB non triés » est
  facturé, au poids (kg/tonne), prix dans `bpSettings` (défaut 34 c€/kg, page DIB).
  Action `bennespro.invoiceDepotDib` (facture Stripe `send_invoice` 30 j) ; clé
  API dans l'env Convex `BENNESPRO_STRIPE_SECRET_KEY` (jamais dans le code).

---

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
