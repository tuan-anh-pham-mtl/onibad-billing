# Guide Autocrat — Configuration des 5 jobs

> Ce guide explique comment configurer Autocrat dans le classeur Google Sheets.
> À faire **une seule fois** lors de l'installation, puis à vérifier en début de session.

---

## Prérequis

1. Le classeur doit avoir les 8 onglets créés (via **🛠️ Configuration initiale**)
2. L'extension **Autocrat** doit être installée depuis le Google Workspace Marketplace
3. Vous devez avoir **5 modèles Google Docs** (un par job — voir les sections ci-dessous)

---

## Résumé des 5 jobs

| # | Nom du job | Onglet source | Condition | Résultat |
|---|-----------|---------------|-----------|----------|
| 1 | Facture — Envoi | Suivi de facturation | Statut = `Non généré` | PDF + courriel |
| 2 | Accusé réception paiement | Suivi de facturation | Statut = `Payé` ET Reçu envoyé = `Non` | Courriel |
| 3 | Notification de révision | Notifications | Notification envoyée = `Non` | Courriel |
| 4 | Avis d'abandon | Suivi de facturation | Statut = `Abandonné` ET Courriel abandon envoyé = `Non` | Courriel |
| 5 | Note de crédit | Notes de crédit | Envoyée = `Non` | PDF + courriel |

---

## Étape 1 : Installer Autocrat

1. Ouvrez le classeur Google Sheets
2. Menu → **Extensions → Modules complémentaires → Télécharger des modules complémentaires**
3. Recherchez **Autocrat**
4. Cliquez **Installer** → acceptez les autorisations

---

## Étape 2 : Accéder à Autocrat

1. Menu → **Extensions → Autocrat → Open**
2. Le panneau Autocrat s'ouvre sur le côté droit

---

## Job 1 : Facture — Envoi

### Modèle Google Docs

Créez un document Google Docs intitulé **« Modèle Facture Accès Badminton »**.

Utilisez les balises `<<nom_colonne>>` pour insérer les données. Les noms de colonnes correspondent exactement aux en-têtes du Suivi de facturation.

Balises disponibles :

| Balise | Contenu |
|--------|---------|
| `<<No. Facture>>` | FACT-H2026-001 |
| `<<Nom complet (payeur)>>` | Nom du payeur |
| `<<Email (payeur)>>` | Courriel |
| `<<Session>>` | H2026 |
| `<<Adresse client>>` | Adresse complète |
| `<<Date facture>>` | Date de création |
| `<<Ligne 1 Description>>` | Premier article |
| `<<Ligne 1 Code article>>` | Code (AB-ADT-ADV) |
| `<<Ligne 1 Prix>>` | Prix |
| `<<Ligne 2 Description>>` ... `<<Ligne 9 Description>>` | Articles suivants |
| `<<Ligne 2 Code article>>` ... `<<Ligne 9 Code article>>` | Codes suivants |
| `<<Ligne 2 Prix>>` ... `<<Ligne 9 Prix>>` | Prix suivants |
| `<<Sous-total>>` | Total de la facture |
| `<<Joueurs inclus>>` | Noms (factures familiales) |

> **Conseil** : les lignes vides (programmes non utilisés) seront vides dans le PDF.
> Mettez les lignes 1-9 dans un tableau et masquez les lignes vides via la mise en page du document.

### Configuration Autocrat

1. Cliquez **+ New Job**
2. **Nom** : `Facture — Envoi`
3. **Template** : sélectionnez le modèle Google Docs créé ci-dessus
4. **Output** :
   - Format : **PDF**
   - Nom du fichier : `Facture <<No. Facture>>`
   - Dossier : sélectionnez votre dossier Google Drive de factures
5. **Merge condition** :
   - Colonne : `Statut`
   - Valeur : `Non généré`
6. **After merge — Update column** :
   - Colonne : `Statut` → valeur : `Envoyé`
   - Colonne : `Date envoyé` → valeur : `<<timestamp>>`
   - Colonne : `Lien PDF` → valeur : `<<file url>>`
7. **Email** :
   - To : `<<Email (payeur)>>`
   - Subject : `Facture <<No. Facture>> — Accès Badminton`
   - Body : (voir [template-facture.md](../technique/template-facture.md))
   - Attach PDF : **Oui**
8. **Trigger** : **Time-based** → toutes les heures

---

## Job 2 : Accusé de réception paiement

### Configuration Autocrat

1. Cliquez **+ New Job**
2. **Nom** : `Accusé réception paiement`
3. **Template** : aucun PDF nécessaire (courriel seulement)
4. **Merge condition** (2 conditions AND) :
   - `Statut` = `Payé`
   - `Reçu envoyé` = `Non`
5. **After merge — Update column** :
   - `Reçu envoyé` → `Oui`
6. **Email** :
   - To : `<<Email (payeur)>>`
   - Subject : `Confirmation de paiement — Facture <<No. Facture>>`
   - Body :

```
Bonjour <<Nom complet (payeur)>>,

Nous confirmons la réception de votre paiement de <<Sous-total>> pour la facture <<No. Facture>>.

Programme(s) : <<Programme(s)>>
Session : <<Session>>

Merci et au plaisir de vous voir sur le terrain!

Accès Badminton
https://accesbadminton.ca/
```

7. **Trigger** : **Time-based** → toutes les heures

---

## Job 3 : Notification de révision

### Onglet source : Notifications

### Configuration Autocrat

1. Cliquez **+ New Job**
2. **Nom** : `Notification de révision`
3. **Template** : aucun PDF nécessaire
4. **Merge condition** :
   - `Notification envoyée` = `Non`
5. **After merge — Update column** :
   - `Notification envoyée` → `Oui`
6. **Email** :
   - To : `<<Email>>`
   - Subject : `Résultat de votre inscription — Accès Badminton (<<Session>>)`
   - Body :

```
Bonjour <<Nom complet>>,

Voici le résultat de votre inscription pour la session <<Session>> :

<<Programme 1>> : <<Décision 1>>
<<Détail 1>>

<<Programme 2>> : <<Décision 2>>
<<Détail 2>>

<<Programme 3>> : <<Décision 3>>
<<Détail 3>>

Si vous avez été accepté(e), vous recevrez votre facture sous peu.
Si vous êtes sur la liste d'attente, nous vous contacterons si une place se libère.

Accès Badminton
https://accesbadminton.ca/
```

> **Note** : les lignes vides (Programme 2/3 non utilisés) seront vides.
> Autocrat n'a pas de logique conditionnelle — le joueur verra des lignes vides s'il n'a choisi qu'un programme. C'est acceptable.

7. **Trigger** : **Time-based** → toutes les heures

---

## Job 4 : Avis d'abandon

### Onglet source : Suivi de facturation

### Configuration Autocrat

1. Cliquez **+ New Job**
2. **Nom** : `Avis d'abandon`
3. **Template** : aucun PDF nécessaire
4. **Merge condition** (2 conditions AND) :
   - `Statut` = `Abandonné`
   - `Courriel abandon envoyé` = `Non`
5. **After merge — Update column** :
   - `Courriel abandon envoyé` → `Oui`
6. **Email** :
   - To : `<<Email (payeur)>>`
   - Subject : `Annulation de votre inscription — Accès Badminton`
   - Body :

```
Bonjour <<Nom complet (payeur)>>,

Nous vous confirmons l'annulation de votre inscription pour la session <<Session>>.

Programme(s) concerné(s) : <<Programme(s)>>

Si vous pensez qu'il s'agit d'une erreur ou si vous souhaitez vous réinscrire,
veuillez nous contacter à info@accesbadminton.ca.

Accès Badminton
https://accesbadminton.ca/
```

7. **Trigger** : **Time-based** → toutes les heures

---

## Job 5 : Note de crédit

### Onglet source : Notes de crédit

### Modèle Google Docs

Créez un document **« Modèle Note de Crédit Accès Badminton »**.

Balises disponibles :

| Balise | Contenu |
|--------|---------|
| `<<No. Note de crédit>>` | NC-H2026-001 |
| `<<No. Facture originale>>` | Facture de référence |
| `<<Nom complet>>` | Nom du joueur |
| `<<Date>>` | Date d'émission |
| `<<Ligne 1 Description>>` | Article remboursé |
| `<<Ligne 1 Montant>>` | Montant négatif |
| `<<Ligne 2 Description>>` / `<<Ligne 3 Description>>` | Autres articles |
| `<<Montant total remboursé>>` | Total du remboursement |
| `<<Solde restant>>` | Ce qui reste de la facture originale |
| `<<Raison>>` | Motif du remboursement |

### Configuration Autocrat

1. Cliquez **+ New Job**
2. **Nom** : `Note de crédit`
3. **Template** : sélectionnez le modèle ci-dessus
4. **Output** :
   - Format : **PDF**
   - Nom : `Note-credit <<No. Note de crédit>>`
   - Dossier : même dossier que les factures
5. **Merge condition** :
   - `Envoyée` = `Non`
6. **After merge — Update column** :
   - `Envoyée` → `Oui`
   - `Lien PDF` → `<<file url>>`
7. **Email** :
   - To : `<<Email>>`
   - Subject : `Note de crédit <<No. Note de crédit>> — Accès Badminton`
   - Body :

```
Bonjour <<Nom complet>>,

Veuillez trouver ci-joint la note de crédit <<No. Note de crédit>>
en référence à la facture <<No. Facture originale>>.

Montant remboursé : <<Montant total remboursé>>
Raison : <<Raison>>

Le remboursement sera effectué par le même moyen de paiement utilisé.

Accès Badminton
https://accesbadminton.ca/
```

8. **Trigger** : **Time-based** → toutes les heures

---

## Tester les jobs

### Test 1 : Facture

1. Soumettez une réponse test via le formulaire
2. Acceptez l'inscription → Finalisez → Générez la facture
3. Lancez Autocrat manuellement : **Extensions → Autocrat → Open → Run** (job Facture)
4. Vérifiez :
   - ✅ PDF reçu par courriel
   - ✅ Statut passé à `Envoyé`
   - ✅ Lien PDF dans la colonne M

### Test 2 : Accusé de réception

1. Changez le statut d'une facture à `Payé`, entrez la date
2. Run le job « Accusé réception »
3. ✅ Courriel reçu, `Reçu envoyé` = `Oui`

### Test 3 : Notification de révision

1. Créez une inscription test, acceptez, finalisez
2. Run le job « Notification de révision »
3. ✅ Courriel reçu avec le résumé des décisions

### Test 4 : Avis d'abandon

1. Marquez une facture comme `Abandonné`
2. Run le job « Avis d'abandon »
3. ✅ Courriel reçu, `Courriel abandon envoyé` = `Oui`

### Test 5 : Note de crédit

1. Émettez une note de crédit (sur une facture payée)
2. Run le job « Note de crédit »
3. ✅ PDF reçu, `Envoyée` = `Oui`

### Nettoyage

Supprimez les lignes de test dans tous les onglets.
Réinitialisez les compteurs dans Configuration si nécessaire.
