# Modèle de notification de révision — Autocrat Job #3

> Ce fichier montre le contenu du courriel envoyé par Autocrat
> après que l'opérateur a finalisé la révision d'une soumission.

---

## Courriel (configuré directement dans Autocrat, pas de Google Docs)

**Objet** : `Résultat de votre inscription — Accès Badminton (<<Session>>)`

**Corps** :

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

Pour toute question : info@accesbadminton.ca

Accès Badminton
https://accesbadminton.ca/
```

## Balises disponibles (onglet Notifications)

| Balise | Contenu |
|--------|---------|
| `<<Nom complet>>` | Nom du joueur |
| `<<Email>>` | Courriel |
| `<<Session>>` | H2026 |
| `<<Programme 1>>` | Premier programme |
| `<<Décision 1>>` | Accepté / En attente / Refusé |
| `<<Détail 1>>` | « Facture à suivre » ou raison |
| `<<Programme 2>>` ... `<<Programme 3>>` | Programmes suivants |
| `<<Décision 2>>` ... `<<Décision 3>>` | Décisions suivantes |
| `<<Détail 2>>` ... `<<Détail 3>>` | Détails suivants |
| `<<Type>>` | « Révision initiale » ou « Mise à jour » |

> Les programmes non utilisés (2, 3) seront vides. Le joueur verra des lignes vides — c'est acceptable.
