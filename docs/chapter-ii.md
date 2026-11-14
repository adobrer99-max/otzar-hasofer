# Chapter II — Descent into Galus

**Status: a design for approval. Nothing here is built.**

Decisions made by the owner (14 November):

1. The chapter has two parts. **Part One** is the descent of the same Tree,
   walked down, laying the letters down — as designed in §2–§3 below, kept.
2. **Part Two** is the ground below Malchut, Galus, and it is a different kind
   of game: a **run-and-gun, traditional platformer**.
3. The Scribe is a **fallen archangel**. Part Two is his punishment: he is made
   to live through the **future catastrophes of the Jewish people**. He still
   does not know what he did.
4. **The player finds out at the end**: he is the archangel who let the
   adversary into the Garden of Eden.
5. Chapter II opens after any sealed crown or kindled Tree. A first ascent gone
   out in peace does not open it.
6. Design comes before code.

Everything else is proposal.

---

## 1. The premise

Chapter I opens on one unanswered sentence: *you were the scribe of the crown,
and you were cast down to the kingdom without being told what for.* The climb
is the walk back up to ask, and it ends at the crown with a plea.

Chapter II is what the plea gets. Not an answer — a sentence. He is sent down
again, further than before: back through the Tree, giving up the alphabet road
by road, and out through the floor of the kingdom into **Galus**, exile, where
he is made to stand inside what is going to happen to the people whose world
he was set over. One catastrophe after another, in order, none of which he can
stop. He is not told why this is his to witness.

The last place he is taken is the first: a garden, and a gate he was set to
keep. The chapter ends when he — and the player — sees who opened it.

So the two chapters are one question asked twice. Chapter I asks *what for?*
and is refused. Chapter II shows him everything that followed from it before
it shows him the thing itself.

**A note on the source, so it is not mistaken for one.** The Torah posts
cherubim at Eden only *after* the expulsion. Pirkei de-Rabbi Eliezer has
Samael come down and ride the serpent, with no keeper at the gate. A story in
which the garden's own guardians let the adversary in is told in Islamic
tradition, of the serpent and the peacock. An *archangel* who allowed it is
this game's own midrash, and the document should not pretend otherwise. The
owner's spelling, *Sheytan*, is kept; whether the adversary is named Samael,
the Satan, or left unnamed is open question 6.

# Part One — the descent of the Tree

## 2. The loop, in one paragraph

The Scribe begins at **Keter**, holding the letters a sealed climb carried
there. Every path walked **downward lays its own letter down** — the letter
that path pays in Chapter I is the letter it takes in Chapter II — and it stays
on that road. At each Sefirah the Scribe may **draw down its light** to carry
into Galus. The ground is built, as always, from what is in the hand, so each
letter laid down makes the next road smaller, barer, and harder to cross with
what is left. The descent ends at **Malchut**, where what was carried down is
counted and the floor of the kingdom opens.

## 3. The rules

### 3.1 What the Scribe starts with

A descent is begun **from a page of the Book**: one sealed crown or kindled
climb. It starts with exactly the letters that climb sealed with, at Keter,
with three lamps and no light. A climb that reached the crown on nine letters
makes a short, hard descent; a kindled Tree with all twenty-two makes a long,
rich one. Each page may be descended once.

*Why from a page:* it gives every Chapter I ending a second use, it makes the
hand a consequence rather than a setting, and it needs no new economy.

### 3.2 Laying a letter down

- Walking a path from its upper end to its lower end lays down that path's
  letter, on arrival. If the Scribe does not hold it, the path is walked for
  nothing and takes nothing.
- A letter laid down is gone for the rest of the descent. Its verb or grace
  stops working at once.
- Walking **upward** is allowed and lays nothing down. It gives nothing back
  either: a letter is not picked up twice.
- **Peh** is laid down like any other, on its own path. Without the Mouth the
  Houses fall silent again — which is how Chapter I began.

The shortest way down is three paths (Keter → Tiferet → Yesod → Malchut) and
costs three letters. The longest touches every Sefirah. Which letters to keep
for the last roads is the whole of the route-planning, and it is the mirror of
Chapter I's question of which to gather first.

### 3.3 The ground shrinks with the hand

This needs no new machinery. `buildPath` already builds a road for the letters
held: `earnedRung` caps a road's storeys, length and demand band by the hand,
the chunk filter admits only screens whose verbs are held, and a Word-Gate is
only ever built from roots the hand can spell. A Scribe who has laid down
fifteen letters walks small, plain ground that asks for none of them.

The rung rules already follow the direction walked, so every road down is
under the rule of the place it leads to: the road into Hod relights lamps, the
road into Netzach has cold shrines, and so on. Nothing to add.

What *does* change on the way down:

- **Light is scarcer.** Chapter I's economy pays a well-lettered hand more for
  the same ground. The descent inverts that for free.
- **The klipot do not shrink with the hand.** A rung's creatures come from the
  path's upper end. A Scribe with seven letters meets Tiferet's creatures on
  the way out of Tiferet with a seven-letter hand. This is the chapter's
  difficulty curve and it will need measuring (§6).

### 3.4 Drawing down the light

At each Sefirah the map offers one act where Chapter I offered kindling:
**draw down its light.** It costs light gathered on the roads (a price per
Sefirah, falling as the Tree is descended, the inverse of `kindleCost`), and
it is what the descent is graded on. Nothing else in Chapter II is bought.

Guardians: the Sefirot were freed in the climb that this descent is begun
from, so no guardian holds them. The arenas are not part of the way down.
(Open question 2.)

### 3.5 Going out

Three lamps, as ever. When the last goes out the Scribe wakes at the highest
Sefirah whose light has been drawn down — the same rule as `afterFalling`,
read off a different list — with the light in hand gone. **Letters already
laid down stay laid down.** A fall can never return a letter, so a descent
always ends; it only ends poorer.

### 3.6 The ending

Arriving at Malchut ends the descent on the map, as standing at the crown ends
a climb. The plate counts two things:

- **how many of the ten lights were brought to the kingdom**, and
- **how many letters are still in the hand.**

and names the ending by the first, as the plea is named by its witnesses:

| Lights brought down | Ending |
|---|---|
| none | *You came down empty* — the road is made and nothing was sent along it |
| one to six | *Some of it reached the kingdom* |
| seven to nine | *The kingdom is lit from above* |
| all ten | *The whole Tree is brought down* |

Whatever the count, the floor opens: the sentence is not escaped by doing the
descent well. What the count changes is **what he has with him in Galus**
(§4.3). The Book gets a second kind of page, facing the climb it descended
from.


# Part Two — Galus

## 4. What it is

A **run-and-gun**: stages that scroll one way, enemies that come in waves, a
weapon held down rather than aimed and placed, a great thing at the end of each
stage. It is deliberately a different game from the Tree. The Tree is routes,
letters as keys, rooms that seal and rules that ask for restraint. Galus has no
map and no choices of road. He is not navigating. He is being taken through.

### 4.1 The stages

Each stage is one catastrophe, in the order they happened, and the last is the
first. This list is a **proposal for the owner to cut, reorder or replace** —
it is the most consequential content decision in the chapter (open question 1).

| # | Stage | What it is |
|---|---|---|
| 1 | **Mitzrayim** | The bondage in Egypt and the decree against the sons |
| 2 | **Bavel** | The First Temple burned, the ninth of Av, the road to Babylon |
| 3 | **Edom** | The Second Temple burned, the ninth of Av, Jerusalem ploughed |
| 4 | **Betar** | The last fortress falls, the ninth of Av |
| 5 | **Ashkenaz, 4856** | The Rhineland communities, the First Crusade |
| 6 | **Sefarad, 5252** | The expulsion from Spain, the ships |
| 7 | **Tach v'Tat** | The massacres of 1648–49 |
| 8 | **The Shoah** | See §4.5 — proposed as a stage in which the weapon does not fire |
| 9 | **Gan Eden** | The gate. No enemies. The reveal. |

The ninth of Av recurs because it does: the tradition itself reads these as one
day arriving again. That is the chapter's structure handed to it.

### 4.2 Who is fought, and what cannot be changed

Two rules, proposed as the ones that keep this from being either a revenge
fantasy or a trivialisation. Both are open to the owner (open question 2).

- **What he shoots are klipot, never people.** The game already has a language
  for this and Chapter I spent a whole phase on it: the husks that hold light
  captive. In Galus they are what feeds on each catastrophe. The human beings
  in a stage — those who suffer and those who do it — are part of the ground:
  seen, never targets, never scored.
- **Nothing he does prevents it.** Every stage ends with the event happening.
  The Temple burns whether or not the stage was played well. That is what makes
  it a punishment rather than a mission: he is made to be there, armed, and it
  is not enough.

So what is the playing *for*? Something small and true, which the tradition
supplies: when Rabbi Chanina ben Teradion was burned wrapped in a Torah scroll,
he said *the parchment is burning, and the letters are flying up* (Avodah Zarah
18a). **In every stage, letters fly up out of what burns, and he can catch
them.** He cannot save the scroll. He can bring the letters out.

### 4.3 The letters come back as the weapon

This is what joins the two parts. In Part One he lays the alphabet down. In
Part Two it returns to his hand, out of the fire, one stage at a time — and in
a run-and-gun a letter is not a key to a door, it is **a way the mark flies**.

Chapter I already built this table and barely used it: Zayin carries the mark
through the first husk into the second, Shin makes it worth two, Vav draws
instead of pushing, and the vessels add homing, splitting, arcing, lingering,
returning (`markPowers` in `src/game/combat.ts`). In Galus those are the
weapon pickups of the genre: a letter caught is a firing mode gained, held
until a lamp is lost.

What Part One sends down with him:

- **Letters still in hand at Malchut** are what he starts Galus firing with.
  A descent that kept Shin starts with the flame.
- **Lights drawn down** are his lamps beyond the three — the genre's lives.
  A descent that brought nothing down enters Galus on three lamps and a bare
  mark, which is a hard game and an honest one.

### 4.4 How it plays, against what exists

| The genre needs | Today | The work |
|---|---|---|
| Fire held down, fast | One mark per press, a fifteen-tick cooldown | A Galus firing rate; `strike` held |
| Aiming on the run | Flat, or tilted by holding up or down | Eight directions, and firing while moving and airborne |
| Waves that arrive | Klipot placed at build time, standing in rooms | Spawners: creatures that enter from the edges on a script |
| A stage that scrolls | Rooms on a grid, sealed and unsealed | One long flat room per stage, no seals, a camera that only goes forward |
| A great thing at the end | Ten guardian arenas, already built and measured | One per stage, in the same arena machinery |
| Weapon pickups | Letters found in alcoves, on plates | Letters in the air, taken by touch, no plate |
| Lives | Three lamps; a fall wakes you elsewhere | Lamps as lives; a lamp lost restarts from a checkpoint in the stage |
| Authored stages | Ground assembled per seed from a chunk library | Stages laid from **authored** chunk sequences per era, the same chunk format, not drawn by seed |

Nothing in that table needs a new engine. It needs a second *mode* of the one
there is — a Galus world that the step treats differently in about six named
places, the way an arena is treated differently now — and it needs new ground,
new creatures and new measured bands, which is where the real cost is.

### 4.5 The Shoah

This needs its own decision and should not be settled by default (open
question 3). The proposal:

**It is a stage, and in it the mark does not fire.** He walks through. The
strike key does nothing; the one voice the game has always had — the world's
line of text at the foot of the screen — is silent. There are no klipot to
break, no letters in the air, no great thing at the end. It is short. It is
the only stage with no score. The run-and-gun stops being one, on purpose, at
the one place where playing it as one would be obscene.

The alternatives are to leave it out, which the list's own logic makes a loud
omission, or to end the catastrophes at stage 7 and go from there to Eden. Any
of the three is defensible. Building it as an ordinary stage is the one option
this document recommends against.

### 4.6 Gan Eden — the reveal

The last stage has no enemies. It is a garden, walked left to right, and at
the end of it a gate.

The proposal for how the player finds out, without a paragraph telling them:
**the gate has his mark on it.** The same Tav he has been setting on shrines
since the second rung of Chapter I — *where you wake* — is on the inside of
the gate of Eden, set there before the first page of the game. The shrine's
own line, which the player has read a hundred times, is said once more:
*Your mark is set here.* Then the telling, in the paced plates the prologue
uses, says the rest: he was set to keep the gate; something asked to come in;
he opened it.

Whether anything is *done* after the reveal — an act of return, a gate shut
too late, a choice — or whether the chapter ends on the knowing, is open
question 4. The Book's last page should say what Chapter I's plea was really
asking, now that it can be read.

## 5. What is reused, and what is new

**Part One reuses everything**: the Tree, `buildPath`, the chunk library,
every rung rule, every creature, the map, the HUD, the Book. Its new parts are
small (a `chapter` on the record, "lay down" and "draw down" on the map, an
ending plate, a Book page) and its cost is proof, not building (§6).

**Part Two reuses the engine and little of the content**: the step, the body,
the lamps, the mark and its powers, the arena machinery, the renderer, the
audio. Its new parts are large:

- a Galus mode in the step (firing, aiming, spawners, forward camera,
  checkpoints);
- eight or nine stages of authored ground, each needing its own chunks;
- creatures for each era, and a great thing for each stage;
- the letters-in-the-air pickup;
- the Eden stage and the telling;
- **the words.** Every stage names a real event. The text for each should be
  written or approved by the owner, sourced, and read by someone other than
  the person who wrote it before it ships.

## 6. What has to be proved

**Part One** — unchanged from the first draft, and still first:

1. *No soft-lock with a shrinking hand.* The mirror of `route.test.ts`: a way
   out on every path walked downward, holding what any descending route has
   left.
2. *It can be finished.* A descent probe from Keter to Malchut, short road and
   long, as a share of seeds.
3. *The curve is a curve.* The last roads are not a wall for a bare hand, and a
   descent pays enough light to draw down more than none.

**Part Two** — a new set of instruments, because none of the existing bands
describe a scrolling stage:

4. *Every stage can be finished on three lamps and a bare mark*, by a probe
   that holds fire and runs — the worst entry Part One can produce.
5. *Every stage can be failed.* The naive-probe rule from Chapter I: a stage a
   body can walk through without firing is not a stage.
6. *A letter caught changes the number.* Each firing mode measurably shortens
   or eases the stage it is found in, or it is decoration.

## 7. The roadmap

Each slice ends green and is a place to stop. Part One ships on its own.

| Slice | What it is | Risk |
|---|---|---|
| **C2-0** | The descent record: `chapter`, begun from a Book page at Keter with that page's letters. Pure rules and tests. | low |
| **C2-1** | Laying down: walking a path downward removes its letter. The no-soft-lock proof over descending routes. | **Part One's main risk** |
| **C2-2** | The descent probe, short road and long. First numbers. | **may send Part One back** |
| **C2-3** | Part One's surfaces: Threshold offer, map wording, "draw down", HUD. First playable descent. | low |
| **C2-4** | Part One's ending: the plate, the Book's facing page, the floor of the kingdom opening onto a stage that is not there yet. | low |
| **G-0** | **The engine spike.** A Galus world mode: held fire, eight-way aim, a spawner, a forward camera, a checkpoint — on one flat test stage with existing klipot. Answers whether the engine carries the genre. | **Part Two's main risk** |
| **G-1** | One real stage, end to end — proposed: **Bavel** — with its ground, creatures, great thing, letters in the air, and its three proofs. The vertical slice everything else is costed from. | high |
| **G-2…** | The remaining stages, one per slice, in order. | per stage |
| **G-E** | Gan Eden and the telling. | low to build, high to write |
| **G-Z** | The Shoah stage, in whatever form the owner decides. Last, so it is made by people who have made all the others. | — |

A blunt estimate: Part One is about the size of the rung-rule work. Part Two
is about the size of Chapter I's creatures and arenas phases together, per two
or three stages.

## 8. Open questions for the owner

1. **Which catastrophes, and in what order?** The table in §4.1 is a proposal.
2. **Klipot only, and nothing prevented** (§4.2) — are these the two rules?
3. **The Shoah** (§4.5): a stage where the weapon does not fire, left out, or
   the list ended before it?
4. **After the reveal** (§4.6): does the chapter end on the knowing, or is
   there an act?
5. **Part One, still open from the first draft**: one descent per Book page;
   no guardians on the way down; a descent does not touch later climbs; it
   does not advance the Seven Encounters.
6. **The adversary's name**: Sheytan as written, Samael, the Satan, or never
   named. And is the archangel himself ever named?
7. **Is a stage's ground fixed or seeded?** Proposed: authored and fixed. The
   genre is learned by repetition, and a catastrophe that is different every
   day is a strange thing to imply.
