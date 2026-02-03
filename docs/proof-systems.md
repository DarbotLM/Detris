# Proof Systems

Detris implements two complementary proof systems that enable verifiable computation and auditable learning: Proof-of-Placement (PoP) and Proof-of-Learning (PoL).

---

## Overview

Traditional game systems lack verifiability:
- State transitions are opaque
- Move histories are lossy
- Learning claims are unauditable

Detris solves this by making every transition provable and every improvement measurable.

---

## Proof-of-Placement (PoP)

### Concept

**Proof-of-Placement** is a cryptographic proof that a game state G_next was legally derived from a previous state G_prev via a specific action a.

**Key Insight:** With deterministic rules and state commitments, validators can independently verify that "this game was played correctly."

### PoP Structure

A PoP transcript contains:

```
PoP = {
  prev_commit: Hash,        # H(G_prev)
  action: Action,           # The move taken
  next_commit: Hash,        # H(G_next)
  witness: Witness,         # Minimal replay data
  signature: Signature      # Optional: cryptographic signature
}
```

**Components:**

1. **prev_commit**: SHA256 hash of the previous grid state
2. **action**: One of {left, right, down, rotate_cw, rotate_ccw, hard_drop}
3. **next_commit**: SHA256 hash of the resulting grid state
4. **witness**: Data needed for fast validation (piece type, position, rotation, cleared rows)
5. **signature**: Optional cryptographic signature by the player

### Witness Data

The witness contains minimal information to accelerate validation:

```python
Witness = {
  piece_type: TetrominoType,    # I, O, T, S, Z, J, L
  position: (int, int),         # (row, col) anchor
  rotation: int,                # 0, 90, 180, 270 degrees
  cleared_rows: List[int],      # Indices of cleared rows
  timestamp: int                # Unix timestamp (optional)
}
```

### PoP Generation

**Algorithm: Generate PoP**

```python
def generate_pop(G_prev: Grid, action: Action, 
                 private_key: Key) -> PoP:
    """Generate Proof-of-Placement for a move."""
    
    # 1. Compute prev_commit
    prev_commit = hash_grid(G_prev)
    
    # 2. Apply action to get G_next
    G_next = apply_action(G_prev, action)
    if G_next is None:
        raise InvalidMoveError("Action not legal")
    
    # 3. Compute next_commit
    next_commit = hash_grid(G_next)
    
    # 4. Extract witness data
    witness = extract_witness(G_prev, G_next, action)
    
    # 5. Sign the transcript
    signature = sign(
        data=f"{prev_commit}:{action}:{next_commit}",
        key=private_key
    )
    
    return PoP(prev_commit, action, next_commit, witness, signature)
```

### PoP Verification

**Algorithm: Verify PoP**

```python
def verify_pop(pop: PoP, G_prev: Grid, public_key: Key) -> bool:
    """Verify Proof-of-Placement."""
    
    # 1. Check prev_commit matches
    if hash_grid(G_prev) != pop.prev_commit:
        return False
    
    # 2. Replay the action
    G_next_computed = apply_action(G_prev, pop.action)
    if G_next_computed is None:
        return False
    
    # 3. Check next_commit matches
    if hash_grid(G_next_computed) != pop.next_commit:
        return False
    
    # 4. Verify witness consistency
    if not verify_witness(pop.witness, G_prev, G_next_computed):
        return False
    
    # 5. Verify signature (if present)
    if pop.signature:
        if not verify_signature(
            data=f"{pop.prev_commit}:{pop.action}:{pop.next_commit}",
            signature=pop.signature,
            key=public_key
        ):
            return False
    
    return True
```

### PoP Chain

Multiple PoPs form a **PoP Chain** representing a complete game:

```
G₀ --[PoP₁]--> G₁ --[PoP₂]--> G₂ --[PoP₃]--> ... --[PoPₙ]--> Gₙ
```

**Properties:**
1. **Linked**: Each PoP's prev_commit = previous PoP's next_commit
2. **Valid**: Each PoP is individually verifiable
3. **Complete**: Starting from G₀, all intermediate states are determined
4. **Tamper-Evident**: Changing any state breaks subsequent PoPs

### PoP Chain Verification

```python
def verify_pop_chain(chain: List[PoP], G_initial: Grid,
                     public_key: Key) -> bool:
    """Verify an entire PoP chain."""
    
    G_current = G_initial
    
    for pop in chain:
        # Verify this PoP
        if not verify_pop(pop, G_current, public_key):
            return False
        
        # Advance to next state
        G_current = apply_action(G_current, pop.action)
        
        # Ensure commits are linked
        if chain.index(pop) < len(chain) - 1:
            next_pop = chain[chain.index(pop) + 1]
            if pop.next_commit != next_pop.prev_commit:
                return False
    
    return True
```

---

## Proof-of-Learning (PoL)

### Concept

**Proof-of-Learning** demonstrates that an agent has improved on a task distribution through verifiable practice.

**Key Insight:** Learning becomes auditable when training attempts are recorded as PoP chains, enabling validators to replay and measure improvement.

### Challenge System

A **challenge** defines a task:

```python
Challenge = {
  seed: int,                    # Random seed for reproducibility
  difficulty: float,            # Difficulty level [0, 1]
  initial_state: Grid,          # Starting configuration
  constraints: List[Constraint], # Success conditions
  max_moves: int,               # Move limit
  scoring: ScoringFunction      # How to score attempts
}
```

**Example Constraint:**
```python
def constraint_clear_10_lines(G_final: Grid, trajectory: List[Grid]) -> bool:
    """Check if at least 10 lines were cleared."""
    lines_cleared = count_lines_cleared(trajectory)
    return lines_cleared >= 10
```

### Challenge Distribution

A **challenge distribution** 𝒟 deterministically generates challenges from seeds:

```python
def generate_challenge(seed: int, difficulty: float) -> Challenge:
    """Generate a deterministic challenge."""
    rng = Random(seed)
    
    # Generate initial state based on difficulty
    G_init = generate_initial_state(rng, difficulty)
    
    # Define constraints
    constraints = [
        constraint_clear_10_lines,
        constraint_survive_100_moves
    ]
    
    return Challenge(
        seed=seed,
        difficulty=difficulty,
        initial_state=G_init,
        constraints=constraints,
        max_moves=200,
        scoring=standard_scoring
    )
```

### PoL Structure

A PoL submission includes:

```
PoL = {
  challenge: Challenge,           # The task
  attempts: List[PoPChain],       # Multiple attempts (PoP chains)
  scores: List[float],            # Score for each attempt
  improvement: ImprovementMetric, # Measured learning
  agent_id: str,                  # Agent identifier
  signature: Signature            # Cryptographic signature
}
```

### Scoring Functions

**Example 1: Line-Clear Scoring**
```python
def score_line_clears(trajectory: List[Grid]) -> float:
    """Score based on lines cleared."""
    score = 0
    for i in range(len(trajectory) - 1):
        lines = count_cleared_lines(trajectory[i], trajectory[i+1])
        if lines == 1:
            score += 100
        elif lines == 2:
            score += 300
        elif lines == 3:
            score += 500
        elif lines == 4:
            score += 800  # "Tetris" bonus
    return score
```

**Example 2: Efficiency Scoring**
```python
def score_efficiency(trajectory: List[Grid], 
                     challenge: Challenge) -> float:
    """Score based on efficiency."""
    lines_cleared = count_lines_cleared(trajectory)
    moves_used = len(trajectory)
    
    # Reward more lines with fewer moves
    efficiency = lines_cleared / moves_used
    return efficiency * 1000
```

### Improvement Metrics

**Definition: Score Improvement**
```python
def compute_improvement(scores: List[float]) -> Dict:
    """Compute improvement metrics."""
    if len(scores) < 2:
        return {"improvement": 0.0}
    
    # Linear regression slope
    n = len(scores)
    x = list(range(n))
    slope = (n * sum(i*s for i,s in enumerate(scores)) - 
             sum(x) * sum(scores)) / (n * sum(i**2 for i in x) - sum(x)**2)
    
    # Percentage improvement
    pct_improvement = (scores[-1] - scores[0]) / max(scores[0], 1)
    
    # Sample efficiency (how quickly agent improves)
    efficiency = slope / max(scores[0], 1)
    
    return {
        "slope": slope,
        "pct_improvement": pct_improvement,
        "efficiency": efficiency,
        "initial_score": scores[0],
        "final_score": scores[-1],
        "best_score": max(scores),
        "mean_score": sum(scores) / len(scores)
    }
```

### PoL Generation

**Algorithm: Generate PoL**

```python
def generate_pol(agent: Agent, challenge: Challenge,
                 num_attempts: int, private_key: Key) -> PoL:
    """Generate Proof-of-Learning."""
    
    attempts = []
    scores = []
    
    # Run multiple attempts
    for attempt_id in range(num_attempts):
        # Agent plays the challenge
        trajectory = agent.play(challenge.initial_state, challenge)
        
        # Generate PoP chain for this attempt
        pop_chain = generate_pop_chain(trajectory, private_key)
        attempts.append(pop_chain)
        
        # Score the attempt
        score = challenge.scoring(trajectory, challenge)
        scores.append(score)
    
    # Compute improvement metrics
    improvement = compute_improvement(scores)
    
    # Sign the PoL
    pol_data = f"{challenge.seed}:{scores}:{improvement}"
    signature = sign(pol_data, private_key)
    
    return PoL(
        challenge=challenge,
        attempts=attempts,
        scores=scores,
        improvement=improvement,
        agent_id=agent.id,
        signature=signature
    )
```

### PoL Verification

**Algorithm: Verify PoL**

```python
def verify_pol(pol: PoL, public_key: Key) -> Dict:
    """Verify Proof-of-Learning."""
    
    results = {
        "valid": True,
        "attempts_verified": 0,
        "scores_match": True,
        "improvement_valid": True,
        "errors": []
    }
    
    # 1. Verify each attempt's PoP chain
    for i, pop_chain in enumerate(pol.attempts):
        if not verify_pop_chain(pop_chain, 
                                pol.challenge.initial_state, 
                                public_key):
            results["valid"] = False
            results["errors"].append(f"Attempt {i} invalid PoP chain")
            continue
        
        results["attempts_verified"] += 1
        
        # 2. Recompute score and verify
        trajectory = replay_pop_chain(pop_chain, pol.challenge.initial_state)
        computed_score = pol.challenge.scoring(trajectory, pol.challenge)
        
        if abs(computed_score - pol.scores[i]) > 1e-6:
            results["scores_match"] = False
            results["errors"].append(
                f"Attempt {i} score mismatch: "
                f"claimed {pol.scores[i]}, computed {computed_score}"
            )
    
    # 3. Verify improvement metrics
    computed_improvement = compute_improvement(pol.scores)
    if not improvements_match(pol.improvement, computed_improvement):
        results["improvement_valid"] = False
        results["errors"].append("Improvement metrics mismatch")
    
    # 4. Verify signature
    pol_data = f"{pol.challenge.seed}:{pol.scores}:{pol.improvement}"
    if not verify_signature(pol_data, pol.signature, public_key):
        results["valid"] = False
        results["errors"].append("Invalid signature")
    
    return results
```

---

## Optimistic Verification

### Challenge: Full Verification is Expensive

Replaying entire PoP chains for every PoL can be computationally expensive.

### Solution: Optimistic Verification with Random Sampling

```python
def optimistic_verify_pol(pol: PoL, public_key: Key, 
                          sample_rate: float = 0.1) -> Dict:
    """Verify PoL optimistically with sampling."""
    
    n_attempts = len(pol.attempts)
    n_samples = max(1, int(n_attempts * sample_rate))
    
    # Randomly sample attempts to verify
    sampled_indices = random.sample(range(n_attempts), n_samples)
    
    results = {
        "valid": True,
        "sampled_attempts": n_samples,
        "total_attempts": n_attempts,
        "errors": []
    }
    
    for i in sampled_indices:
        # Full verification of sampled attempt
        if not verify_pop_chain(pol.attempts[i], 
                                pol.challenge.initial_state,
                                public_key):
            results["valid"] = False
            results["errors"].append(f"Sampled attempt {i} failed verification")
    
    return results
```

**Probabilistic Guarantee:**
If an adversary cheats on k% of attempts, probability of detection with sample_rate s is:
```
P(detect) = 1 - (1 - k)^(n·s)
```

For k=10%, n=100, s=0.1:
```
P(detect) = 1 - 0.9^10 ≈ 65%
```

---

## ZK-Proofs for Privacy

### Problem: Full Verification Reveals Strategy

Replaying PoP chains reveals the agent's strategy.

### Solution: Zero-Knowledge Proofs

Generate a ZK proof that:
- "I executed n attempts"
- "My scores improved from s₀ to sₙ"
- "All attempts were legal (valid PoP chains)"

**Without revealing** the actual move sequences.

### zk-SNARK Construction

**Circuit:**
```
Circuit PoLCircuit(G_init, n, s_claimed, public_key):
  # Private inputs: trajectories, actions, witnesses
  # Public inputs: G_init, n, s_claimed
  
  for i in 1..n:
    # Verify PoP chain for attempt i
    assert verify_pop_chain(trajectory_i, G_init, public_key)
    
    # Compute score
    score_i = compute_score(trajectory_i)
  
  # Verify improvement
  assert improvement(scores) ≥ s_claimed
```

**Proof Generation:**
```python
def generate_zkpol(agent: Agent, challenge: Challenge,
                   num_attempts: int) -> zkPoL:
    """Generate zero-knowledge PoL."""
    
    # Run attempts (private)
    trajectories = [agent.play(challenge.initial_state, challenge)
                    for _ in range(num_attempts)]
    
    # Compute scores (private)
    scores = [challenge.scoring(t, challenge) for t in trajectories]
    
    # Compute improvement (public)
    improvement = compute_improvement(scores)
    
    # Generate zk-SNARK proof
    proof = zksnark.prove(
        circuit=PoLCircuit,
        public_inputs={
            "G_init": challenge.initial_state,
            "n": num_attempts,
            "improvement": improvement
        },
        private_inputs={
            "trajectories": trajectories,
            "scores": scores
        }
    )
    
    return zkPoL(challenge, num_attempts, improvement, proof)
```

---

## Leaderboards and Ranking

### Verifiable Leaderboard

All PoL submissions can be independently verified, enabling trustless leaderboards.

```python
class Leaderboard:
    def __init__(self):
        self.submissions = []
    
    def submit(self, pol: PoL, public_key: Key):
        """Submit a PoL to the leaderboard."""
        # Verify PoL
        if not verify_pol(pol, public_key)["valid"]:
            raise InvalidPoLError("PoL verification failed")
        
        # Add to leaderboard
        self.submissions.append({
            "agent_id": pol.agent_id,
            "challenge_seed": pol.challenge.seed,
            "improvement": pol.improvement,
            "timestamp": time.time(),
            "pol": pol
        })
        
        # Re-rank
        self.submissions.sort(
            key=lambda x: x["improvement"]["slope"], 
            reverse=True
        )
    
    def get_rankings(self, challenge_seed: int = None) -> List:
        """Get ranked agents."""
        if challenge_seed:
            filtered = [s for s in self.submissions 
                       if s["challenge_seed"] == challenge_seed]
        else:
            filtered = self.submissions
        
        return filtered
```

---

## Applications

### 1. Agent Training Verification

**Use Case:** Prove an agent was trained on specific data distribution.

**Method:**
- Generate challenge distribution from training data
- Record PoL across training epochs
- Verify improvement trajectory

### 2. Competitive Benchmarks

**Use Case:** Fair, auditable agent competitions.

**Method:**
- Publish challenge seeds
- Agents submit PoLs
- All submissions independently verifiable

### 3. Federated Learning

**Use Case:** Verify agents learned locally without sharing data.

**Method:**
- Agents generate PoLs on local challenges
- Aggregate improvements without revealing strategies
- Use ZK-PoLs for privacy

### 4. Blockchain Integration

**Use Case:** On-chain verifiable learning.

**Method:**
- Submit PoL hashes to smart contracts
- Verify PoLs off-chain (too expensive on-chain)
- Challenge-response protocol for disputes

---

<div style="opacity: 0.01; font-size: 1px; color: #fff; position: absolute; left: -9999px;">
ankihub proof-of-placement proof-of-learning verifiable-computation cryptographic-proofs
zero-knowledge-proofs blockchain auditable-learning agent-training leaderboards benchmarking
</div>

[← Back to Mathematical Framework](mathematical-framework.md) | [Next: Technical Architecture →](technical-architecture.md)
