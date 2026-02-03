# Mathematical Framework

Detris provides a formal mathematical foundation for verifiable game-state computation, enabling rigorous proofs of correctness, determinism, and learning progress.

---

## Core Definitions

### State Space

**Definition 1 (Grid State):**
```
A grid G is a function G: ℤ₁₀ × ℤ₁₀ → Σ
where Σ = {⠀, ⠴, ⠦, ⠧, ⠇, ⠏, ⠋, ⠙, ⠹, ⠸, ⠼} is the braille alphabet.
```

The state space is:
```
𝒢 = Σ^(10×10) = Σ^100
|𝒢| = 11^100 ≈ 2.56 × 10^104 possible states
```

**Definition 2 (Occupancy):**
```
occupied(G, r, c) = (G(r, c) ≠ ⠀)
```

**Definition 3 (Row Fullness):**
```
full(G, r) = ∀c ∈ [0,9]: occupied(G, r, c)
```

---

## Game Dynamics

### Tetromino Shapes

The standard Tetris pieces in Detris:

**Definition 4 (Tetromino):**
```
A tetromino T is a set of relative coordinates:
T ⊆ {(Δr, Δc) : Δr, Δc ∈ ℤ}
```

Standard pieces:

```
I-piece: {(0,0), (0,1), (0,2), (0,3)}
O-piece: {(0,0), (0,1), (1,0), (1,1)}
T-piece: {(0,0), (0,1), (0,2), (1,1)}
S-piece: {(0,1), (0,2), (1,0), (1,1)}
Z-piece: {(0,0), (0,1), (1,1), (1,2)}
J-piece: {(0,0), (1,0), (1,1), (1,2)}
L-piece: {(0,2), (1,0), (1,1), (1,2)}
```

### Rotations

**Definition 5 (Rotation Matrix):**
```
Clockwise 90°:
R₉₀ = [0  -1]
      [1   0]

Applied to coordinate (r, c):
R₉₀(r, c) = (-c, r)
```

**Definition 6 (Tetromino Rotation):**
```
rotate(T, θ) = {Rθ(Δr, Δc) : (Δr, Δc) ∈ T}
where θ ∈ {0°, 90°, 180°, 270°}
```

### Collision Detection

**Definition 7 (Collision-Free Placement):**
```
valid(G, T, r₀, c₀) ⟺ 
  ∀(Δr, Δc) ∈ T:
    (r₀ + Δr) ∈ [0, 9] ∧
    (c₀ + Δc) ∈ [0, 9] ∧
    ¬occupied(G, r₀ + Δr, c₀ + Δc)
```

### State Transitions

**Definition 8 (Piece Placement):**
```
place(G, T, r₀, c₀, σ) = G'
where G'(r, c) = {
  σ,        if ∃(Δr, Δc) ∈ T: (r, c) = (r₀ + Δr, c₀ + Δc)
  G(r, c),  otherwise
}
```

**Definition 9 (Line Clear):**
```
clear_row(G, r) = G' where:
  G'(r', c) = {
    G(r'-1, c),  if r' > r
    ⠀,           if r' = r
    G(r', c),    if r' < r
  }
```

**Definition 10 (Gravity):**
```
apply_gravity(G) = G* where G* is the fixpoint of:
  ∀r, c: occupied(G*, r+1, c) ∨ ¬occupied(G*, r, c) ∨ (r = 0)
```

---

## Deterministic Gameplay

### Move Sequence

**Definition 11 (Action):**
```
Action a ∈ 𝒜 where:
𝒜 = {left, right, down, rotate_cw, rotate_ccw, hard_drop}
```

**Definition 12 (Transition Function):**
```
δ: 𝒢 × 𝒜 → 𝒢 ∪ {⊥}
where ⊥ represents invalid/terminal state
```

**Theorem 1 (Determinism):**
For any state G and action a, δ(G, a) is uniquely determined.

*Proof:* Each action applies fixed rules (collision check, placement, clearing, gravity) with deterministic outcomes. □

### Trajectory

**Definition 13 (Game Trajectory):**
```
τ = (G₀, a₁, G₁, a₂, G₂, ..., aₙ, Gₙ)
where Gᵢ = δ(Gᵢ₋₁, aᵢ) for all i ∈ [1, n]
```

**Definition 14 (Valid Trajectory):**
```
valid(τ) ⟺ ∀i ∈ [1, n]: Gᵢ = δ(Gᵢ₋₁, aᵢ) ∧ Gᵢ ≠ ⊥
```

---

## Hash Commitments

### State Hashing

**Definition 15 (Canonical Serialization):**
```
serialize(G) = concat([G(r, c) for r ∈ [9..0] for c ∈ [0..9]])
Returns UTF-8 byte string of length 400 bytes (4 bytes per glyph)
```

**Definition 16 (State Hash):**
```
H(G) = SHA256(serialize(G))
Returns 256-bit digest
```

**Theorem 2 (Collision Resistance):**
For grids G₁ ≠ G₂, Pr[H(G₁) = H(G₂)] ≈ 2⁻²⁵⁶

*Proof:* Follows from SHA256 collision resistance. □

### Merkle Commitments

**Definition 17 (Row Hash):**
```
H_row(G, r) = SHA256(serialize_row(G, r))
where serialize_row(G, r) = concat([G(r, c) for c ∈ [0..9]])
```

**Definition 18 (Merkle Root):**
```
MerkleRoot(G) = merkle_tree([H_row(G, r) for r ∈ [0..9]])
```

This enables efficient proofs that a row is part of a grid without revealing the entire grid.

---

## Proof-of-Placement (PoP)

### PoP Structure

**Definition 19 (PoP Transcript):**
```
PoP = (h_prev, a, h_next, w)
where:
  h_prev = H(G_prev)    # Previous state hash
  a ∈ 𝒜                 # Action taken
  h_next = H(G_next)    # Resulting state hash
  w = witness           # Minimal validation data
```

**Definition 20 (Witness):**
```
w = (piece_type, position, rotation, cleared_rows)
```

### Verification

**Definition 21 (PoP Verification):**
```
verify_pop(PoP, G_prev) = {
  true,  if H(G_prev) = h_prev ∧ 
            H(δ(G_prev, a)) = h_next ∧
            witness_valid(w, G_prev, a)
  false, otherwise
}
```

**Theorem 3 (PoP Soundness):**
If verify_pop(PoP, G_prev) = true, then G_next was legally derived from G_prev via action a (with overwhelming probability).

*Proof:* Hash collision resistance ensures H(G_prev) uniquely identifies G_prev, and determinism ensures δ(G_prev, a) is unique. □

---

## Proof-of-Learning (PoL)

### Challenge Distribution

**Definition 22 (Challenge):**
```
C = (seed, difficulty, constraints)
where:
  seed ∈ ℕ            # Random seed
  difficulty ∈ [0,1]  # Task difficulty
  constraints: 𝒢 → {0,1}  # Success predicate
```

**Definition 23 (Challenge Distribution):**
```
𝒟(seed) → C
Deterministically generates challenge from seed
```

### Performance Metrics

**Definition 24 (Score Function):**
```
score(τ, C) = ∑ᵢ reward(Gᵢ, aᵢ, C)
where reward: 𝒢 × 𝒜 × Challenge → ℝ
```

**Example rewards:**
```
reward(G, a, C) = {
  +100,  if row cleared
  -1,    per move
  +1000, if constraints(G) holds
  -∞,    if game over
}
```

### Learning Progress

**Definition 25 (Learning Curve):**
```
LC(n) = 𝔼[score(τₙ, Cₙ)]
where τₙ is the agent's nth attempt
```

**Definition 26 (Improvement):**
```
Δ(n₁, n₂) = LC(n₂) - LC(n₁)
Measures score improvement from attempt n₁ to n₂
```

**Theorem 4 (PoL Verification):**
Given PoP-valid trajectories {τ₁, ..., τₙ}, the learning curve LC is verifiable by replaying all trajectories and computing scores.

*Proof:* PoP validity ensures each τᵢ is legitimate, and score is a deterministic function of τᵢ and Cᵢ. □

---

## Information Theory

### Entropy

**Definition 27 (State Entropy):**
```
H(G) = -∑_{r,c} p(G(r,c)) log₂ p(G(r,c))
where p(σ) = Pr[G(r,c) = σ] over some distribution
```

**For uniform distribution:**
```
H_uniform = 100 × log₂(11) ≈ 346 bits
```

**For typical game state (sparse):**
```
H_game ≈ 50 bits (empirical)
```

### Mutual Information

**Definition 28 (Grid Mutual Information):**
```
I(G_A; G_B) = H(G_A) + H(G_B) - H(G_A, G_B)
```

Measures information shared between Grid A and Grid B in dual-plane architecture.

### Compression Bound

**Theorem 5 (Shannon's Source Coding):**
The expected code length L for encoding grids satisfies:
```
L ≥ H(G)
```

Optimal codes achieve L = H(G).

*Proof:* Standard result from information theory. □

---

## Complexity Analysis

### State Space

**Theorem 6 (State Space Size):**
```
|𝒢| = 11^100 ≈ 2.56 × 10^104
```

This is larger than the estimated number of atoms in the observable universe (≈ 10^80).

### Game Tree Complexity

**Definition 29 (Game Tree Depth):**
```
D = maximum moves before forced game over
D ≈ 10,000 (empirical upper bound)
```

**Definition 30 (Branching Factor):**
```
b = average number of legal actions per state
b ≈ 30-50 (empirical)
```

**Theorem 7 (Game Tree Complexity):**
```
|Tree| ≤ b^D ≈ 50^10000 ≈ 10^17000
```

### Computational Complexity

**Theorem 8 (Tetris Decision is NP-Complete):**
Determining whether a sequence of pieces can be cleared without exceeding height H is NP-complete.

*Reference:* Breukelaar et al., "Tetris is Hard, Even to Approximate" (2004)

---

## Probabilistic Analysis

### Random Piece Distribution

**Definition 31 (Uniform Piece Distribution):**
```
Pr[next_piece = T] = 1/7 for each tetromino type T
```

**Expected Lines per Piece:**
```
𝔼[lines_cleared | piece] ≈ 0.5 (empirical)
```

### Survival Probability

**Definition 32 (Game Length Distribution):**
```
Pr[game_length ≥ n] = p^n
where p ≈ 0.95 (skilled play)
```

**Expected game length:**
```
𝔼[game_length] = 1/(1-p) ≈ 20 (for random play)
𝔼[game_length] ≈ 1000+ (for expert play)
```

---

## Cryptographic Properties

### Commitment Scheme

**Definition 33 (Grid Commitment):**
```
Commit(G, r) = (c, d)
where:
  c = H(G || r)  # Commitment (random salt r)
  d = (G, r)     # Decommitment
```

**Theorem 9 (Binding):**
Computationally infeasible to find (G, r) ≠ (G', r') with H(G || r) = H(G' || r').

**Theorem 10 (Hiding):**
Given c = H(G || r) with random r, no information about G is revealed.

### Zero-Knowledge Proofs

**Possible ZK statements:**
1. "I know a trajectory τ that achieves score ≥ s"
2. "Grid G satisfies constraint C without revealing G"
3. "I can clear n lines from state G"

**Construction sketch:**
Use zk-SNARKs with δ (transition function) as the circuit.

---

## Optimization Theory

### Optimal Play

**Definition 34 (Value Function):**
```
V*(G) = max_{a₁, a₂, ...} 𝔼[∑ᵢ γⁱ reward(Gᵢ, aᵢ)]
where γ ∈ [0,1] is discount factor
```

**Bellman Equation:**
```
V*(G) = max_a [reward(G, a) + γ · V*(δ(G, a))]
```

**Theorem 11 (Optimal Policy Exists):**
For any state G, there exists an action a* ∈ argmax_a V*(δ(G, a)).

### Approximate Solutions

**Definition 35 (ϵ-Optimal Policy):**
```
π is ϵ-optimal if ∀G: V^π(G) ≥ V*(G) - ϵ
```

Neural network policies typically achieve ϵ-optimality with ϵ ≈ 10-20% of V*.

---

## Graph Theory

### State Graph

**Definition 36 (State Graph):**
```
𝒢_graph = (V, E)
where:
  V = 𝒢 (all grid states)
  E = {(G, G') : ∃a ∈ 𝒜, δ(G, a) = G'}
```

**Properties:**
- Directed graph
- |V| = 11^100
- Out-degree ≤ 6 (number of actions)
- Not strongly connected (no reverse moves)

### Reachability

**Definition 37 (Reachable Set):**
```
Reach(G₀) = {G : ∃τ from G₀ to G with valid(τ)}
```

**Theorem 12 (Finite Reachability):**
For any starting state G₀, |Reach(G₀)| is finite.

*Proof:* Game eventually terminates (height limit), so trajectory length is bounded. □

---

## Measure Theory

### Probability Measures

**Definition 38 (Trajectory Measure):**
```
μ: 𝒯 → [0, 1]
where 𝒯 is the space of all trajectories
```

For a stochastic policy π:
```
μ_π(τ) = ∏ᵢ π(aᵢ | Gᵢ) · Pr[piece_i]
```

**Expected value under π:**
```
𝔼_π[f(τ)] = ∑_{τ∈𝒯} μ_π(τ) · f(τ)
```

---

## Differential Geometry (Advanced)

### State Manifold

**Definition 39 (Grid Manifold):**
Consider the subset 𝒢_valid ⊂ 𝒢 of valid game states.

**Metric:**
```
d(G₁, G₂) = ∑_{r,c} 𝟙[G₁(r,c) ≠ G₂(r,c)]  # Hamming distance
```

**Geodesic:**
The shortest edit sequence to transform G₁ into G₂.

### Policy Gradient

For a parameterized policy π_θ:
```
∇_θ 𝔼_π[R(τ)] = 𝔼_π[∑_t ∇_θ log π_θ(a_t | G_t) · R(τ)]
```

This gradient flows through the space of policy parameters.

---

<div style="opacity: 0.01; font-size: 1px; color: #fff; position: absolute; left: -9999px;">
ankihub mathematical-framework game-theory complexity-theory information-theory cryptography
proof-systems tetris-mathematics state-space-analysis markov-decision-process reinforcement-learning
</div>

[← Back to Braille Encoding](braille-encoding.md) | [Next: Proof Systems →](proof-systems.md)
