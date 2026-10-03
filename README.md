# 🏆 LeetSquad

A playful leaderboard for you and your friends: LeetCode, Codeforces and GitHub activity, private squads with
invite codes, configurable challenges, contest ratings, and a log for everything else you work on.

Zero build step. Runs two ways from the same code:

| | Local (default) | Hosted |
|---|---|---|
| Web + API | `npm start` (Node ≥ 22.13) | Vercel (static site + one serverless function) |
| Database | SQLite file in `./data` | [Turso](https://turso.tech) (hosted SQLite, free tier) |
| Background sync | built into the server, every 10 min | GitHub Actions, every ~10 min |

## Run locally
```bash
npm start            # http://127.0.0.1:3000
npm run backup       # snapshot data/ (also automatic daily, last 14 kept)
```
Listens on localhost only. `HOST=0.0.0.0` exposes it on your network. Copy `.env.example` to `.env` for options.

## Deploy (Vercel + Turso + GitHub Actions — all free tiers)

### 1. Database (Turso)
```bash
brew install tursodatabase/tap/turso
turso auth signup                      # or: turso auth login
turso db create leetsquad --location bom   # Mumbai; keep it matching "regions" in vercel.json (bom1)
turso db show leetsquad --url          # -> TURSO_DATABASE_URL  (libsql://...)
turso db tokens create leetsquad       # -> TURSO_AUTH_TOKEN
```
Copy your existing local data into it (safe to re-run):
```bash
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npm run migrate
```
Fresh start instead? Skip the migrate step; the tables are created automatically.

### 2. The encryption key
LeetCode session cookies are stored encrypted. Hosted mode needs the same key you use locally:
```bash
cat data/secret.key        # 64 hex characters -> SECRET_KEY_HEX
```
No local data? Generate one: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
**Back this value up** — without it the stored cookies can't be read and people must sign in again.

### 3. GitHub
Create a public repo and push (`.env`, `data/` and keys are git-ignored):
```bash
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### 4. Vercel
Import the repo at vercel.com/new (framework: *Other*; no build command). Add environment variables:

| Variable | Value |
|---|---|
| `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` | from step 1 |
| `SECRET_KEY_HEX` | from step 2 |
| `TZ_NAME` | e.g. `Asia/Kolkata` (day boundary; default UTC) |
| `CLIST_USERNAME`, `CLIST_API_KEY` | optional, problem ratings from clist.by |
| `ADMIN_USERS` | optional, comma-separated LeetCode usernames allowed to moderate the forum |

### 5. GitHub Actions (the background worker)
Repo → Settings → Secrets and variables → Actions. Add **secrets** `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`,
`SECRET_KEY_HEX`, `CLIST_USERNAME`, `CLIST_API_KEY`, and a **variable** `TZ_NAME`. Then open the *Actions* tab,
enable workflows, and run **sync** once by hand (*Run workflow*) to check it goes green. After that it runs by itself
about every 10 minutes (GitHub may delay scheduled runs by a few minutes at busy times).

### 6. Recommended: wake the worker on demand
GitHub's `schedule` trigger is best-effort and can run late — on a new repo the first scheduled runs may not start for
an hour or more. Without this step a new sign-up shows "Waiting in line…" until one happens. With it, the site starts the
worker itself whenever someone signs up, hits **Refresh**, or views data that is over 15 minutes stale. Add to Vercel: `GH_REPO` = `you/repo` and `GH_DISPATCH_TOKEN` = a fine-grained GitHub token for that repo
with *Actions: Read and write*.

### Things to know
- **Region:** the Vercel function is pinned to Mumbai (`bom1` in `vercel.json`) so it sits next to a Mumbai Turso database. If you pick a different database region, change `regions` to the nearest Vercel region.
- **LeetCode from the cloud:** LeetCode sometimes blocks datacenter IPs. If sign-in or sync fails from Vercel/Actions with
  403s, that's the cause (it works from home connections). Check the first *sync* run's log.
- **Vercel Hobby** is for non-commercial use. Scheduled GitHub workflows pause after 60 days without repo activity —
  push any commit or re-enable under the Actions tab.
- **Backups:** Turso has point-in-time restore. Locally, daily snapshots land in `data/backups/`.
- Everyone stays signed in across visits: sign-in tokens live in the database for 90 days.

## How it works
- **LeetCode** — verified by session cookie; full history, contest rating, topics, difficulty.
- **Codeforces** — link a handle: rating, contests, every submission. Problem ratings map to Easy/Medium/Hard.
- **GitHub** — link a username: contribution calendar, recent events, active repos (calendar is read from GitHub's
  HTML, which can change).
- **Scoring** — per solved problem by rating when known (≤1200 → 1 … >2700 → 10), else Easy/Medium/Hard ≈ 1/3/6.
  **Overall** = LeetCode + Codeforces points; GitHub has its own tab. Ratings come from clist.by when configured
  (create a free account, copy the key from <https://clist.by/api/v4/doc/>); Codeforces falls back to its own API.
- **Forum** (`/forum`) — anyone can read; posting, replying and liking need a signed-in (LeetCode-verified) account.
  Post types: Doubt (the asker can accept one reply as the answer), Progress, Feedback, Discussion; optional topic tags and a
  related link; replies, likes, search, sorting, and ```code blocks```. Authors edit/delete their own content.
  Spam limits: 10 posts / 40 replies / 150 likes per account per hour.
  - **Squad discussion** — every squad has a *Discussion* tab, visible to members only (non-members get a plain "not found"
    and squad posts never appear in the public forum). The squad owner moderates it.
  - **Challenge threads** — start a thread from any challenge page; it lives in the squad discussion, tagged with the challenge.
  - **Public forum moderation** — set `ADMIN_USERS=name1,name2` (Vercel env var, or `.env` locally) to let those accounts
    delete anything in the *public* forum. Site admins have no special access to private squads.
  - Deleting your account removes your posts and replies; deleting a squad removes its discussion.
- **Notifications** (bell in the nav, `/notifications`) — replies to your posts, replies in threads you joined, accepted
  answers, likes, new squad posts, challenge threads and new challenges. Opening a post or a squad's Discussion tab marks
  its notifications read; unread counts show on the bell and on each squad. The badge refreshes about once a minute
  (no live push). Old notifications are pruned after 60 days.
- **Squads** — a leaderboard, challenges and discussion for a group of friends. The **Squads** page is a directory:
  search by name, tagline, about text or topic; filter by join policy and topic; sort by members, activity, newest or A–Z.
  - **Squad card** — the owner writes a tagline, *about*, *who it's for*, rules, up to 5 topics and picks a colour. Clicking a
    squad in the directory opens its card with the right join button.
  - **Join policies** (owner's choice, in the squad's *Settings* tab): **Open** (join instantly), **By request** (the owner
    approves or declines; declined people can ask again after 3 days) or **Invite only**. Squads only appear in the directory
    if the owner **lists** them — unlisted squads are invite-only and invisible to outsiders. An invite code always works,
    whatever the policy. Existing squads start unlisted and invite-only.
  - Owners are notified of requests and new members; requesters are told the outcome.
  - **Challenges** — total problems, minimum Easy/Medium/Hard, topics, platforms and dates.
- Codeforces/GitHub handles are **not verified** as belonging to whoever links them.

Env vars: see `.env.example`.
