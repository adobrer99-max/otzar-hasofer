# Chapter II — Descent into Galus

**Status: a design for approval. Nothing here is built.**

Decisions already made by the owner (14 November):

1. The descent begins on the **same Tree, walked down**, and ends at a door to
   **new ground below Malchut**, which is built later.
2. On the way down the Scribe **lays the letters down**.
3. Chapter II opens after **any sealed crown or kindled Tree**. A first ascent
   gone out in peace does not open it.
4. This document comes first; code follows its approval.

Everything below those four lines is proposal.

---

## 1. The premise

Chapter I opens on its one unanswered sentence: *you were the scribe of the
crown, and you were cast down to the kingdom without being told what for.* The
whole climb is the walk back up to ask, and it ends at the crown with a plea —
mute, alone, heard, or whole.

Chapter II is the answer, and the answer is not an acquittal. It is a
commission: *you were not cast down. You were sent, and you went before you
were told.* The descent is the same road taken on purpose. The tradition's
name for it is *yeridah tzorech aliyah* — a going-down that is for the sake of
a going-up — and the place it goes is **Galus**, exile: the world below the
kingdom, where the light has not reached.

So the two chapters are one sentence read in both directions. In the first the
Scribe gathers the alphabet to make a case. In the second the Scribe gives the
alphabet away to make a road.

## 2. The loop, in one paragraph

The Scribe begins at **Keter**, holding the letters a sealed climb carried
there. Every path walked **downward lays its own letter down** — the letter
that path pays in Chapter I is the letter it takes in Chapter II — and it stays
on that road. At each Sefirah the Scribe may **draw down its light** to carry
into Galus. The ground is built, as always, from what is in the hand, so each
letter laid down makes the next road smaller, barer, and harder to cross with
what is left. The descent ends at **Malchut**, where what was carried down is
counted and the door below the kingdom opens.

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
| all ten | *The whole Tree is brought down* — and the door below opens fully |

The Book gets a second kind of page, facing the climb it descended from.

## 4. What the door below is (outline only)

The second half of the chapter is new ground under Malchut, and it is **not
designed here**. Enough is fixed to keep the first half honest about where it
is going:

- It is reached only from a finished descent, and what the Scribe may do there
  depends on what was brought down: lights carried are what is spent, letters
  kept are the body.
- Its natural shape is the **four exiles** — Babylon, Persia and Media, Greece,
  Rome (Daniel's four kingdoms, the reading the tradition gives the fourth
  verse of Genesis) — as four regions, each with its own ground, creatures and
  law, the way each Sefirah has its own now.
- It is where new chunks, new klipot and new measured bands would be needed.
  That is a second design round and a much larger build, and it should not
  start until the descent has been played.

Until it exists, the door is drawn, named, and shut, and the ending plate says
what would have gone through it.

## 5. What is reused, and what is new

**Reused unchanged:** the Tree and its twenty-two paths; `buildPath` and the
whole chunk library; every rung rule; every creature; the step, the lamps, the
fall; the Word-Gates; the map; the HUD and its rule line; the Book.

**New, and small:**

- a `chapter` on the record, and the page of the Book a descent came from;
- the Threshold's offer, once a qualifying climb is sealed;
- "lay down" where Chapter I has "pays", on the map's way buttons and at the
  way out of a road;
- "draw down" where Chapter I has "kindle";
- the descent's ending plate and its Book page;
- the shut door.

**New, and not small:** the proof and the measurements in §6.

## 6. What has to be proved before it ships

Chapter I's guarantees were all taken for a hand that only grows. A hand that
shrinks is a different population of worlds, and three things that are true
today have never been asked of it.

1. **No soft-lock.** `route.test.ts` proves a way out exists "on every path,
   holding only what the route there paid". The descent needs the mirror: a
   way out on every path walked downward, holding what *any* descending route
   has left. The builder should make this true by construction (it only lays
   screens the hand can answer), but that is exactly the kind of claim this
   project measures rather than assumes.
2. **It can be finished.** A descent probe, like `climb.test.ts`'s tour: from
   Keter with a full hand, down to Malchut, by the short road and by a road
   that touches all ten. Asserted as a share of seeds, as the dash is.
3. **The curve is a curve.** The fight and economy bands were drawn for the
   ascent. The descent needs its own, smaller set: that the last roads are not
   a wall for a bare hand (they are Malchut-scale ground, but with the upper
   Tree's creatures on the first of them), and that the light a road pays is
   enough, across a descent, to draw down more than none.

If (1) or (2) fails, the design changes before any surface is built. That is
why they are the first slices.

## 7. The roadmap

Each slice ends green and is a place to stop.

| Slice | What it is | Risk |
|---|---|---|
| **C2-0** | The descent record: `chapter`, begun from a Book page at Keter with that page's letters. Pure rules and tests; nothing on screen. | low |
| **C2-1** | Laying down: walking a path downward removes its letter. The no-soft-lock proof over sampled descending routes. | **the design's main risk** |
| **C2-2** | The descent probe: Keter to Malchut by the short road and the long one, as a share of seeds. First numbers on difficulty and light. | **may send the design back** |
| **C2-3** | The surfaces: Threshold offer, map wording, "draw down", the HUD. First playable descent. | low |
| **C2-4** | The ending: the plate, the four names, the Book's facing page, the shut door. | low |
| **C2-5** | Bands for the descent, and a playtest script for each surface. | medium |
| **C2-6** | Design round for the ground below Malchut. A document like this one. | — |

## 8. Open questions for the owner

1. **One descent per page, or as many as wanted?** Proposed: one. It makes a
   page of the Book a thing that is spent, and a kindled Tree worth more than
   a dash to the crown.
2. **Guardians on the way down.** Proposed: none — they were broken on the way
   up. The alternative is that each Sefirah's guardian stands again and must
   be passed with the smaller hand, which is a much harder chapter and would
   need every arena re-measured for descending kits.
3. **Does a descent touch Chapter I?** Proposed: no, in the first version. A
   later, tempting idea is that letters laid down on a road are found lying
   there by the next climb. It couples the two chapters' economies and should
   wait until both are measured.
4. **The Seven Encounters.** Proposed: a descent is played under no Encounter
   and does not advance them, as a first ascent is not.
5. **The four exiles** as the shape of the ground below — or something else?
   This only needs deciding at C2-6.
