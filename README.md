# SDEVS MESSENGER

A self-hosted clan messenger with accounts, owner role, real-time Socket.IO chat, image/file uploads, emoji UI, and username changes.

## Run

1. Install Node.js 18+.
2. Copy `.env.example` to `.env`.
3. Set a strong `JWT_SECRET`.
4. `npm install`
5. `npm start`
6. Open `http://localhost:3000`.

The default seeded owner credentials are `OWNER` / `kenjibns`. Change `OWNER_PASSWORD` in `.env` before exposing the server publicly.

## Uploads

The example permits files up to 500MB. For 100MB+ uploads, also configure your reverse proxy/hosting platform to allow the same or larger request body size. Uploaded files are stored on disk in `data/uploads`.

## Production notes

Use HTTPS, a strong JWT secret, backups, antivirus/content scanning, storage quotas, and a reverse proxy. For serious public deployment, move uploads to object storage (S3/R2/etc.) and keep private files behind authorization instead of serving the upload directory directly.
