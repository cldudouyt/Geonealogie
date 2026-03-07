# Guide de déploiement — Géonéalogie

## Prérequis

- [Node.js](https://nodejs.org/) v20+
- [Docker](https://www.docker.com/) et Docker Compose (pour Neo4j)
- Un fichier GEDCOM (ex : `Dudouyt Heredis 2014-Export.ged`)

---

## Déploiement en local

### 1. Installer les dépendances

```bash
npm install
```

### 2. Lancer Neo4j via Docker

```bash
docker compose up -d
```

Neo4j sera accessible sur :
- Interface web : http://localhost:7474
- Protocole Bolt : `bolt://localhost:7687`
- Identifiants par défaut : `neo4j` / `genealogy2024`

### 3. Configurer les variables d'environnement

Créer un fichier `.env.local` à la racine du projet :

```env
# Neo4j (valeurs par défaut du docker-compose)
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=genealogy2024

# Secret pour l'authentification (chaîne aléatoire longue)
AUTH_SECRET=une-chaine-secrete-tres-longue-et-aleatoire

# Vercel Blob (optionnel, pour le stockage de documents/avatars)
BLOB_READ_WRITE_TOKEN=votre_token_vercel_blob
```

> `AUTH_SECRET` est obligatoire. Il sert à signer les sessions. Utilisez une chaîne aléatoire d'au moins 32 caractères.

### 4. Importer les données GEDCOM dans Neo4j

```bash
npx tsx scripts/import-gedcom.ts
```

Ce script lit le fichier `.ged` à la racine et peuple la base Neo4j (personnes, relations, index).

### 5. Lancer le serveur de développement

```bash
npm run dev
```

L'application est disponible sur : http://localhost:3000

---

## Déploiement en production (Vercel)

L'application est configurée pour être déployée sur [Vercel](https://vercel.com).

### 1. Préparer une instance Neo4j accessible

En production, Neo4j doit être hébergé sur un serveur accessible depuis Vercel. Options recommandées :

- **[Neo4j Aura](https://neo4j.com/cloud/aura/)** : service cloud managé de Neo4j (offre gratuite disponible)
- **VPS/serveur dédié** : installer Neo4j et l'exposer via le port Bolt (7687)

### 2. Déployer sur Vercel

#### Via la CLI Vercel

```bash
npm install -g vercel
vercel login
vercel --prod
```

#### Via l'interface web Vercel

1. Connecter le dépôt GitHub sur [vercel.com](https://vercel.com)
2. Vercel détecte automatiquement le projet Next.js
3. Configurer les variables d'environnement (voir section suivante)
4. Cliquer sur **Deploy**

### 3. Configurer les variables d'environnement sur Vercel

Dans **Project → Settings → Environment Variables**, ajouter :

| Variable | Description | Exemple |
|---|---|---|
| `NEO4J_URI` | URI Bolt de votre instance Neo4j | `neo4j+s://xxxxxxxx.databases.neo4j.io` |
| `NEO4J_USER` | Utilisateur Neo4j | `neo4j` |
| `NEO4J_PASSWORD` | Mot de passe Neo4j | `MotDePasseSecurise` |
| `AUTH_SECRET` | Secret de session (≥32 chars) | `une-chaine-aleatoire-secrete` |
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob (si utilisé) | `vercel_blob_rw_...` |

> Pour Neo4j Aura, l'URI est au format `neo4j+s://...` (avec TLS).

### 4. Importer les données GEDCOM en production

Le script d'import se connecte à Neo4j via les variables d'environnement. Pour importer en production :

```bash
NEO4J_URI=neo4j+s://votre-instance.neo4j.io \
NEO4J_USER=neo4j \
NEO4J_PASSWORD=MotDePasseSecurise \
npx tsx scripts/import-gedcom.ts
```

### 5. (Optionnel) Migrer les overrides vers Neo4j

Si vous avez un fichier `data/overrides.json` existant :

```bash
npm run migrate:overrides
```

---

## Résumé des commandes

| Commande | Description |
|---|---|
| `docker compose up -d` | Démarre Neo4j en local |
| `npm run dev` | Lance le serveur de dev (port 3000) |
| `npm run build` | Compile l'application pour la prod |
| `npm run start` | Lance le serveur de prod (après build) |
| `npx tsx scripts/import-gedcom.ts` | Importe le fichier GEDCOM dans Neo4j |
| `npm run migrate:overrides` | Migre les overrides JSON vers Neo4j |
| `npm run lint` | Vérifie le code avec ESLint |
