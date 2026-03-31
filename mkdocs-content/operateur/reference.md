# Référence

## Onglets du classeur (8)

| Onglet | Rôle | Qui le modifie |
|--------|------|---------------|
| Réponses du formulaire | Données brutes du formulaire | Automatique |
| Répertoire des joueurs | Fiche de chaque joueur | Automatique + vous (corrections) |
| Inscriptions | 1 ligne par joueur × programme | Automatique + vous (décisions) |
| Suivi de facturation | 1 ligne par facture | Automatique + vous (paiements) |
| Notifications | Courriels de notification | Automatique |
| Notes de crédit | Notes de crédit (remboursements) | Automatique |
| Tarifs | Prix des programmes | Vous |
| Configuration | Paramètres du système | Vous |

---

## Statuts d'inscription

| Statut | Signification |
|--------|--------------|
| `En révision` | En attente de votre décision |
| `Accepté` | Joueur accepté, prêt pour facturation |
| `En attente` | Liste d'attente (programme complet) |
| `Refusé` | Joueur refusé |
| `Abandonné` | Joueur ou admin a annulé |

---

## Statuts de facturation

| Statut | Signification |
|--------|--------------|
| `Non généré` | Facture créée, Autocrat va l'envoyer |
| `Envoyé` | Facture envoyée au joueur |
| `Payé` | Paiement reçu |
| `Abandonné` | Joueur a annulé avant de payer |
| `Remboursé` | Paiement retourné (note de crédit émise) |
| `Annulé` | Facture annulée (remplacée par une nouvelle) |

---

## Courriels automatiques (Autocrat)

| Courriel | Quand | Contenu |
|----------|-------|---------|
| Notification de révision | Après « Finaliser » | Résumé des décisions (accepté/attente/refusé) |
| Facture | Après « Générer la facture » | PDF de la facture + instructions de paiement |
| Accusé de réception | Après avoir marqué « Payé » | Confirmation de paiement |
| Avis d'abandon | Après avoir marqué « Abandonné » | Confirmation d'annulation |
| Note de crédit | Après « Émettre une note de crédit » | PDF avec détail du remboursement |
