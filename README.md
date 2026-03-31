# Automatisation de la facturation — Accès Badminton V2.0

## Vue d'ensemble

Ce projet automatise le processus d'inscription et de facturation pour Accès Badminton (OBNL) en utilisant une **approche hybride V2.0** :

- **Google Apps Script** (10 fichiers) gère la logique de données : inscriptions par programme, facturation just-in-time, déduplication, tarifs, gestion familiale.
- **Autocrat** (5 jobs) gère la génération des PDF et l'envoi de courriels (notification, factures, accusés de réception, annulations, notes de crédit).

> L'architecture est guidée par le principe **« Configuration plutôt que Code »** : l'administration et les modèles de courriel/PDF se font sans toucher au code JavaScript.

---

## Modèle à deux couches (Nouveau V2.0)

Pour supporter la facturation avancée (liste d'attente, familliale, remboursements), le système sépare :

1. **Couche 1 : Les inscriptions**
   - L'opérateur prend ses décisions (Accepté / En attente / Refusé) **par programme**.
   - Une notification consolidée (1 seul courriel) est envoyée lorsque toutes les décisions sont prises.
   
2. **Couche 2 : La facturation**
   - Les inscriptions *Acceptées* génèrent des factures selon un processus *Just-in-Time*.
   - Il est possible de **regrouper plusieurs joueurs d'une famille** sur une même facture.
   - Jusqu'à 9 articles par facture.
   - La cotisation annuelle est automatiquement calculée et ajoutée une seule fois par an.

Voir [docs/architecture.md](docs/architecture.md) pour les détails techniques complets du flux de données.

---

## Structure du projet

```text
src/
├── Config.js           Configuration, colonnes, et constantes
├── FormHandler.js      Déclencheur de formulaire (crée les Inscriptions)
├── Inscriptions.js     Logique de la couche 1 (Accepté/En attente/Refusé)
├── BillingTracker.js   Logique de la couche 2 (Génération de factures, JIT, cotisation)
├── Notifications.js    Création des courriels consolidés
├── CreditNotes.js      Génération de notes de crédit (remboursements partiels)
├── DriveOrganizer.js   Tri automatique des PDF dans Google Drive
├── Menu.js             Menus UI personnalisés et configuration initiale
├── Pricing.js          Recherche de tarifs et calculs
└── Roster.js           Opérations sur le répertoire des joueurs (déduplication)

docs/
├── architecture.md          Architecture technique complète (V2.0)
├── guide-admin.md           Guide d'utilisation quotidienne pour l'opérateur (français)
├── guide-deploiement.md     Étapes d'installation initiale
├── guide-autocrat.md        Guide de configuration des 5 jobs Autocrat
├── template-facture.md      Contenu du modèle Google Docs pour la facture
├── template-note-credit.md  Contenu du modèle de la note de crédit
├── template-notification.md Contenu pour le courriel de notification consolidé
└── template-avis-abandon.md Contenu pour le courriel d'annulation
```

---

## Technologies utilisées (Coût 0$)

| Technologie | Usage |
|---|---|
| Google Forms | Inscription des joueurs |
| Google Sheets | Base de données (8 onglets) + interface administrateur |
| Google Apps Script | Automatisation (logique métier, déduplication, traitement JIT) |
| Autocrat (extension) | Génération PDF (Factures, Notes de crédit) + envoi de courriels |
| Google Docs | Modèles d'impression (Design des PDF) |
| Google Drive | Stockage et tri organisé des factures (À payer, Payées, Annulées) |
| Gmail | Envoi des 5 types de courriels de manière transparente |

---

## Déploiement et Utilisation

**🚀 Installation initiale**
Voir `docs/guide-deploiement.md` pour un guide étape par étape couvrant l'installation des 10 scripts et l'exécution du configurateur initial.

**📝 Configuration d'Autocrat**
Le système nécessite 5 "jobs" Autocrat pour fonctionner pleinement. Voir `docs/guide-autocrat.md` pour le paramétrage des balises et modèles.

**🏸 Utilisation au quotidien**
L'opérateur n'a besoin que du **Guide Admin** (`docs/guide-admin.md`). Il contient 18 processus métier courts et sans jargon technique pour tout gérer, de la simple acception à la facturation familiale.
