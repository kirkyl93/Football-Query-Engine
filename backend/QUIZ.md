# Daily Quiz

## Shared backend

Set `QUIZ_OWNER_SECRET` as a backend secret. Generate it as 32 random bytes
in hexadecimal:

```powershell
node -p "require('node:crypto').randomBytes(32).toString('hex')"
```

Set `JEV_API_KEY` as a backend secret to score quiz drafts. The model defaults
to `jev-latest` and can be changed with `JEV_MODEL`.

Quiz master sign-in issues a distinct, expiring browser session. The server
checks that session before previewing, scoring, or scheduling. This initial
version keeps the session and current draft in one backend process. Use a
single backend instance or keep owner requests on the same replica.

## Publish from search

Visit `/admin`, sign in, then run a search. Click **Make daily quiz** above
the results. Enter the question and UK publication date. The quiz goes live
at 06:00 Europe/London on that date, when the previous quiz moves to the archive.

1. **Preview quiz** runs the search and groups qualifying rows by player.
   The quiz master decides how many answers are appropriate. A quiz must
   have at least one correct player.
2. **Score answers** sends one request to Jev for all distinct players. A
   successful response is reused for the draft. The scoring rule ranks the
   effective ratings from easiest to hardest, adds each player’s best search
   rank, then awards consecutive point values in ascending combined order, starting at 16. Ties favor the
   better search rank, then preview order.
3. Enter an override from 0 to 4 or clear it to restore Jev’s rating. Click
   **Recalculate points** to apply edits across the draft without calling Jev.
4. **Schedule quiz** saves each original Jev rating as `difficulty`, any
   manual rating as `difficulty_override`, and the awarded `points`.

The public game reads the saved snapshot. It awards the saved points for a
correct guess and deducts three points for each distinct incorrect guess.
A hint for an unguessed player costs five points immediately. Each clue
can be purchased once per player per attempt, up to the player’s point value.
Guests can view a quiz’s leaderboard after finishing it and can opt in with a display name.
