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
| Haute | Connexion sans limitation des essais | Compteur persistant et atomique : cinq tentatives par adresse sur quinze minutes, remise à zéro après succès, refus si le stockage est indisponible. Identités stockées sous HMAC. Sur Vercel, la base de données est donc nécessaire pour se connecter ; hors Vercel, le proxy doit normaliser `x-forwarded-for`. |
| Haute | Faux succès de suppression de document | Marquage `deletionPending`, suppression des fichiers privé et ancien public avant retrait des métadonnées. Échec HTTP 503 et bouton de reprise ; téléchargement via API refusé pendant l’attente. Test d’une panne disque simulée puis reprise. Un ancien lien public peut rester accessible tant que le stockage refuse la suppression. |
| Moyenne | Recherche non synchronisée avec l’URL | Le formulaire est recréé quand les paramètres changent ; les filtres sont conservés à la soumission. Test navigation interne depuis l’en-tête, changement de requête et retour arrière. Labels des filtres reliés à leurs champs. |
| Moyenne | Requêtes IA non bornées | JSON limité à 32 Ko réels, message à 8 000 caractères, une à trois tâches uniques, dix unités par minute et identifiant, délai fournisseur de 45 secondes sans retry automatique. Réponses 400/429/502/503 adaptées et erreurs assainies ; échec initial détecté avant HTTP 200, interruption du flux propagée. Tests sans clé fournisseur et sans appel payant. |

Catherine ROBIN : le jeu source local contient bien Michel ROBIN et Martine GIRON, une seule fois chacun. Le bug de fusion ci-dessus reproduit exactement le type de duplication de la capture. Les identifiants des liens de la base de production n’ont pas été lus : cette cause reste à confirmer sur ses données actuelles. Aucune fiche n’a été supprimée pour masquer le problème.

## Hydratation React corrigée et limites de vérification

Le défaut #418 a été reproduit en build de production sur plusieurs pages. Déplacer le conteneur HTML ou isoler le composant de suivi n’a pas suffi. Le layout racine est désormais synchrone ; la lecture asynchrone de session et le cadre applicatif sont contenus dans une frontière `Suspense` explicite. Aucun avertissement n’est masqué et le rendu serveur est conservé. Le doublon d’identifiant DOM `main-content` dans le canevas de l’arbre a aussi été supprimé.

Après cette correction, trois passages successifs sur les 17 routes du smoke test, plus les parcours fonctionnels, passent sans erreur navigateur. Cela vérifie les cas reproduits, sans garantir l’absence de tout défaut intermittent dans d’autres environnements.

La migration privée des documents, les photos publiques et le décalage du commit Vercel sont détaillés dans `reliability-and-ux.md`. La restauration globale de l’archive/GEDCOM n’est pas automatique ; l’interface restaure des fiches historiques et récupère les fichiers.

## Vérifications

- 33 tests unitaires/intégration passent : droits, stockage concurrent, fusions, restauration, GEDCOM, recherche, confidentialité des portraits, dates et CSV.
- Build de production réussi ; TypeScript validé par le build. Lint ciblé des fichiers d’audit réussi.
- Nouveaux tests navigateur : filtres conservés, navigation depuis l’en-tête et retour arrière ; suppression disque en panne (503), téléchargement suspendu (410), reprise (200), document absent (404) ; requêtes IA malformées (400), fournisseur non configuré (502), quota (429), lecteur interdit (403) ; cinq mauvais mots de passe puis refus de la tentative suivante. Comptes et données synthétiques exclusivement.
- Lint global : 19 erreurs et 18 avertissements (notamment typages `any`, effets React et texte JSX). Ce sont des défauts de qualité de code, pas 37 bugs fonctionnels prouvés.
- Parcours `test:experience` : navigation mobile, personne de référence, onglets, sources, export, édition, fusion simple, fusion par lot, restauration, lecteur et déconnexion : PASS, aucune erreur navigateur sur ce parcours.
- Parcours étendu `test:reliability` : portrait manuel, obsolescence, récupération d’une fiche sans perte des autres, export des octets d’un document, relecture de l’archive et contrôles des droits exécutés. Les 18 routes ci-dessous répondent HTTP 200, sans débordement horizontal ; le contrôle final d’absence d’erreur navigateur passe après la correction de session (trois passages, soit 51 chargements de routes).
- Routes parcourues : `/`, `/admin`, `/admin/privacy`, `/anomalies`, `/tree`, `/map`, `/network`, `/anniversaires`, `/relation`, `/timeline`, `/stats`, `/doublons`, `/feedback`, `/feedback/new`, `/person/new`, `/admin/geocode`, `/admin/feedback`, plus fiches/historique/recherche dans le parcours principal. La boucle de smoke test contient 17 routes ; les parcours couvrent aussi `/history`, `/search` et `/person/[id]`.
- Recherches d’archives simulées avant tout appel serveur ; tuiles cartographiques et services externes bloqués volontairement dans les tests locaux ; qualité de leurs réponses, vraies migrations Blob et génération IA restent à vérifier dans un environnement configuré.
