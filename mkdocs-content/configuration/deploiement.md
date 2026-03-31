# Guide de déploiement — Installation initiale

> Ce guide est pour la **première installation** du système.
> À suivre une seule fois. Après l'installation, utilisez le [Guide de l'opérateur](../operateur/index.md).

---

## Prérequis

- Compte Google Workspace avec accès au Drive et Gmail
- Accès administrateur au domaine (pour le script Apps Script)
- Le code source (10 fichiers `.js` dans le dossier `src/`)

---

## Étape 1 : Créer le classeur Google Sheets

1. Créez un nouveau classeur Google Sheets
2. Nommez-le : **Facturation Accès Badminton**
3. Notez l'URL — c'est votre espace de travail principal

---

## Étape 2 : Installer le code Apps Script

1. Dans le classeur → **Extensions → Apps Script**
2. L'éditeur de script s'ouvre dans un nouvel onglet
3. Supprimez le contenu par défaut du fichier `Code.gs`
4. Créez **10 fichiers** dans l'éditeur de script :

| Nom du fichier | Source locale |
|----------------|-------------|
| `Config.gs` | `src/Config.js` |
| `Inscriptions.gs` | `src/Inscriptions.js` |
| `FormHandler.gs` | `src/FormHandler.js` |
| `BillingTracker.gs` | `src/BillingTracker.js` |
| `Notifications.gs` | `src/Notifications.js` |
| `CreditNotes.gs` | `src/CreditNotes.js` |
| `DriveOrganizer.gs` | `src/DriveOrganizer.js` |
| `Menu.gs` | `src/Menu.js` |
| `Pricing.gs` | `src/Pricing.js` |
| `Roster.gs` | `src/Roster.js` |

5. Pour chaque fichier :
   - Cliquez **+** → **Script**
   - Renommez le fichier (ex : `Config`)
   - Copiez-collez le contenu du fichier source correspondant
6. Supprimez le fichier `Code.gs` initial (vide)
7. Cliquez **💾 Enregistrer** (Ctrl+S)

---

## Étape 3 : Exécuter la configuration initiale

1. Retournez au classeur Google Sheets
2. Rechargez la page (F5)
3. Le menu **🏸 Accès Badminton** apparaît (peut prendre 5-10 secondes)
4. Menu → **🛠️ Configuration initiale**
5. Google demandera des **autorisations** la première fois :
   - Cliquez **Continuer**
   - Choisissez votre compte
   - Cliquez **Autoriser**
6. Le système crée les 8 onglets avec les en-têtes

---

## Étape 4 : Configurer les valeurs

1. Allez à l'onglet **Configuration**
2. Vérifiez et ajustez chaque valeur :

| Clé | Valeur à mettre | Exemple |
|-----|-----------------|---------|
| `nom_org` | Nom de l'organisation | Accès Badminton |
| `email_expediteur` | Courriel d'envoi | info@accesbadminton.ca |
| `session_courante` | Session actuelle | H2026 |
| `cotisation_prix` | Prix de la cotisation | 20 |
| `cotisation_description` | Texte sur la facture | Cotisation membre |
| `cotisation_code_article` | Code article | AB-COT |
| `adresse_org` | Adresse de l'organisation | 3355 Rue des Monarques... |
| `site_web` | URL du site | https://accesbadminton.ca/ |
| `dossier_factures_id` | ID du dossier Drive | (voir étape 5) |

---

## Étape 5 : Créer le dossier Drive pour les factures

1. Dans Google Drive, créez un dossier : **Factures Accès Badminton**
2. Copiez l'**ID du dossier** depuis l'URL :
   ```
   https://drive.google.com/drive/folders/ABC123xyz...
                                          ^^^^^^^^^^^
                                          Ceci est l'ID
   ```
3. Collez l'ID dans la Configuration → clé `dossier_factures_id`

---

## Étape 6 : Configurer les tarifs

1. Allez à l'onglet **Tarifs**
2. Vérifiez les 3 programmes pré-configurés (ajustez si les prix ont changé)
3. Pour ajouter un programme, remplissez une nouvelle ligne :

| Colonne | Contenu | Exemple |
|---------|---------|---------|
| Code article | Code unique | AB-ADT-ADV |
| Clé programme | Identifiant interne | Jeudi H2026 Adulte |
| Description facture | Texte sur la facture | Entraînement Adulte: Avancés/Compétitifs Jeudi H2026 |
| Session | Code session | H2026 |
| Prix | Prix en $ | 350 |
| Mot-clé formulaire | Texte à chercher dans la réponse du formulaire | Avancés/Compétitifs Jeudi H2026 |
| Actif | Oui/Non | Oui |

---

## Étape 7 : Créer et lier le formulaire Google

1. Créez un **formulaire Google** avec les champs suivants (dans cet ordre) :

| # | Champ | Type | Requis |
|---|-------|------|--------|
| 1 | Prénom | Texte court | Oui |
| 2 | Nom de famille | Texte court | Oui |
| 3 | Sexe | Choix multiple | Oui |
| 4 | Année de naissance | Texte court | Oui |
| 5 | Numéro de téléphone | Texte court | Oui |
| 6 | Numéro d'assurance maladie | Texte court | Oui |
| 7 | Date d'expiration assurance | Texte court | Oui |
| 8 | Nom contact urgence | Texte court | Oui |
| 9 | Tél. contact urgence | Texte court | Oui |
| 10 | Adresse civile | Texte court | Oui |
| 11 | Ville | Texte court | Oui |
| 12 | Code postal | Texte court | Oui |
| 13 | Allergie | Texte long | Non |
| 14 | Condition médicale | Texte long | Non |
| 15 | Êtes-vous déjà membre? | Choix multiple | Oui |
| 16 | Choix d'activité | Cases à cocher | Oui |
| 17 | Consentement photo/vidéo | Cases à cocher | Oui |
| 18 | Consentement vie privée | Cases à cocher | Oui |
| 19 | Commentaires | Texte long | Non |

2. Activez **Recueillir les adresses e-mail** dans les paramètres du formulaire
3. Dans l'onglet **Réponses** du formulaire → **Lier à une feuille de calcul existante** → sélectionnez le classeur de facturation

---

## Étape 8 : Configurer le déclencheur

1. Dans le classeur → **Extensions → Apps Script**
2. Cliquez **⏰ Déclencheurs** (horloge dans le panneau gauche)
3. Cliquez **+ Ajouter un déclencheur**
4. Configurez :
   - Fonction : **onFormSubmit**
   - Source : **Depuis la feuille de calcul**
   - Type d'événement : **Lors de l'envoi d'un formulaire**
5. Cliquez **Enregistrer**

---

## Étape 9 : Configurer Autocrat (5 jobs)

Suivez le [Guide Autocrat](autocrat.md) pour configurer les 5 jobs.

---

## Étape 10 : Tests

### Test 1 : Nouvelle inscription

1. Soumettez une réponse test via le formulaire
2. Vérifiez :
   - ✅ Ligne créée dans **Réponses du formulaire**
   - ✅ Joueur créé dans **Répertoire des joueurs**
   - ✅ Inscription(s) créée(s) dans **Inscriptions** (statut « En révision »)

### Test 2 : Cycle complet

1. Acceptez l'inscription → **Finaliser la révision** → **Générer la facture**
2. Lancez Autocrat manuellement (Run chaque job)
3. Vérifiez :
   - ✅ Notification de révision reçue par courriel
   - ✅ Facture PDF reçue par courriel
   - ✅ Statut passé à « Envoyé »
   - ✅ PDF dans le dossier Drive

### Test 3 : Paiement

1. Changez le statut à `Payé`, entrez la date
2. Run le job Autocrat « Accusé réception »
3. ✅ Accusé de réception reçu

### Test 4 : Refus et liste d'attente

1. Soumettez un nouveau test
2. Refusez un programme, mettez l'autre en attente, finalisez
3. ✅ Notification reçue avec les deux décisions

### Test 5 : Abandon

1. Marquez une facture comme Abandonné
2. Run le job « Avis d'abandon »
3. ✅ Courriel d'annulation reçu

### Test 6 : Note de crédit

1. Émettez une note de crédit sur une facture payée
2. Run le job « Note de crédit »
3. ✅ PDF de note de crédit reçu

### Nettoyage

1. Supprimez les lignes de test dans tous les onglets
2. Réinitialisez les compteurs dans **Configuration** (remettez tous les compteurs à `1`)

---

## Vérification finale

Menu → **🔧 Outils → ⚙️ Vérifier la configuration**

Tous les éléments doivent afficher ✅. Corrigez tout ce qui affiche ❌.

Le système est prêt pour la production.
