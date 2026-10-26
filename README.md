# SA Realty — Philippine Real Estate Portal

A property marketplace for buying, renting, pre-selling and foreclosed homes across the Philippines, in the spirit of Lamudi, Dot Property and Property Finder. Built with Next.js, Tailwind CSS and PostgreSQL/PostGIS.

![Homepage](docs/screenshots/ph/home-full.png)

*Homepage layout. This screenshot was taken offline, so the hero shows the illustrated fallback; with an internet connection it shows the photographs.*

## Features

**Homepage**
- Rotating hero of professional photographs (El Nido, BGC, Batad rice terraces, Mayon Volcano, Chocolate Hills) with crossfade, slow zoom, pause control and reduced-motion support
- Glass search box with Buy / Rent / Pre-selling / Foreclosed tabs, Philippine property types, peso price ranges and popular-location shortcuts
- Destination cards (Palawan, Metro Manila, Baguio, Bohol, Albay)
- Featured developer slider (empty slots until partnerships are signed)
- Listing cards with smart peso formatting (₱35,000/mo, ₱4.8M, ₱120M), ₱/sqm, floor and lot area in sqm, turnover dates, foreclosure badges, agent PRC/DHSUD numbers and Viber / WhatsApp / Inquire buttons

**Data model** (`prisma/schema.prisma`, 20 models) — see [docs/data-model.md](docs/data-model.md)
- Locations: Region → Province → City/Municipality → Barangay, plus districts such as BGC, Makati CBD and Ortigas Center
- Properties in PHP and sqm: sale, rent, pre-selling (turnover quarter/year, reservation fee, downpayment terms) and foreclosed (Pag-IBIG or bank, minimum bid, sale mode)
- Developers and projects with DHSUD License to Sell numbers
- Agents licensed under RESA (RA 9646): PRC licence for brokers, DHSUD accreditation and a supervising broker for salespersons
- Hero banners with photo credits, scheduling and location targeting
- Leads by channel (Viber, WhatsApp, inquiry, sample computation) with Data Privacy Act consent
- Financing programs (Pag-IBIG and bank) stored with their source, never hard-coded
- Database rules enforced with CHECK constraints and triggers (`prisma/sql/postgis.sql`)

## Tech stack

- **Next.js 16** (App Router, Server Components, Cache Components) and TypeScript
- **Tailwind CSS 4**, lucide-react icons, Motion for animation, self-hosted fonts
- **PostgreSQL + PostGIS** with **Prisma 6**
- Planned: Supabase (auth and storage), Typesense (search), MapLibre (maps)

## Getting started

Requires Node.js 20 or later.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open http://localhost:3000. The homepage runs on sample data, so no database is needed to try it.

### Setting up the database

```bash
# 1. Put your Postgres / Supabase connection strings in .env.local
# 2. Create the tables
npx prisma migrate dev --name init
# 3. Add PostGIS triggers, indexes and listing rules
npm run db:postgis
# 4. Load locations, amenities and hero banners
npx prisma db seed
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Lint |
| `npm run typecheck` | Generate route types and type-check |
| `npm run check:ph` | Test peso formatting, the location tree and the seed |
| `npm run db:postgis` | Apply PostGIS triggers, indexes and CHECK rules |

Every push and pull request runs type-checking, linting, the data checks and a production build on GitHub Actions (`.github/workflows/ci.yml`).

## Project structure

```
prisma/
  schema.prisma          Philippine data model
  sql/postgis.sql        PostGIS triggers, indexes and listing rules
  seed.ts                Locations, amenities and hero banners (no developers)
src/
  app/page.tsx           Homepage
  components/ph/         Hero, search box, scene photos, listing card, developer slider
  lib/ph/                Peso/sqm formatting, location tree, photos, sample listings
docs/data-model.md       Data model diagram and explanation
scripts/                 Data checks and placeholder image generator
```

## Project status

| Phase | Status |
| --- | --- |
| 1. Database schema and data model | Done |
| 2. Homepage, hero banner and search UI | Homepage done |
| 2. Search results, filter drawer, map view, property page | Next. These pages still show the original demo data |
| 3. Search API and Typesense integration | Planned |
| 4. Viber/WhatsApp lead tracking, Pag-IBIG and bank amortization calculator | Planned |

## Photo credits

Homepage photos are free to use under the [Unsplash License](https://unsplash.com/license):
[Jared Rice](https://unsplash.com/photos/Tm0XygW6gN8) (El Nido),
[Roman Lezhnin](https://unsplash.com/photos/Vb2eRgWU7rc) (El Nido),
[OJ Serrano](https://unsplash.com/photos/iacKpANQHNA) (BGC),
[Omri D. Cohen](https://unsplash.com/photos/pozDysoeJ9Y) (Batad),
[Camille San Vicente](https://unsplash.com/photos/Z5xHpUH9o8Y) (Mayon) and
[Zed Benson](https://unsplash.com/photos/tyMVaFXcksU) (Chocolate Hills).
Photos load from Unsplash's CDN; for production, copy them into your own storage.

Listing images are illustrated placeholders generated by `scripts/generate-placeholder-images.py`.
