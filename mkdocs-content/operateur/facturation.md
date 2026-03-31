# Facturation

## Générer les factures

**Quand** : Après avoir finalisé la révision. Les inscriptions acceptées sont prêtes à facturer.

### Étapes

1. Menu → **💰 Facturation → 📝 Générer la facture**
2. Le système affiche toutes les inscriptions acceptées sans facture
3. Confirmez → **une facture par joueur** est créée automatiquement
4. Le numéro de facture est attribué (ex : `FACT-H2026-001`)
5. La facture apparaît dans l'onglet **Suivi de facturation** avec le statut **Non généré**
6. **Autocrat** génère le PDF et l'envoie par courriel dans l'heure
7. Le statut passe automatiquement à **Envoyé**

### Cotisation (frais d'adhésion)

!!! info "Règles de cotisation"
    - La cotisation ($20/personne) est ajoutée **automatiquement** si le joueur n'a pas encore été facturé pour l'année en cours
    - L'année de cotisation va de septembre à juin (ex : A2025 + H2026 = même année)
    - Un joueur déjà inscrit à la session d'automne ne paie **pas** la cotisation à nouveau en hiver

---

## Facturation familiale

**Quand** : Plusieurs membres d'une même famille veulent **une seule facture**.

### Étapes

1. Assurez-vous que les inscriptions de chaque membre sont **acceptées** et sans facture
2. Menu → **💰 Facturation → 👪 Facture familiale**
3. Le système affiche les joueurs disponibles. Entrez les numéros à regrouper (ex : `1,2`)
4. Choisissez le **payeur** (nom et adresse sur la facture)
5. Confirmez → une seule facture est créée avec tous les programmes

### Limites

| Limite | Valeur | Raison |
|--------|--------|--------|
| Membres par facture | **3 maximum** | 9 lignes max sur la facture |
| Programmes par membre (famille de 3) | **2 + cotisation** | 3 × 3 = 9 lignes |
| Programmes par joueur seul | **jusqu'à 8 + cotisation** | 9 lignes max |

---

## Enregistrer un paiement reçu

**Quand** : Le joueur a payé par Interac.

### Étapes

1. Allez à l'onglet **Suivi de facturation**
2. Trouvez la ligne du joueur
3. Changez le **Statut** (colonne I) de `Envoyé` à `Payé`
4. Entrez la **date de paiement** (colonne L)
5. **Autocrat** envoie automatiquement un accusé de réception dans l'heure

!!! tip "Pas besoin d'utiliser le menu"
    Modifiez directement les cellules du classeur.
