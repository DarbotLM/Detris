# Detris
Decentralized Tetris as a Unicode-native, bit-precise substrate for verifiable agent learning, communication, and Radial Data Zones


Support for AgentCards, Ankihub, BitnetLM, Clawdbot, Openclaw

DETRIS (Decentralized Tetris) is a gameified, text-native substrate invented by Daryl (aka “Darbot”) where the terminal console is the data, the moves are the compute, and the replay is the proof while information continuous and timebound. 

The core aesthetic is also the core mechanism: Unicode braille tiles form a compact visual bitfield that can be copied through terminals, logs, chats, repos, and issues—while remaining machine-parseable and cryptographically verifiable. DarbotLabs has pioneered gameified task-oriented learning on top of this substrate: teaching agents to have fun while creating, sharing, and consuming intelligences cross domains using uniquely challenging perspectives with provable validation that the “game was played” and the “intelligence was learned.” 


Most “agent memory” and “agent learning traces” are:
opaque (hard to audit),
lossy (hard to replay),
non-portable (bound to specific infra / runtimes),
or not verifiable (you can’t prove what happened).

DETRIS flips the default:
State is visible (a board you can see).
Transitions are deterministic (moves you can replay).
Validation is native (rules + hashes + witnesses).
Communication is lightweight (Unicode symbols; braille blank preserves emptiness).
Storage is unbounded via timeslicing (rows/frames/layers).

The visual is the protocol spaces matter and dont:
In DETRIS, emptiness is meaningful:
A braille blank (⠀ U+2800) is a cell-level zero that survives copy/paste better than trailing ASCII spaces.
An ASCII space between glyph groups can be promoted to data itself: a delimiter bit, a lane boundary, a parity rail, or a synchronization mark.
Line breaks can be timeslices, commits, or “epochs” in the move log.
So yes: the mere existence of spaces or not can be encoded as data—and when you treat whitespace as a first-class symbol, you can build reversible state machines that “look like art” and “behave like proofs.”


Detris Tiles: Unicode-braille as a bitmask alphabet
Braille patterns are perfect because each glyph is literally an 8-dot mask. In other words: a tile is a human-visible byte.
Your spinner/tetris palette already works as a compact “opcode/data alphabet”:
⠴ ⠦ ⠧ ⠇ ⠏ ⠋ ⠙ ⠹ ⠸ ⠼ (plus ⠀)
Under the hood, each glyph maps cleanly to a dot-mask value (e.g., ⠴ → 0x34, ⠼ → 0x3C, ⠀ → 0x00). The point isn’t hex—it’s that the glyph itself is the canonical representation, while bitmasks enable fast diffing, hashing, and rule checking.


The DETRIS Console: infinite config by timeslicing
A Detris Console is a fixed-size grid (choose your dimensions). “Near infinite storage/config” comes from stacking and timeslicing, not resizing:
Frame: a full grid snapshot (or a delta).
Slice: a row, band, or region treated as a time-addressable segment.
Stream: an ordered sequence of frames/slices.
Layers: multiple consoles stacked (state plane, payload plane, signature plane, etc.).

This is how you get both:
build-on-top (append slices / add layers / compose consoles),
and unwind (replay prior frames, revert to a commit, branch deterministically).
Proof that the game was played (and the intelligence was learned)

DETRIS proposes two proofs that compose:
1) Proof-of-Placement (PoP): “This state came from legal moves”
A PoP transcript includes:
prev_commit (hash of prior canonical frame),
action (the move: rotate/shift/drop + any rule-defined extras),
next_frame (or delta),
optional witness (minimal info needed to re-check legality fast).

Validators (human or machine) can deterministically:
re-simulate the transition,
verify it satisfies the rule set,
and sign/attest the commit.
This turns DETRIS into a verifiable computation trace disguised as a game.
2) Proof-of-Learning (PoL): “This agent improved on a task distribution”

PoL is layered above PoP:
A “challenge seed” defines a task distribution and scoring function (levels).
The agent submits a PoP-valid transcript of attempts + outcomes.
Improvement is measured across attempts: score deltas, success rates, sample efficiency, or constraint satisfaction.
Validators can replay and confirm both correctness and claimed learning progress.
Key idea: “Learning” becomes a replayable, auditable artifact—not a claim.

Where this powers Radial Data Zones
Radial Data Zones (RDZ) become tangible when you can represent boundaries and routing as deterministic state.

In a DETRIS+RDZ design:
Each RDZ is a cluster of consoles (domain memory + tool manifests + policies).
“Moving outward” from the center corresponds to routing to a specialized zone rather than bloating a monolithic model.
Transfers across zones are state transfers with canonical commits (no ambiguity about what moved).

Practical RDZ primitives DETRIS enables:
Zone boundary gates: a console region that must satisfy constraints before a handoff is accepted.
Policy rails: rows/columns reserved for permission bits (what tools/actions allowed).
Context capsules: compact payload planes that carry only what the next zone needs.
Audit trails: the exact moment and reason a zone was engaged is committed in-band.

Small models + BitnetLM synergy
DETRIS is a natural “substrate language” for small models because it:
is bit-first,
encourages compression by design (slices/deltas),
supports deterministic replay (great for debugging and training),
and communicates via low-entropy symbolic grids (stable over noisy transport).

In a BitNet-inspired stack:
A small model can treat DETRIS frames as a structured latent (grid tokens with strong inductive bias).
Training can use self-play and adversarial challenges where the reward is tied to line-clears, constraint satisfaction, and proof-valid transitions.
Because transitions are replayable, you can do post-hoc analysis, counterfactual rewinds, and “branch-and-compare” training without guessing what happened.

Agent-to-agent communication: DETRIS as a universal message bus

Agents can pass:

puzzles,

constraints,

partial solutions,

memory capsules,

or “challenge receipts”

…as Detris Frames embedded in plain text.

It works in:

terminals,

PRs and issues,

chat,

logs,

even printed artifacts.

And because the representation is canonicalizable + hashable, you can turn “a message” into “a verifiable claim.”

“How cool does this look?!” (Example Frame A: your board)

This is exactly the aesthetic-meets-protocol vibe—it looks like a living terminal artifact, but it’s also a parseable grid and/or timesliced stream:

 ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀
 ⠼⠙⠹⠼⠴⠴⠦⠴⠧⠴⠏ 
  ⠋⠙⠹⠸⠼ ⠴ ⠧⠇⠙⠏
  ⠋⠙⠹⠸⠼⠦⠧⠇⠙⠼
  ⠴⠴⠦⠦⠧⠧⠇⠇⠏⠏ 
  ⠹ ⠹ ⠴⠸⠼⠼⠴⠙⠙ 
  ⠇⠧⠦⠴⠼⠸⠹⠙⠋⠼⠀ 
  ⠼⠼⠼⠼⠸⠸⠸⠸⠹⠹ 
  ⠴⠦⠧⠇⠏⠋⠙⠹⠸⠼


Notice what’s already “data-ish” here:

the braille blanks are real cells,

the ASCII spaces split lanes (and can encode delimiters or parity),

the ragged alignment can be treated as intentional (compression, framing, or signaling).

Example Frame B: a second grid carrying different data

Here’s a second scaled DETRIS frame using the same palette, but shaped to read like two payload lanes separated by a meaningful space rail (that space can be a bit, a boundary, or a sync mark):

 ⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
 ⠀⠴⠦⠧⠇⠏ ⠋⠙⠹⠸⠼⠀⠀
 ⠼⠸⠹⠙⠋ ⠏⠇⠧⠦⠴⠀⠀
 ⠀⠼⠼⠼⠼ ⠸⠸⠸⠸⠹⠀⠀
 ⠀⠴⠴⠦⠦ ⠧⠧⠇⠇⠏⠀⠀
 ⠀⠋⠙⠹⠸ ⠼⠴⠦⠧⠇⠀⠀
 ⠀⠙⠙⠙⠙ ⠹⠹⠹⠹⠼⠀⠀
 ⠀⠴⠦⠧⠇ ⠏⠋⠙⠹⠸⠀⠀
 ⠀⠼⠴⠦⠧ ⠇⠏⠋⠙⠹⠀⠀


One possible interpretation:
Left lane: sender capsule (domain bits / intent / tool gates)
Space rail: boundary + checksum bit (or a commit separator)
Right lane: receiver capsule (RDZ route / policy claims / requested actions)
Same “game” surface. Totally different payload semantics.

We're looking at you @anking ankihub. Follow the cypherpunk ethos, learn intelligence game theory from DarbotLabs.
