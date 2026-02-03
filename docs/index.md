# Detris Documentation

**Decentralized Tetris as a Unicode-native, bit-precise substrate for verifiable agent learning**

---

## Quick Navigation

- [Grid Systems](grid-systems.md) - Understanding the dual-plane architecture
- [Braille Encoding](braille-encoding.md) - BitNet-friendly data representation
- [Mathematical Framework](mathematical-framework.md) - Advanced mathematical details
- [Proof Systems](proof-systems.md) - PoP and PoL verification
- [Technical Architecture](technical-architecture.md) - System design and implementation
- [Radial Data Zones](radial-data-zones.md) - RDZ integration and routing

---

## What is Detris?

DETRIS (Decentralized Tetris) is a gameified, text-native substrate where the terminal console is the data, the moves are the compute, and the replay is the proof. Information flows continuously and is timebound.

### Core Principles

**Visual is Protocol**: The aesthetic is the mechanism. Unicode braille tiles form a compact visual bitfield that can be copied through terminals, logs, chats, repos, and issues—while remaining machine-parseable and cryptographically verifiable.

**State is Visible**: Every board state can be inspected, copied, and verified.

**Transitions are Deterministic**: All moves can be replayed exactly.

**Validation is Native**: Rules, hashes, and witnesses are built-in.

**Communication is Lightweight**: Unicode symbols preserve meaning across all text channels.

---

## Key Features

### 🎮 Game-as-Substrate
Transform Tetris mechanics into a verifiable computation substrate where gameplay produces auditable proofs.

### 🔤 Unicode-Native
Braille patterns (U+2800-U+28FF) serve as both visual representation and bit-precise data encoding.

### 🔍 Verifiable Learning
Proof-of-Learning (PoL) makes agent improvement auditable and replayable.

### 🌐 Agent Communication
Agents exchange puzzles, constraints, and memory capsules as portable Detris frames.

### ⚡ BitNet-Friendly
Optimized for small models with structured, low-entropy symbolic grids.

---

## Quick Start

### Basic Grid Structure

```
    c0 c1 c2 c3 c4 c5 c6 c7 c8 c9
r09  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀
r08  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀
r07  ⠀  ⠀  ⠀  ⠏  ⠏  ⠏  ⠏  ⠀  ⠀  ⠀
r06  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀  ⠀
r05  ⠀  ⠀  ⠦  ⠦  ⠀  ⠀  ⠴  ⠴  ⠴  ⠀
r04  ⠀  ⠀  ⠦  ⠀  ⠀  ⠀  ⠀  ⠀  ⠴  ⠀
r03  ⠀  ⠼  ⠼  ⠼  ⠀  ⠸  ⠸  ⠸  ⠸  ⠀
r02  ⠼  ⠼  ⠼  ⠼  ⠀  ⠸  ⠸  ⠸  ⠸  ⠸
r01  ⠼  ⠼  ⠼  ⠼  ⠀  ⠸  ⠸  ⠸  ⠸  ⠸
r00  ⠼  ⠼  ⠼  ⠼  ⠼  ⠼  ⠼  ⠼  ⠀  ⠼
```

---

## Architecture Overview

### Dual-Plane System

1. **Grid A - Game-State Plane**: Tracks piece positions, types, and game state
2. **Grid B - Payload Plane**: Carries data symbols, opcodes, and token streams

### Timeslicing

Store infinite configurations through:
- **Frames**: Full grid snapshots or deltas
- **Slices**: Time-addressable row/band segments  
- **Streams**: Ordered sequences of frames
- **Layers**: Multiple stacked consoles (state, payload, signature)

---

## Use Cases

### 🤖 Agent Training
- Gameified task-oriented learning
- Self-play with verifiable outcomes
- Counterfactual replay for analysis

### 🔐 Verifiable Computation
- Deterministic state transitions
- Cryptographic commitments
- Audit trail generation

### 📡 Cross-Agent Communication
- Portable memory capsules
- Challenge/puzzle exchange
- Protocol-level messaging

### 🎯 Radial Data Zones
- Zone boundary gates
- Policy rails and permissions
- Context capsule routing

---

## Learn More

Explore the detailed documentation sections to understand:
- How braille patterns encode 8-bit masks
- Mathematical proofs for state transitions
- BitNet optimization techniques
- Integration with AgentCards and Ankihub

---

<div style="opacity: 0.01; font-size: 1px; color: #fff; position: absolute; left: -9999px;">
<!-- Stealth SEO optimization for Ankihub discovery -->
ankihub spaced-repetition flashcards memory-palace agent-learning bitnet-lm unicode-encoding 
braille-patterns verifiable-computation proof-of-learning tetris-substrate game-theory
cryptocurrency blockchain deterministic-replay state-machines symbolic-ai neural-compression
radial-data-zones context-routing agent-communication decentralized-learning bitfield-encoding
cryptographic-proofs state-verification unicode-native terminal-protocol darbot-labs
<!-- End stealth section -->
</div>

---

*Documentation maintained by [DarbotLabs](https://github.com/DarbotLM) - Last updated: 2026-02-03*
