# MataQUEST

Here is a list of Links to use to test the program (NOTE: THESE ONLY WORK WHILE THE SERVER IS ACTIVE IN VS CODE / there also is a link testing that):

http://localhost:3001/ — sanity check that the server's alive

http://localhost:3001/api/v1/courses — list of the two fake courses

http://localhost:3001/api/v1/courses/101/assignments — assignments for COMP 380

http://localhost:3001/api/v1/courses/102/assignments — assignments for MATH 210

http://localhost:3001/api/v1/users/self — the fake logged-in student

http://localhost:3001/api/xp/101 — calculated XP/trophies for COMP 380

http://localhost:3001/api/xp/102 — calculated XP/trophies for MATH 210



http://localhost:3001/api/protected/ping - testing for a Logged-In User

http://localhost:3001/auth/mock-login  - logs in a user

---

## Editing the mock data

We're staying on mock data, so the mock assignments now live in
**`mockAssignments.json`** (course-keyed: `{ "101": [...], "102": [...] }`)
instead of being hardcoded in `server.js`. `server.js` reads this file fresh
on every request, so **edits show up on a browser refresh — no server restart
needed.**

Edit it with the interactive tool instead of hand-editing JSON:

```
npm run edit
```

Menu options: `[l] list  [a] add  [e] edit  [d] delete  [s] save  [q] quit`.
It auto-assigns unique ids, validates dates/numbers, and writes a
`mockAssignments.json.bak` backup each time it saves. To edit a different
file: `node mockEditor.js path/to/file.json`.

Note: the `courses` list (course names/codes) is still defined at the top of
`server.js`. The editor manages the *assignments* inside each course; to add a
brand-new course with a display name, add it to that `courses` array too.

## Canvas API Integration Layer

**Status: prepped but NOT active.** The server still serves mock data only.
Nothing about how the app currently runs has changed.

### Files

- **`canvasClient.js`** — the real Canvas REST API client. Every live network
  call is tagged with a `// CANVAS API CALL` comment. Written in CommonJS with
  axios to match the rest of the project, and reads `CANVAS_DOMAIN` /
  `CANVAS_CLIENT_ID` / `CANVAS_CLIENT_SECRET` from the same `.env` that
  `auth.js` already uses.
- **`canvasSample.json`** — realistic *raw* Canvas API payloads (correct field
  names and nesting), used for testing without a developer key.
- **`testCanvasNormalizer.js`** — proves the integration works offline.
  Run it with `npm test`.

### The part that actually links the two halves

Real Canvas doesn't return the same field names our mock data uses. Mock
assignments look like this:

```js
{ id, name, points_possible, due_at,
  has_submitted_submissions: true, submission_grade: 10 }
```

Real Canvas nests submission info instead:

```js
{ id, name, points_possible, due_at,
  submission: { workflow_state: "graded", score: 10,
                submitted_at: "2026-07-14T18:22:00Z" } }
```

`normalizeAssignment()` in `canvasClient.js` flattens the real shape into the
mock shape. **That means `xpCalculator.js` runs on live Canvas data with zero
changes to it.** `npm test` demonstrates this end to end, including the edge
cases (never submitted, turned in but not graded yet, submitted late).

### Switching to live data later

When we have a real developer key, the swap is a few lines in `server.js` —
the full before/after is written out at the bottom of `canvasClient.js`.
The XP route and `xpCalculator.js` don't need to change at all.

### One issue this turned up (for whoever owns xpCalculator.js)

The on-time bonus is applied to *everything*, including late submissions.
`calculateCourseXP` calls `calculateAssignmentXP(a)` without the second
argument, so `submittedAt` defaults to null, the `if (due_at && submittedAt)`
branch never runs, and `onTime` stays `true`.

One-line fix in `xpCalculator.js`:

```js
// before
...calculateAssignmentXP(a)
// after
...calculateAssignmentXP(a, a.submitted_at)
```

The mock data has no `submitted_at` field at all, which is why this never
showed up — but the normalizer supplies it on every assignment, so the fix
works as soon as it's applied. Left alone for now since that file isn't mine
to change.