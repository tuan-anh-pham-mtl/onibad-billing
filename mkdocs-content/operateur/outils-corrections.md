# Outils et corrections

## Inscription manuelle (sans formulaire)

**Quand** : Un joueur s'inscrit **par téléphone, en personne, ou par courriel**.

### Étapes

1. Menu → **🔧 Outils → ➕ Ajouter une inscription manuellement**
2. **Étape 1** : entrez l'adresse courriel du joueur
    - Si le joueur existe déjà, il est trouvé automatiquement
    - Sinon, entrez son nom et adresse
3. **Étape 2** : sélectionnez les programmes (numéros séparés par des virgules)
4. **Étape 3** : confirmez
5. Les inscriptions sont créées avec le statut **En révision**
6. Suivez le processus normal : accepter → finaliser → générer facture

---

## Corriger une erreur de saisie

**Quand** : Faute de frappe dans un nom, courriel ou adresse.

### Étapes

1. Allez à l'onglet **Répertoire des joueurs**
2. Corrigez la cellule directement (nom, courriel, adresse, etc.)
3. Restez sur la ligne corrigée
4. Menu → **🔧 Outils → 🔄 Propager les modifications du joueur**
5. Le système met à jour toutes les inscriptions et factures liées

!!! warning "Factures déjà envoyées"
    Si une facture a déjà été envoyée, le PDF existant ne change pas. Utilisez « Régénérer une facture » pour envoyer un PDF corrigé.

---

## Suppression manuelle (Correction d'erreur)

**Quand** : Un joueur s'est inscrit en double ou a fait une erreur majeure, **et** l'inscription est toujours au statut `En révision`.

!!! danger "Attention : Ne supprimez jamais un dossier actif"
    Dès qu'un dossier a été facturé, payé ou remboursé, il devient une archive comptable. Si le joueur annule à ce stade, utilisez plutôt le menu **💰 Facturation → 🚫 Marquer comme abandonné**.

### Étapes pour supprimer un doublon ou une erreur

Il n'y a pas de bouton automatique pour supprimer un joueur, car cela effacerait potentiellement son historique des sessions passées. Vous devez supprimer les lignes manuellement dans les onglets :

1. **Onglet Inscriptions** :
    - Trouvez la ligne erronée (Statut `En révision`).
    - Faites un clic droit sur le **numéro de la ligne** tout à gauche.
    - Cliquez sur **Supprimer la ligne**.
    
2. **Onglet Réponses du formulaire** (Optionnel) :
    - Si vous voulez effacer la réponse à la source, allez dans cet onglet.
    - Trouvez la ligne correspondante et supprimez-la de la même manière.

3. **Ce qu'il ne faut PAS supprimer** :
    - Ne touchez pas au `Répertoire des joueurs` sauf si cet individu ne reviendra absolument jamais. Le garder dans le répertoire accélère ses prochaines inscriptions.

---

## Organiser les fichiers PDF (Drive)

**Quand** : Périodiquement, pour garder le dossier Drive propre.

Autocrat enregistre tous les PDF dans un seul dossier. Cette action les trie en sous-dossiers :

| Sous-dossier | Contenu |
|--------------|---------|
| `À payer/` | Factures envoyées, en attente de paiement |
| `Payées/` | Factures payées |
| `Annulées/` | Factures abandonnées, annulées ou remboursées |
| `Notes de crédit/` | Notes de crédit |

### Étapes

1. Menu → **🔧 Outils → 📁 Organiser les factures (Drive)**
2. Confirmez → les fichiers sont déplacés
3. Un rapport indique combien de fichiers ont été triés

---

## Résumé de session

Pour voir un portrait de la session en cours :

Menu → **🔧 Outils → 📊 Résumé de la session**

Le résumé affiche :

- Nombre d'inscriptions par statut (acceptées, en attente, refusées)
- Nombre de factures par statut (envoyées, payées, abandonnées)
- Revenu attendu vs revenu reçu
