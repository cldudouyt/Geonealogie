# Fiabilité et expérience familiale

Branche préparée depuis `4a215fd`.

- `/admin` affiche les métadonnées Vercel du déploiement exécuté (branche, commit, environnement).
- Accueil : recherche directe et reprise de l’exploration prioritaire ; dispositions mobiles conservées.
- Portraits : édition/validation contributeur, détection de changement de fiche ou sources, contrôle concurrent, faits visibles. Aucun nom de proche ni note libre transmis au modèle ; génération bloquée sans décès renseigné. Les portraits existants sans empreinte sont à revoir.
- `/anomalies` : filtres personne/priorité, sources structurées manquantes, correction et accès direct à Sources. Une alerte reste une piste à vérifier.
- `/history` : filtre personne, récupération d’une version ancienne sans écraser les autres fiches. Une fusion ou un changement de liens bloque la restauration individuelle ; les confirmations périmées sont refusées.
- Sauvegarde v2 créée dans le navigateur : GEDCOM, overrides/historique, portraits, métadonnées, documents et photos accessibles, avec SHA-256 des fichiers. Échec explicite si un média manque ou si les données changent pendant l’export. Maximum 100 Mo de médias. Les suggestions et caches ne sont pas inclus. L’inspection permet de récupérer le GEDCOM et les fichiers ; le remplacement global du GEDCOM déployé reste une opération administrateur distincte.

## Migration privée

`/admin/privacy` affiche les documents publics et les suppressions en attente. Une action copie le document, relit et compare les octets privés, bascule la référence avec contrôle concurrent, puis supprime l’ancien Blob public. Une suppression échouée est reprise sans recopier le fichier. Les documents locaux/externe nécessitent une intervention manuelle. Les photos de profil ne sont pas migrées par ce parcours.

Si l’ancien magasin Blob est public, connecter un magasin privé et renseigner `BLOB_PRIVATE_READ_WRITE_TOKEN`. Conserver `BLOB_READ_WRITE_TOKEN` pour lire/supprimer les anciens Blobs publics et pour les photos. Les nouveaux uploads documents et leur lecture utilisent le token privé en priorité. Aucun secret ne doit être ajouté au dépôt. Une migration de production doit être effectuée depuis la page après déploiement ; elle n’a pas été exécutée lors du développement.

## Vérification du déploiement

Vercel indique la production `dpl_EaL5joWpBCbPd7e6DQDJkWaeaSDB` READY, alias `geonealogie.vercel.app`, source CLI, commit `1af49c17fdbe6a248c747c47121e166f059e6293`. GitHub et `git fetch` exposent master à `4a215fd7ad19711462ca06ad2068d943d42eb4c9` ; le commit CLI est introuvable via GitHub. Avant promotion, publier/récupérer cette révision et intégrer notamment les changements de fournisseur IA pour éviter leur régression. Ne pas remplacer la production depuis cette branche sans cette réconciliation.

## Vérification locale

`npm test`, `npm run typecheck`, `npm run build`.

`QA_CHROMIUM=/chemin/vers/chromium node tests/reliability-experience.mjs` teste sur données isolées : recherche mobile, portrait manuel, invalidation, sources, restauration individuelle, export et relecture des octets d’un document, administration et interdiction au lecteur.
