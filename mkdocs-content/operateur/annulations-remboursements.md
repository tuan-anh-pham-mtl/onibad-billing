# Annulations et remboursements

## Annuler une inscription (avant paiement)

**Quand** : Un joueur change d'avis **avant d'avoir payé**.

### Étapes

1. Allez à l'onglet **Suivi de facturation**
2. Cliquez sur la ligne de la facture à annuler
3. Menu → **💰 Facturation → 🚫 Marquer comme abandonné**
4. Entrez la raison (ajoutée dans les Notes)
5. Le statut passe à **Abandonné**
6. **Autocrat** envoie un courriel de fermeture au joueur

---

## Rembourser un joueur (après paiement)

**Quand** : Un joueur a **déjà payé** et demande un remboursement (blessure, etc.).

### Étapes

1. Allez à l'onglet **Suivi de facturation**
2. Cliquez sur la ligne de la facture **payée**
3. Menu → **💰 Facturation → 💸 Émettre une note de crédit**
4. Entrez les articles à rembourser au format :
    ```
    Description | Code article | Montant
    ```
    Exemple :
    ```
    Entraînement Adulte Jeudi | AB-ADT-ADV | 350
    ```
5. Entrez la raison du remboursement
6. Le système :
    - Crée une note de crédit (`NC-H2026-001`)
    - Marque la facture comme **Remboursé**
    - **Autocrat** envoie la note de crédit au joueur

!!! warning "Le remboursement Interac est à faire manuellement"
    Le système ne transfère pas d'argent. Vous devez effectuer le virement de remboursement vous-même.

---

## Régénérer une facture

**Quand** : Un joueur modifie sa sélection de programmes **avant de payer**.

### Étapes

1. Mettez à jour les inscriptions si nécessaire (ex : marquer un programme comme Abandonné)
2. Allez à l'onglet **Suivi de facturation**
3. Cliquez sur la ligne de la facture à refaire
4. Menu → **💰 Facturation → 🔄 Régénérer une facture**
5. L'ancienne facture est marquée **Annulé**
6. Une nouvelle facture est créée avec un **nouveau numéro**
7. Autocrat envoie la nouvelle facture
