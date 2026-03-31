# Documentation interne — Accès Badminton

Bienvenue dans la documentation du système de facturation Accès Badminton V2.0.

!!! info "Ce site est strictement à usage interne"
    Il n'est pas référencé publiquement. Seuls les administrateurs et opérateurs y ont accès.

---

## Par où commencer ?

<div class="grid cards" markdown>

-   :material-rocket-launch:{ .lg .middle } **Première utilisation ?**

    ---

    Suivez le guide d'installation pour mettre en place le système.

    [:octicons-arrow-right-24: Installation initiale](configuration/deploiement.md)

-   :material-book-open-variant:{ .lg .middle } **Utilisation courante**

    ---

    Le guide complet pour gérer les inscriptions et factures au quotidien.

    [:octicons-arrow-right-24: Guide de l'opérateur](operateur/index.md)

-   :material-cog:{ .lg .middle } **Configurer Autocrat**

    ---

    Paramétrage des 5 jobs de courriel et PDF automatiques.

    [:octicons-arrow-right-24: Configuration Autocrat](configuration/autocrat.md)

-   :material-chart-box:{ .lg .middle } **Architecture technique**

    ---

    Comprendre comment le système fonctionne en coulisse.

    [:octicons-arrow-right-24: Architecture V2.0](technique/architecture.md)

</div>

---

## Le système en un coup d'œil

| Composant | Rôle |
|-----------|------|
| **Google Forms** | Inscription des joueurs |
| **Google Sheets** (8 onglets) | Base de données et interface admin |
| **Google Apps Script** (10 fichiers) | Automatisation de la logique |
| **Autocrat** (5 jobs) | Génération PDF + envoi de courriels |
| **Google Drive** | Stockage des factures PDF |

**Coût total : 0 $** — fonctionne entièrement dans Google Workspace pour OBNL.
