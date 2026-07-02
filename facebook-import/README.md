# Facebook → paulospoetry.com Poem Importer

Pulls posts from Paulos' Facebook profile
(https://www.facebook.com/paulos.ioannou.16), decides which ones are poems,
detects whether each is Greek or English, extracts a title, and adds them to
the site. Imported poems behave exactly like hand-entered ones — admins can
edit or delete them in **Poem Management**.

**Safe by default:** running the importer without `--apply` changes nothing —
it prints exactly what it *would* import and why each post was accepted or
skipped, plus a full `import-report.json` for review.

---

## The honest constraints (read this first)

Facebook heavily restricts reading **personal profiles** via its API:

- An app can only read the posts of **its own users** — i.e. Paulos must log
  into *our* app once and grant the `user_posts` permission. Nobody can pull
  posts from a profile that hasn't granted access (that's a good thing).
- While the app is in **Development Mode** (which is free and permanent for
  private tools like this), only accounts with a **role on the app**
  (Admin / Developer / Tester) can grant permissions. So Paulos' Facebook
  account needs to be added as a Tester — he accepts one invite, once.
- No App Review, no business verification, and **no cost** — the free tier is
  all this needs. Rate limits are far beyond what one profile requires.

If the Graph API path is ever unavailable (Meta changes rules frequently),
the importer also reads Facebook's official **"Download Your Information"**
export file — that always works and is also free (see Plan B below).

---

## Plan A — Meta app + Graph API (one-time setup, ~15 minutes)

1. **Create the app** (you can do this from your own Facebook account):
   - Go to https://developers.facebook.com → *My Apps* → **Create App**.
   - Use case: select **Other** → app type **Consumer** (or "None"). Name it
     e.g. `Paulos Poetry Importer`. No products need to be added.
   - Leave the app in **Development Mode** (default). Do not publish it.

2. **Give Paulos' account a role**:
   - App dashboard → *App Roles* → *Roles* → **Add Testers** → enter his
     Facebook name/profile.
   - Paulos accepts the invite at
     https://developers.facebook.com/settings/developer/requests/
   - (If Paulos creates the app himself under his own account, skip this step.)

3. **Get an access token** (this is the value the importer needs):
   - Open the Graph API Explorer: https://developers.facebook.com/tools/explorer
   - Top-right: select the app you created.
   - Click **Generate Access Token** — log in **as Paulos** when prompted.
   - Under *Permissions*, add `user_posts` (keep `public_profile`), then
     generate again and approve the dialog.
   - Copy the token.

4. **(Optional but recommended) extend the token to ~60 days** — the Explorer
   token expires in about an hour. In the Explorer address bar run:
   ```
   GET /oauth/access_token?grant_type=fb_exchange_token&client_id=APP_ID&client_secret=APP_SECRET&fb_exchange_token=PASTE_SHORT_TOKEN
   ```
   (App ID and App Secret are on the app dashboard under Settings → Basic.)
   Use the returned long-lived token instead.

5. **Configure and run**:
   ```powershell
   cd facebook-import
   copy .env.example .env     # then edit .env and paste the token
   node import-poems.cjs      # DRY RUN — prints what would be imported
   node import-poems.cjs --apply   # actually import (needs admin login in .env)
   ```

Re-running is always safe: anything already on the site (same title or same
text) is skipped automatically.

## Plan B — "Download Your Information" export (no app needed)

1. On Facebook (logged in as Paulos): *Settings* → *Your information* →
   **Download your information** → select only **Posts**, format **JSON**,
   media quality low (text is all we need). Facebook emails a download link.
2. Unzip and find `your_posts_1.json` (or similar).
3. Run:
   ```powershell
   node import-poems.cjs --source export --file path\to\your_posts_1.json
   node import-poems.cjs --source export --file path\to\your_posts_1.json --apply
   ```

## How posts are judged

| Step | How |
|---|---|
| Is it a poem? | Structural heuristics: at least 4 short lines, short average line length (verse shape), no links, mostly letters, sane total length. Every skip is logged with its reason. |
| Greek or English? | Dominant script — counts Greek characters (including polytonic) vs Latin. |
| Title | The first line, when it's short (≤ 60 chars) and followed by more text — quotes/« » stripped. Untitled poems get their opening words as a title. |
| Duplicates | Skipped if the site already has a poem with the same title or identical text (works across re-runs and against the originally migrated poems). |
| Import | Inserted with the Facebook post's original date, in the detected language, with the site's standard "no translation yet" placeholder for the other language. Admins can edit/delete in Poem Management. |

The final decision is always yours: the dry run lists every accept/skip
before anything touches the site.

## Tests

```powershell
node classify.test.cjs
```

Runs the classifier against Greek/English poems, Greek prose, link shares,
greetings, and untitled poems.
