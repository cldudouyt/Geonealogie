# Audit de bugs — 22 septembre 2026

Périmètre : code de `feat/reliability-and-ux`, basé sur master `4a215fd`, tests isolés et navigateur mobile 390 × 844. Cet audit ne garantit pas l’absence d’autres bugs. Il n’a modifié aucune donnée familiale de production.

## Anomalies corrigées dans la branche

| Priorité | Bug | Preuve et correction |
| --- | --- | --- |
| Haute | Parents/enfants affichés plusieurs fois après une fusion | Deux tests reproduisaient respectivement `[I1,I2,I2]` et un enfant retourné deux fois. Les listes de liens réciproques sont maintenant dédupliquées par identifiant après remplacement. L’annulation conserve les personnes distinctes. |
| Haute | Filtres avancés ignorés quand une recherche textuelle est saisie | `/api/persons?q=…` retournait avant les filtres sexe, dates, profession et lieu. Application cumulée des filtres, conservation du classement textuel ; test API sur nom + sexe + année. Suppression de la limite préalable de 500 résultats. |
| Moyenne | Pagination négative ou invalide acceptée | Valeurs négatives/NaN et intervalles de naissance inversés désormais rejetés avec HTTP 400. |
| Moyenne | Réponses de recherche obsolètes | Recherche principale, archives et autocomplétion pouvaient remplacer des résultats récents par une ancienne réponse. Numérotation des requêtes pour ignorer les réponses périmées. Vérification du statut HTTP en autocomplétion. |
| Moyenne | Dates invalides/approximatives interprétées comme exactes | Un mois inconnu produisait `1900-undefined`, les années < 1000 perdaient leurs zéros, le calendrier acceptait notamment le 31 avril et les bornes BEF/ABT. Validation calendaire et exclusion des dates non exactes des événements récurrents. Tests des années bissextiles et des bornes. |
| Moyenne | Export CSV : formules et retours chariot | Les valeurs commençant par un opérateur de formule sont neutralisées ; les retours chariot sont échappés. Tests des cellules CSV. |

Catherine ROBIN : le jeu source local contient bien Michel ROBIN et Martine GIRON, une seule fois chacun. Le bug de fusion ci-dessus reproduit exactement le type de duplication de la capture. Les identifiants des liens de la base de production n’ont pas été lus : cette cause reste à confirmer sur ses données actuelles. Aucune fiche n’a été supprimée pour masquer le problème.

## Anomalies et risques restant ouverts

| Priorité | Constat | Évidence / suite |
| --- | --- | --- |
| Haute | Hydratation React intermittente | Le parcours étendu a capturé React #418 sur `/person/qa-person`, `/relation`, `/person/new`. Ces pages chargent et restent utilisables, mais React reconstruit leur rendu. Le parcours historique complet passe sans erreur : la panne dépend donc du parcours/timing. Cause non isolée ; ne pas considérer ce point résolu. |
| Haute | Aucune limitation applicative des essais de connexion | `src/app/login/actions.ts` appelle directement `authenticate`. Prévoir une limitation persistante des tentatives. Une protection Vercel externe éventuelle n’a pas été auditée. Aucun essai d’attaque exécuté. |
| Haute | Suppression d’un document annoncée réussie malgré un échec stockage | `deleteFromStorage` absorbe les erreurs ; la route DELETE retire d’abord les métadonnées puis renvoie `ok:true`. Peut laisser un ancien fichier public accessible. Prévoir un statut de suppression à reprendre et un retour d’erreur fiable. Constat par lecture, aucun fichier réel supprimé. |
| Moyenne | Changement d’URL de recherche sans resynchronisation | L’effet initial de `/search` ne s’exécute qu’au montage. Une navigation interne vers un nouveau `?q=` peut laisser les anciennes saisies/résultats. Corriger la synchronisation URL/filtres sans effacer les filtres au submit ; à reproduire dans un test ciblé. |
| Moyenne | API IA générale sans bornes applicatives ni gestion complète des erreurs | `/api/ai` accepte une liste de tâches sans taille maximale ; JSON invalide/échec fournisseur non traités proprement. Accès limité aux contributeurs par middleware, mais coût/erreurs possibles. Aucun appel IA payant réalisé. |

La migration privée des documents, les photos publiques et le décalage du commit Vercel sont détaillés dans `reliability-and-ux.md`. La restauration globale de l’archive/GEDCOM n’est pas automatique ; l’interface restaure des fiches historiques et récupère les fichiers.

## Vérifications

- 29 tests unitaires/intégration passent : droits, stockage concurrent, fusions, restauration, GEDCOM, recherche, confidentialité des portraits, dates et CSV.
- Build de production réussi ; TypeScript validé par le build. Lint ciblé des fichiers d’audit réussi.
- Lint global : 19 erreurs et 18 avertissements (notamment typages `any`, effets React et texte JSX). Ce sont des défauts de qualité de code, pas 37 bugs fonctionnels prouvés.
- Parcours `test:experience` : navigation mobile, personne de référence, onglets, sources, export, édition, fusion simple, fusion par lot, restauration, lecteur et déconnexion : PASS, aucune erreur navigateur sur ce parcours.
- Parcours étendu `test:reliability` : portrait manuel, obsolescence, récupération d’une fiche sans perte des autres, export des octets d’un document, relecture de l’archive et contrôles des droits exécutés. Les 18 routes ci-dessous répondent HTTP 200, sans débordement horizontal ; le test échoue volontairement à son contrôle final à cause des erreurs React #418.
- Routes parcourues : `/`, `/admin`, `/admin/privacy`, `/anomalies`, `/tree`, `/map`, `/network`, `/anniversaires`, `/relation`, `/timeline`, `/stats`, `/doublons`, `/feedback`, `/feedback/new`, `/person/new`, `/admin/geocode`, `/admin/feedback`, plus fiches/historique/recherche dans le parcours principal. La boucle de smoke test contient 17 routes ; les parcours couvrent aussi `/history`, `/search` et `/person/[id]`.
- Tuiles cartographiques et services externes bloqués volontairement dans les tests locaux ; qualité de leurs réponses, vraies migrations Blob et génération IA restent à vérifier dans un environnement configuré.
