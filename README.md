# GitHub Activity Rewind

GitHub Rewind turns a year of GitHub activity into a visual review of commits, pull requests, issues, reviews, repositories, languages, achievements, and activity patterns. It can also generate an AI-written year-in-review and a shareable highlight card.

## Features

- Analyze a GitHub username for a selected year
- Use public GitHub data without signing in
- Optionally provide a read-only fine-grained GitHub token to include private repositories
- Generate factual AI insights with Google Gemini
- Create and share a developer highlight card
- Collect product feedback when PostgreSQL is configured
- Rate-limited and bot-protected with Arcjet

## Screenshots
<img width="1209" height="583" alt="Screenshot 2026-09-07 121223" src="https://github.com/user-attachments/assets/475d2451-2c02-4142-92f3-b75344ee1160" />

## Stack

- Next.js and React
- TypeScript
- Tailwind CSS
- Zustand
- Google Gemini
- GitHub REST API
- Drizzle ORM with Neon PostgreSQL + (For Feedbacks)
- Arcjet

## Getting Started

### Prerequisites

- Node.js 20 or newer
- pnpm
- An Arcjet project and API key
- A Google Gemini API key
- PostgreSQL only if you want to store feedback

### Installation

```bash
git clone https://github.com/mahammed-toures/github-activity-rewind.git
cd github-activity-rewind
pnpm install
```

Create `.env.local` in the project root:

```dotenv
ARCJET_KEY="your-arcjet-key"
GEMINI_API_KEY="your-gemini-api-key"
# Optional: enables feedback persistence
DATABASE_URL="postgresql://user:password@host:5432/database?sslmode=require"
```

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

| Variable         | Required | Purpose                                                          |
| ---------------- | -------- | ---------------------------------------------------------------- |
| `ARCJET_KEY`     | Yes      | Enables Arcjet rate limiting and bot protection.                 |
| `GEMINI_API_KEY` | Yes      | Enables AI-generated year-in-review insights.                    |
| `DATABASE_URL`   | No       | PostgreSQL connection string used to store feedback submissions. |

The GitHub token is not a server environment variable. Users can optionally enter a read-only fine-grained token in the app when they want private repository data included. It is used for the request only and kept in memory.

Never commit `.env.local` or share API keys, database credentials, GitHub tokens, or deployment tokens. If a credential is exposed, revoke or rotate it immediately.

## Feedback Database

Feedback persistence is optional. When `DATABASE_URL` is not configured, the main GitHub rewind experience and AI insights can still be used, but feedback submissions cannot be stored.

The app expects a PostgreSQL table named `feedbacks` with this shape:

```sql
CREATE TABLE feedbacks (
  id serial PRIMARY KEY NOT NULL,
  author varchar(100) NOT NULL,
  subject varchar(100) NOT NULL,
  content varchar(500) NOT NULL,
  device_hash varchar(500),
  rating integer DEFAULT 3,
  created_at timestamp DEFAULT now() NOT NULL
);
```

The schema is defined in [`lib/db/schema.ts`](lib/db/schema.ts). Apply the equivalent SQL to your database before enabling feedback persistence.

## Production Build

```bash
pnpm build
pnpm start
```

For Vercel or another hosting provider, configure the same environment variables in the project settings. Keep `DATABASE_URL` unset if feedback storage is not needed.

## Contributing

Contributions are welcome. Please open an issue to discuss a substantial change before submitting a pull request. Keep changes focused, use TypeScript conventions already present in the project, and verify the production build with `pnpm build`.

## License

This project is open source under the [MIT License](LICENCE).

## Made With 💖

By [Mahammed Touray](github.com/medmaha)
