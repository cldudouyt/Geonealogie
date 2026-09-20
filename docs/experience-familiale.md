# Expérience familiale : fonctionnement et mise en service

## Parcours

L’accueil donne la priorité au choix d’une personne de référence. Ce choix et la dernière exploration sont mémorisés sur l’appareil, dans le navigateur. Ils ne constituent pas une identité vérifiée et ne modifient aucun droit d’accès.

Sur téléphone, la navigation propose Accueil, Arbre, Recherche et Plus. Les outils d’administration sont réservés aux administrateurs. La palette vert/crème est conservée ; les polices sont servies avec l’application. L’arbre propose un plein écran, des réglages repliables et un aperçu de personne utilisable au clavier.

Les fiches comportent Vie, Famille, Lieux et Sources. Une référence peut être associée à un événement, un lien d’archives ou un document existant, avec une certitude déclarée par le contributeur. Ces références ne sont pas vérifiées automatiquement. Les sources ajoutées sont reprises dans l’export GEDCOM.

## Accès

`AUTH_PASSWORD` reste le mot de passe de l’administration familiale. `AUTH_SECRET` doit être défini dans l’hébergement. Les anciennes sessions sont invalidées par le nouveau format ; une reconnexion est nécessaire.

Pour donner des accès distincts, ajouter `AUTH_USERS_JSON` aux variables d’environnement de l’hébergement :

```json
[
  { "name": "Prénom du proche", "role": "reader", "password": "REMPLACER_PAR_UN_SECRET_UNIQUE" },
  { "name": "Prénom du contributeur", "role": "contributor", "password": "REMPLACER_PAR_UN_AUTRE_SECRET_UNIQUE" }
]
```

Chaque secret doit être différent. Ne pas mettre les valeurs réelles dans Git. Les accès sont configurés par l’exploitant ; cette version n’ajoute pas de gestion de comptes en libre-service.

| Rôle | Possibilités |
| --- | --- |
| `reader` | Consulter les personnes et documents, explorer, rechercher, exporter le GEDCOM. |
| `contributor` | Droits du lecteur, ajout et modification des fiches, sources, documents et suggestions. |
| `admin` | Droits du contributeur, doublons, diagnostics, géocodage et historique/restauration. |

La session est signée, expire après 30 jours et devient invalide si le secret, le nom ou le rôle de l’accès change. Les routes de diagnostic ne sont plus publiques. Les fichiers déjà téléversés dans un stockage Blob public conservent leurs URL publiques : une migration des médias vers un stockage privé n’est pas incluse.

## Sauvegardes et concurrence

Les écritures Postgres utilisent un contrôle de version : la modification est réappliquée à l’état récent si une autre instance a écrit entre-temps. Une fiche ouverte avant une modification concurrente ne peut pas écraser silencieusement cette dernière. Les erreurs de base ne déclenchent plus de sauvegarde de secours dans un fichier éphémère.

La colonne `kv_state.version` est ajoutée automatiquement à la première utilisation. Le compte Postgres doit pouvoir exécuter cet `ALTER TABLE`, comme les créations de tables déjà présentes dans le projet. Conserver une sauvegarde de la base avant la première mise en service.

En développement sans base, le fichier est écrit atomiquement sous verrou. `GEO_DATA_DIR` permet de choisir un répertoire local, notamment pour les tests. Sur Vercel, une écriture sans base configurée échoue explicitement.

L’historique contient les opérations sur les fiches, les sources et les fusions, avec leur auteur et l’état précédent. La dernière opération peut être annulée ; si une autre contribution arrive entre l’ouverture et la confirmation, la restauration est refusée. Les médias ne sont pas déplacés lors d’une fusion : leur rattachement suit les identifiants fusionnés et se rétablit à l’annulation.

Le téléchargement JSON depuis l’historique contient le GEDCOM original, les modifications, l’historique et les métadonnées des documents. **Les fichiers binaires des médias ne sont pas inclus** : les sauvegarder séparément auprès de l’hébergeur. Ce JSON est une sauvegarde technique, sans écran de réimport dans cette version.

## Vérifications

```sh
npm ci
npm test
npm run typecheck
npm run build
npx playwright install chromium
npm run test:experience
```

Le test de parcours démarre une instance locale de la version compilée et utilise un répertoire temporaire. Il ajoute uniquement des personnes fictives à sa copie des données. Il vérifie les accès, l’accueil mobile, le choix de référence, les onglets, les sources, l’export, l’édition, la fusion et l’annulation.

Les tests de stockage couvrent les écritures parallèles, le rejet d’un formulaire périmé, l’annulation, les conflits de version et les pannes. Le test du contrôle de version utilise un adaptateur simulé ; il ne remplace pas un test sur l’instance Neon de production.
