# What2Cook

A mobile-first household cooking assistant that helps you decide what to cook based on what's in your pantry.

## Features

- **Pantry management** — Search ingredients, add custom items, track quantities and expiry dates
- **Recipes** — Create recipes linked to ingredients with match-score badges
- **Smart dashboard** — "Cook now", "Almost there", and expiring-item suggestions
- **Meal planner** — Weekly calendar with dietary constraints (vegetarian days, etc.)
- **Grocery lists** — Auto-generated from meal plan minus pantry stock, grouped by category
- **Usage forecasting** — Estimates what you'll need based on cooking history
- **Expense tracking** — Upload receipts and track grocery spending by category
- **AI suggestions** — Optional OpenAI-powered meal inspiration
- **Dark/light mode** — System-aware theme toggle
- **PWA** — Install on your phone home screen

## Tech Stack

- Next.js 15 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui + next-themes
- PostgreSQL + Prisma
- Auth.js (NextAuth v5)
- Uploadthing (photos & receipts)
- OpenAI API (optional)

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Setup

1. Clone and install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Configure `.env`:

```
DATABASE_URL="postgresql://user:password@localhost:5432/what2cook"
AUTH_SECRET="run: openssl rand -base64 32"
UPLOADTHING_TOKEN="your-uploadthing-token"
OPENAI_API_KEY="optional-for-ai-suggestions"
```

4. Push database schema and seed default ingredients:

```bash
npm run db:push
npm run db:seed
```

5. Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create a household account, and start adding ingredients.

## Project Structure

```
src/
├── app/
│   ├── (app)/          # Authenticated pages (home, pantry, recipes, plan, more)
│   ├── (auth)/         # Login & register
│   └── api/            # REST API routes
├── components/         # UI components
└── lib/                # Business logic (matching, grocery gen, forecasting)
```

## Deployment

Deploy to Vercel with a Neon or Supabase PostgreSQL instance. Set all environment variables in your Vercel project settings.
