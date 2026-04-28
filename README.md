# FlipDoc

Convert PDF files into shareable, interactive flipbooks. Admin portal protected by Google OAuth — public viewers need no login.

## Stack

- **Node.js + Express** — server
- **Prisma + PostgreSQL** — database
- **pdf2pic** — PDF → image conversion
- **StPageFlip** — flipbook page-turn UI
- **Passport.js** — Google OAuth
- **Railway** — hosting

---

## Local development

### Prerequisites
- Node.js 18+
- GraphicsMagick or ImageMagick (required by pdf2pic)
  - macOS: `brew install graphicsmagick`
  - Ubuntu/Debian: `sudo apt-get install graphicsmagick`

### Setup

```bash
# 1. Clone and install
git clone https://github.com/YOUR_USERNAME/flipbook-app.git
cd flipbook-app
npm install

# 2. Copy env file and fill in your values
cp .env.example .env

# 3. Push database schema
npx prisma db push

# 4. Start dev server
npm run dev
```

Open http://localhost:3000 — you'll be redirected to the admin login.

---

## Google OAuth setup

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a project → APIs & Services → Credentials
3. Create OAuth 2.0 Client ID (Web application)
4. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (dev)
   - `https://yourapp.up.railway.app/auth/google/callback` (production)
5. Copy Client ID and Secret into `.env`

---

## Deploy to Railway

1. Push your code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
3. Select your repo
4. Add a PostgreSQL database: New → Database → Add PostgreSQL
5. Set environment variables in Railway's Variables tab (copy from `.env.example`)
6. Set `APP_URL` to your Railway domain: `https://yourapp.up.railway.app`
7. Railway auto-deploys on every `git push` to main

### Run Prisma migrations on Railway

In Railway's project settings, add a "Start command" override for the first deploy:
```
npx prisma db push && node src/server.js
```
Then revert to `node src/server.js` for subsequent deploys (schema is already applied).

---

## Project structure

```
flipbook-app/
├── src/
│   ├── server.js              # Entry point
│   ├── middleware/
│   │   ├── passport.js        # Google OAuth strategy
│   │   └── requireAuth.js     # Admin route guard
│   ├── routes/
│   │   ├── auth.js            # /auth/* — login, callback, logout
│   │   ├── admin.js           # /admin/* — protected dashboard
│   │   └── viewer.js          # /v/:slug — public flipbook
│   ├── services/
│   │   └── pdfConverter.js    # PDF → PNG page images
│   └── views/
│       ├── auth/login.ejs
│       ├── admin/
│       │   ├── dashboard.ejs
│       │   ├── upload.ejs
│       │   └── flipbook.ejs
│       ├── viewer.ejs          # Public flipbook viewer
│       └── 404.ejs
├── public/
│   ├── css/
│   │   ├── admin.css
│   │   └── viewer.css
│   └── uploads/               # Generated page images (gitignored)
├── prisma/
│   └── schema.prisma
├── .env.example
└── package.json
```

---

## Adding more admins

Update `ADMIN_EMAILS` in your Railway environment variables:
```
ADMIN_EMAILS=alice@gmail.com,bob@company.com
```
No redeploy needed — Railway applies env changes on next restart.
