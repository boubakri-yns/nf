# Nexans - Gestion des Notes de Frais

Monorepo avec:
- `backend`: API Laravel 11 + Sanctum
- `frontend`: React 18 + TypeScript + Vite

## 1) Lancement recommande avec Docker

Depuis la racine du projet:

```bash
docker compose down -v
docker compose up -d --build
```

URLs:
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8001/api`
- MySQL: `127.0.0.1:3307`
- Mailpit: `http://localhost:8026`

Base de donnees Docker:
- host: `127.0.0.1`
- port: `3307`
- database: `nexans_expenses`
- user: `nexans`
- password: `nexans`

Le backend Docker applique automatiquement:
- installation Composer si necessaire
- creation de `APP_KEY`
- migrations + seed
- `storage:link`

Comptes seedes (mot de passe: `Password123!`):
- `admin.app@nf.com` (Admin)
- `rh.app@nf.com` (RH)
- `manager1.app@nf.com` (Manager)
- `manager2.app@nf.com` (Manager)
- `younesboubakri37@gmail.com` (Employe)
- `vaticanbaba@gmail.com` (Employe)
- `younesboubakripro@gmail.com` (Employe)
- `alikhat050@gmail.com` (Employe)

Si certains comptes ne se connectent plus, vous pouvez les restaurer sans reinitialiser toute la base:

```bash
cd backend
php artisan demo:restore-users
```

Avec Docker:

```bash
docker compose exec backend php artisan demo:restore-users
```

Arreter:

```bash
docker compose down
```

## 2) Installation backend hors Docker

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan storage:link
php artisan serve
```

API disponible sur `http://localhost:8000/api`.

## 3) Installation frontend hors Docker

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App web disponible sur `http://localhost:5173`.

## 4) Workflow metier implemente

1. Employe cree une note (`brouillon`)
2. Ajoute des lignes de depense (+ justificatif si obligatoire)
3. Soumet (`en_attente_responsable`)
4. Manager: approuve/refuse/demande correction
5. RH: valide puis marque `rembourse`

Chaque etape alimente `historique_approbations` et `notifications`.

## 5) Azure & SSL

- Fichier `backend/.env.azure.example` pour variables d'environnement Azure.
- Support disque Azure Blob via config `filesystems`.
- Forcage HTTPS en production dans `AppServiceProvider`.
- Workflow CI GitHub Actions: `.github/workflows/ci.yml`.

## 6) Endpoints principaux

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/notes-de-frais`
- `POST /api/notes-de-frais/{id}/soumettre`
- `POST /api/notes-de-frais/{id}/changer-statut`
- `POST /api/notes-de-frais/{id}/lignes`
- `GET /api/notifications`
- `GET /api/rapports/*` (RH)

## 7) Remarques

- Upload justificatifs: local (`storage/app/public/justificatifs`) ou Azure Blob.
- Email notifications: fallback automatique en log si SMTP indisponible.
