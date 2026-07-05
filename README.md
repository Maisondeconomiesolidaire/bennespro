# Bennes & Pro — Déchet'Lab

Application de suivi des **dépôts de déchets professionnels** (expérimentation de
déchèterie professionnelle sur le Beauvaisis, Maison de l'Économie Solidaire).

## Fonctionnalités

- **Dépôts** : enregistrement pas-à-pas (entreprise, véhicule, flux de déchets,
  photos, signature) et génération du **bon de dépôt PDF** au logo Déchet'Lab.
- **Entreprises** : fiches entreprises + véhicules. À la création, un **QR code**
  est généré automatiquement ; l'étiquette PDF est au format **62 × 29 mm**,
  prête à imprimer sur **Brother QL-500** (rouleaux DK 62 mm).
- **Scan QR** : le bouton « Scannez » du nouveau dépôt (ou l'appareil photo du
  téléphone via l'URL `/?entreprise=<id>`) ouvre directement un dépôt avec
  l'entreprise présélectionnée.
- **DIB & facturation Stripe** : seul le flux *Tout venant / DIB non triés* est
  facturé, au poids (0,34 €/kg par défaut, ajustable dans l'onglet DIB). La
  facture Stripe est émise automatiquement à l'enregistrement du dépôt
  (envoyée par email si l'entreprise a un contact email).

## Stack

- React 19 + Vite + Tailwind 4 (front), déployable sur Vercel (`vercel.json`).
- [Convex](https://convex.dev) (backend **partagé** avec Mes Outils — voir plus bas).
- Clerk (authentification), permissions gérées par Mes Outils (`bennespro:*`).
- Stripe (facturation DIB), `jspdf` (PDF), `qrcode` / `jsqr` (QR codes).

## ⚠️ Backend Convex partagé

Le dossier `convex/` de ce dépôt n'est qu'une **copie pour le typecheck local**.
La source canonique vit dans le dépôt **Mes Outils** (`~/mesoutils/convex`) :
toute fonction ou table backend s'écrit là-bas, puis :

```bash
bash ~/mesoutils/scripts/sync-convex.sh   # avant ET après toute intervention
cd ~/mesoutils && npx convex deploy       # déploiement uniquement depuis Mes Outils
```

La clé Stripe est stockée côté Convex (`BENNESPRO_STRIPE_SECRET_KEY`), jamais
dans ce dépôt.

## Développement

```bash
npm install
cp .env.example .env.local   # renseigner les clés
npm run dev                  # front (le backend est le déploiement Convex partagé)
npm run lint                 # typecheck
npm run build                # build de production
```
