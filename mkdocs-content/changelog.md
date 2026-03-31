# Journal des modifications

## V2.0 — Mars 2026

Refonte complète du système de facturation.

### Nouvelles fonctionnalités

- **Modèle à deux couches** : séparation des inscriptions (décisions par programme) et des factures (documents financiers)
- **Liste d'attente par programme** : les joueurs peuvent être mis en attente pour un programme spécifique, avec promotion manuelle (FIFO)
- **Facturation familiale** : regroupement de jusqu'à 3 membres sur une seule facture
- **Notes de crédit** : remboursements partiels avec suivi détaillé des articles
- **Notification consolidée** : un seul courriel par soumission avec toutes les décisions
- **Inscription manuelle** : ajout de joueurs sans formulaire (téléphone, en personne)
- **Propagation des corrections** : les modifications de données du répertoire se propagent aux inscriptions et factures
- **Organisation Drive** : tri automatique des PDF en sous-dossiers par statut
- **Avis d'abandon** : courriel automatique lorsqu'une facture est annulée

### Changements techniques

- 10 fichiers source (au lieu de 6)
- 8 onglets Google Sheets (au lieu de 5)
- 5 jobs Autocrat (au lieu de 3)
- 48 colonnes au suivi de facturation (au lieu de 35)
- Cotisation calculée par année (septembre-juin), pas par session
- Numéro de facture attribué JIT (Just-in-Time)

---

## V1.0 — Mars 2026

Version initiale.

- Formulaire Google → Facturation directe (1:1)
- 6 fichiers source
- 5 onglets Google Sheets
- 3 jobs Autocrat (facture, reçu, refus)
