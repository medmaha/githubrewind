# GithubRewind

I built GithubRewind for fun: a small open source project for looking back at a year of GitHub activity. Give it a username and a year, and it turns the data GitHub makes available into stats, little activity stories, and an optional AI-written recap.

It is a personal project, not an official GitHub product. It is released under the [MIT License](LICENCE).

## What it does

- Summarizes a profile, repositories, commits, pull requests, issues, reviews, stars, languages, and activity streaks.
- Builds a contribution calendar and factual story chapters when a calendar is available.
- Generates an optional AI year-in-review, a PNG highlight card, and share captions.
- Saves your latest rewind in your browser so you can return to it after a reload.
- Includes a page where you can inspect and clear the data GithubRewind has saved in that browser.
- Uses a dark interface inspired by GitHub.

## Take a look around

After you run a rewind, the navigation links take you to:

| Page | What you will find |
| --- | --- |
| `/rewind` | Profile, activity totals, repositories, languages, and achievements |
| `/stories` | Chapters computed from the contribution calendar, with links back to GitHub |
| `/insights` | Optional AI recap, downloadable highlight card, and share captions |
| `/_data` | A view of the saved browser record and a control to clear it |

## Run it locally

You will need Node.js and pnpm. Clone the repository and install its dependencies:

```bash
git clone https://github.com/medmaha/githubrewind.git
cd githubrewind
pnpm install
```

Create `.env.local` in the project root:

```dotenv
# Required by the server-side Arcjet rate limiters
ARCJET_KEY="your-arcjet-key"

# Optional: enables AI year-in-review generation
GEMINI_API_KEY="your-gemini-api-key"

# Optional: lets the app make limited shared-token GitHub requests
INTERNAL_GITHUB_API_TOKEN="your-read-only-github-token"
```

Start the development server:

```bash
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

You can use your own fine-grained GitHub token in the form instead of configuring a shared token. It is useful for the full-year contribution calendar, higher GitHub API limits, and access to private repositories that belong to your account. Use a read-only token with the minimum access GitHub allows for the data you want to view.

## A note about the numbers

GitHub does not expose every kind of activity through one API. What GithubRewind can show depends on the selected year, the available GitHub endpoints, the token used, and GitHub contribution visibility settings.

- The full-year contribution calendar needs an authenticated GitHub request. Without it, the app falls back to the public events feed, which only covers roughly the last 90 days.
- Private contributions appear only when GitHub makes them visible in the profile contribution calendar. Private repository details are only fetched when the token belongs to the account being analyzed.
- Some totals use GitHub search results or public events and may not line up perfectly with the contribution calendar.
- Lines of code is a rough estimate based on repository size, not a count of lines changed during the selected year.
- Story chapters are calculated from calendar data. They describe patterns in the numbers; they do not explain why those patterns happened.
- AI insights are generated text and can be inaccurate. Give the recap a read before sharing it.

## Data and tokens

Rewind results and generated insights are stored in this browser's local storage. The saved-data page shows the record and can clear it. The GitHub token entered into the form stays in memory for the current browser session and is not persisted.

When you provide your own token, GitHub requests are made from your browser. Without one, rewind requests use the server action and the optional `INTERNAL_GITHUB_API_TOKEN`. The shared-token endpoint is limited to two requests per IP every five minutes by Arcjet. AI generation is also rate limited.

For AI insights, the app sends a compact summary of the rewind to Gemini from the server. The summary includes the username, counts, language percentages, top repository names, and topics; it does not include the GitHub token or raw event payloads.

## Built with

Next.js, React, TypeScript, Tailwind CSS, Zustand, GitHub REST and GraphQL APIs, Google's Generative AI SDK, and Arcjet.

## Scripts

| Command | Purpose |
| --- | --- |
| `pnpm dev` | Run the local development server |
| `pnpm build` | Create a production build |
| `pnpm start` | Serve a production build |
| `pnpm format` | Format the project with Prettier |
| `pnpm format:check` | Check formatting with Prettier |

## A note from me

This started as me having fun and building a little project. It grew as I kept adding things I wanted to see in my own year in code. If you find a bug, have an idea, or want to make it your own, issues and pull requests are welcome.

## Made By [Mahammed Touray](https://github.com/medmaha) - With 💖

Have fun with it.
