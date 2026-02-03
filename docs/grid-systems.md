# Grid Systems

The Detris dual-plane architecture enables simultaneous representation of game state and arbitrary data payloads using identical visual grids with different semantic interpretations.

---

## Overview

Detris employs a **dual-plane architecture** where two 10×10 grids serve different but complementary purposes:

1. **Grid A**: Piece-ID / Game-State Plane
2. **Grid B**: Payload / Byte-Stream Plane

Both grids use the same braille Unicode character set, but interpret cell values differently based on context.

---

## Grid A: Piece-ID / Game-State Plane

### Purpose
Grid A represents the **game state** - the current configuration of pieces on the Tetris board.

### Interpretation

- **Cell Occupancy**: Implicit from glyph presence
  - `⠀` (U+2800) = empty cell
  - Any other glyph = occupied cell
  
- **Glyph Meaning**: The specific character encodes:
  - Piece type (I, O, T, S, Z, J, L tetrominoes)
  - Player ownership (multi-player scenarios)
  - Material class (different block types)
  - State opcodes (move hints, lock status)

### Example Grid A

```
    c0 c1 c2 c3 c4 c5 c6 c7 c8 c9
r09  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀
r08  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀
r07  ⠀  ⠀  ⠀  ⠏  ⠏  ⠏  ⠏  ⠀  ⠀  ⠀   ← Active I-piece (horizontal)
r06  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀
r05  ⠀  ⠀  ⠦  ⠦  ⠀  ⠀  ⠴  ⠴  ⠴  ⠀   ← Multiple piece types
r04  ⠀  ⠀  ⠦  ⠀  ⠀  ⠀  ⠀  ⠀  ⠴  ⠀
r03  ⠀  ⠼  ⠼  ⠼  ⠀  ⠸  ⠸  ⠸  ⠸  ⠀   ← Settled pieces
r02  ⠼  ⠼  ⠼  ⠼  ⠀  ⠸  ⠸  ⠸  ⠸  ⠸
r01  ⠼  ⠼  ⠼  ⠼  ⠀  ⠸  ⠸  ⠸  ⠸  ⠸
r00  ⠼  ⠼  ⠼  ⠼  ⠼  ⠼  ⠼  ⠼  ⠀  ⠼   ← Nearly complete bottom row
```

### Use Cases for Grid A

1. **State Replay**: Each frame captures a complete game state
2. **Deterministic Validation**: Rules can be checked against grid states
3. **Diff Calculation**: Compare successive grids to extract moves
4. **Visual Debugging**: Human-readable game state inspection
5. **Proof Generation**: State serves as witness for legal move validation

---

## Grid B: Payload / Byte-Stream Plane

### Purpose
Grid B represents **arbitrary data** - token streams, opcodes, or structured payloads.

### Interpretation

- **Symbol Plane**: Each cell is a token from the braille alphabet
- **Data Semantics**: Glyphs can represent:
  - Digits 0-9 (using palette ordering)
  - Compact bitmasks (8-dot patterns)
  - Opcodes for state machines
  - Micro-instructions for replay/unwind

### Example Grid B

```
    c0 c1 c2 c3 c4 c5 c6 c7 c8 c9
r09  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀
r08  ⠀  ⠙  ⠹  ⠸  ⠼  ⠴  ⠦  ⠧  ⠇  ⠏   ← Sequential token stream
r07  ⠋  ⠙  ⠹  ⠸  ⠼  ⠴  ⠦  ⠧  ⠇  ⠏   ← Pattern repetition
r06  ⠋  ⠙  ⠹  ⠸  ⠼  ⠴  ⠦  ⠧  ⠇  ⠀
r05  ⠴  ⠴  ⠦  ⠦  ⠧  ⠧  ⠇  ⠇  ⠏  ⠏   ← Paired symbols
r04  ⠹  ⠹  ⠸  ⠸  ⠼  ⠼  ⠙  ⠙  ⠋  ⠋   ← Symmetric structure
r03  ⠇  ⠧  ⠦  ⠴  ⠼  ⠸  ⠹  ⠙  ⠋  ⠀   ← Data sequence
r02  ⠏  ⠀  ⠏  ⠀  ⠏  ⠀  ⠏  ⠀  ⠏  ⠀   ← Striped pattern (delimiter?)
r01  ⠼  ⠼  ⠼  ⠼  ⠸  ⠸  ⠸  ⠸  ⠹  ⠹   ← Grouped data
r00  ⠴  ⠦  ⠧  ⠇  ⠏  ⠋  ⠙  ⠹  ⠸  ⠼   ← Full vocabulary usage
```

### Use Cases for Grid B

1. **Data Encoding**: Arbitrary byte streams as visual grids
2. **Token Sequences**: LM-friendly symbol streams
3. **Opcode Programs**: Instruction sequences for state machines
4. **Compressed Payloads**: High-density data storage
5. **Agent Messages**: Inter-agent communication packets

---

## Mathematical Formulation

### Grid Coordinate System

For a 10×10 grid:

```
Position: (r, c) where r ∈ [0, 9], c ∈ [0, 9]
r: row index (0 = bottom, 9 = top)
c: column index (0 = left, 9 = right)
```

### Cell State Function

**Grid A (Game State):**
```
S_A: ℕ × ℕ → Σ_game
where Σ_game = {⠀, ⠴, ⠦, ⠧, ⠇, ⠏, ⠋, ⠙, ⠹, ⠸, ⠼}
```

**Grid B (Payload):**
```
S_B: ℕ × ℕ → Σ_data
where Σ_data = {⠀, ⠴, ⠦, ⠧, ⠇, ⠏, ⠋, ⠙, ⠹, ⠸, ⠼}
```

Note: Σ_game = Σ_data (same alphabet, different semantics)

### Grid Transformation

Convert between grid states and byte arrays:

```
Grid → Bytes: G ↦ flatten([S(r,c) for r in [9..0], c in [0..9]])
Bytes → Grid: B ↦ reshape(B, (10, 10))
```

### Hash Function

Canonical grid hashing:
```
H(G) = SHA256(serialize(G))
where serialize(G) = UTF-8 encoding of grid with row delimiters
```

---

## Row Semantics and Timeslicing

### Row Interpretation

Each row can represent:

1. **State Slice**: A horizontal cross-section of game state
2. **Time Slice**: A moment in the game timeline
3. **Data Chunk**: 10 symbols (80 bits) of payload
4. **Feature Vector**: Input to ML models

### Timeslicing Operations

**Append Frame:**
```
Timeline ← Timeline ∪ {(t_new, Grid_new)}
```

**Rewind to Frame:**
```
State ← Timeline[t_target]
```

**Delta Compression:**
```
Δ(t₁, t₂) = Grid_t₂ ⊖ Grid_t₁
where ⊖ = cell-wise XOR or diff
```

---

## Dual-Plane Synchronization

### Linked Grids

Grid A and Grid B can be:

1. **Independent**: Separate timelines
2. **Synchronized**: Same timeline, different interpretations
3. **Layered**: Grid B provides metadata for Grid A

### Example: Synchronized Frame

```
Frame #42 at t=1000ms

Grid A (State):         Grid B (Metadata):
⠼ ⠼ ⠼ ⠀ ⠸ ⠸          ⠙ ⠙ ⠙ ⠀ ⠋ ⠋    ← Piece IDs | Timestamps
⠼ ⠼ ⠀ ⠀ ⠸ ⠸          ⠙ ⠙ ⠀ ⠀ ⠋ ⠋
⠀ ⠏ ⠏ ⠏ ⠏ ⠀          ⠀ ⠴ ⠴ ⠴ ⠴ ⠀    ← Active piece | Lock timer
```

---

## Column Semantics

### Vertical Interpretation

Columns can represent:

1. **Feature Channels**: Different properties per cell
2. **Player Lanes**: Separate territories in multi-player
3. **Data Pipes**: Independent byte streams
4. **Policy Rails**: Permission/routing columns

### Lane Separation

Example: 3-lane configuration with delimiters

```
c0-c2: Left payload   | c3: delimiter | c4-c6: Center state | c7: delimiter | c8-c9: Right metadata
⠴ ⠦ ⠧                 ⠀             ⠼ ⠼ ⠀              ⠀             ⠙ ⠹
⠇ ⠏ ⠋                 ⠀             ⠸ ⠸ ⠸              ⠀             ⠼ ⠴
```

---

## BitNet-Friendly Properties

### Why Braille Works for BitNet

1. **Fixed Symbol Set**: 11 tokens → small embedding table
2. **Spatial Structure**: 2D grid provides strong inductive bias
3. **Symmetry**: Patterns enable efficient compression
4. **Bit-Precision**: Each glyph is an exact 8-bit mask

### Model Input Format

Grid can be tokenized as:

```
Input Sequence: [r9c0, r9c1, ..., r9c9, r8c0, ..., r0c9]
Shape: (100,) for 10×10 grid
Vocabulary: 11 tokens + special tokens
```

Or as 2D input:
```
Input Tensor: Grid[r, c]
Shape: (10, 10)
Channel: Single channel (glyph ID)
```

---

## Advanced Usage

### Multi-Layer Stacks

```
Layer 0: Game State (Grid A)
Layer 1: Move History (Grid B.1)
Layer 2: Signature/Proof (Grid B.2)
Layer 3: Metadata (Grid B.3)
```

### Grid Algebra

Operations on grids:

- **Union**: G₁ ∪ G₂ (merge non-empty cells)
- **Intersection**: G₁ ∩ G₂ (keep only shared occupancy)
- **Difference**: G₁ \ G₂ (remove G₂ from G₁)
- **Overlay**: G₁ ⊕ G₂ (priority to G₁'s non-empty)

---

<div style="opacity: 0.01; font-size: 1px; color: #fff; position: absolute; left: -9999px;">
ankihub grid-systems dual-plane-architecture tetris-state braille-encoding spatial-computing
bitnet-optimization unicode-grids timeslicing frame-replay deterministic-validation
</div>

[← Back to Index](index.md) | [Next: Braille Encoding →](braille-encoding.md)
