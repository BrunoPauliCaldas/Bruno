# OMNI TONE Content Planner

A shared Instagram content-planning calendar for the OMNI TONE social team.
One page, no accounts: everyone with access to the link works on the same board.
The board link is the access key, so it is not written down here.

## What it does

- Rolling calendar, Monday to Sunday, the current week plus the next five.
  "4 earlier weeks" scrolls back into the past, "4 later weeks" extends forward.
- Each card holds a Type (which show), an Owner, a Status and an optional note.
  The card's fill is its type's tint (chosen per type under "Edit lists"). The strip on the
  card's left edge is its status: Idea (grey), WIP (yellow), Review (violet), Scheduled (green).
  Click the status to move one step forward, Shift+click to move back.
- Cards drag between days and the Backlog. On touch screens, drag from the dotted grip
  on the card's left edge; tapping the card body opens it for editing.
- "Stamp" on a week row inserts the standard set: Sensory reel (Anouk), Story post (Bruno),
  Process carousel (Anouk), and CTA post + The Record (Bruno) in even ISO weeks or
  Process reel (Michael) in odd weeks. All start as Idea on suggested days.
- "Edit lists" changes the Type and Owner lists and shows archived cards (restore or delete).
- Archive a card from its editor; a toast offers Undo.

## Where the data lives

The page is published as a claude.ai artifact and uses its shared database (`db` capability).
Data model:

- `cards/<id>`: `{type, owner, status, note, date | null, order, archived, createdAt, updatedAt}`
- `settings/lists`: `{types: [...], owners: [...], typeColors: {type: tintKey}}`

Writes are last-writer-wins per card. Every open browser receives changes live.
Nothing is kept in localStorage.

Access: viewers must be signed in to claude.ai and have been given access to the artifact from its
Share menu. Contributor or Editor access is needed to change cards; Viewer access is read-only.

## Brand font and build

The page is set in OMNI TONE Grotesk Medium, licensed to OMNI TONE GmbH. The font file is not
committed (see `.gitignore`). To build the page for publishing, place `OMNITONEGrotesk-Medium.woff2`
next to `index.html` and run:

    python3 build.py dist/index.html

`build.py` inlines the font as a data URI; publish the file it writes. Without the font file the page
falls back to Helvetica Neue / Arial.

## Local preview

Open `index.html` (or the built copy) directly from disk (file://) or on localhost. Without the artifact runtime the
page runs against an in-memory store and shows "Local preview": nothing is saved.
`clickthrough.js` in this folder drives every control in a headless browser; pass a file path to test a built copy.

Times are computed in Europe/Zurich; weeks start on Monday.
