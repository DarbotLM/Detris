# Technical Architecture

The Detris system architecture provides a modular, extensible framework for building verifiable game-based computation and agent learning systems.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │  Agents   │  │  Viewers  │  │ Analytics │  │  APIs    │ │
│  └───────────┘  └───────────┘  └───────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                      Core Services                           │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │ Game Eng  │  │   PoP/PoL │  │   Codec   │  │  Store   │ │
│  └───────────┘  └───────────┘  └───────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────┘
                            │
┌─────────────────────────────────────────────────────────────┐
│                    Data Layer                                │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐  ┌──────────┐ │
│  │  Grids    │  │  Chains   │  │ Metadata  │  │   Keys   │ │
│  └───────────┘  └───────────┘  └───────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Core Components

### 1. Grid Engine

**Responsibilities:**
- Manage grid state representation
- Handle coordinate transformations
- Support multi-layer grids

**Interface:**
```python
class GridEngine:
    def create_grid(self, rows: int, cols: int) -> Grid:
        """Create empty grid."""
        
    def set_cell(self, grid: Grid, r: int, c: int, value: str):
        """Set cell value."""
        
    def get_cell(self, grid: Grid, r: int, c: int) -> str:
        """Get cell value."""
        
    def is_occupied(self, grid: Grid, r: int, c: int) -> bool:
        """Check if cell is occupied."""
        
    def copy_grid(self, grid: Grid) -> Grid:
        """Deep copy a grid."""
        
    def serialize(self, grid: Grid) -> bytes:
        """Serialize grid to bytes."""
        
    def deserialize(self, data: bytes) -> Grid:
        """Deserialize bytes to grid."""
```

### 2. Game Engine

**Responsibilities:**
- Implement Tetris game rules
- Handle piece generation and movement
- Manage line clearing and gravity
- Validate moves

**Interface:**
```python
class GameEngine:
    def __init__(self, grid_engine: GridEngine):
        self.grid_engine = grid_engine
        self.rules = TetrisRules()
    
    def spawn_piece(self, grid: Grid, piece_type: str) -> Grid:
        """Spawn a new piece at the top."""
        
    def move(self, grid: Grid, action: Action) -> Optional[Grid]:
        """Apply action, return new grid if valid."""
        
    def check_collision(self, grid: Grid, piece: Piece, 
                       pos: Tuple[int, int]) -> bool:
        """Check if piece placement would collide."""
        
    def clear_lines(self, grid: Grid) -> Tuple[Grid, List[int]]:
        """Clear full lines, return new grid and cleared indices."""
        
    def apply_gravity(self, grid: Grid) -> Grid:
        """Apply gravity to floating blocks."""
        
    def is_game_over(self, grid: Grid) -> bool:
        """Check if game is over."""
```

### 3. Piece Manager

**Responsibilities:**
- Define tetromino shapes
- Handle rotations
- Manage piece state

**Implementation:**
```python
class Piece:
    def __init__(self, piece_type: str, rotation: int = 0):
        self.type = piece_type
        self.rotation = rotation
        self.shape = self._get_shape()
        self.glyph = self._get_glyph()
    
    def _get_shape(self) -> List[Tuple[int, int]]:
        """Get relative coordinates of piece blocks."""
        shapes = {
            'I': [(0,0), (0,1), (0,2), (0,3)],
            'O': [(0,0), (0,1), (1,0), (1,1)],
            'T': [(0,0), (0,1), (0,2), (1,1)],
            'S': [(0,1), (0,2), (1,0), (1,1)],
            'Z': [(0,0), (0,1), (1,1), (1,2)],
            'J': [(0,0), (1,0), (1,1), (1,2)],
            'L': [(0,2), (1,0), (1,1), (1,2)],
        }
        return self._rotate(shapes[self.type], self.rotation)
    
    def _rotate(self, shape: List[Tuple[int, int]], 
               degrees: int) -> List[Tuple[int, int]]:
        """Rotate shape by degrees (0, 90, 180, 270)."""
        for _ in range(degrees // 90):
            shape = [(-c, r) for r, c in shape]
        return shape
    
    def _get_glyph(self) -> str:
        """Get braille glyph for piece type."""
        glyphs = {
            'I': '⠏', 'O': '⠴', 'T': '⠦', 'S': '⠧',
            'Z': '⠇', 'J': '⠼', 'L': '⠸'
        }
        return glyphs[self.type]
    
    def rotate_cw(self) -> 'Piece':
        """Rotate clockwise."""
        return Piece(self.type, (self.rotation + 90) % 360)
    
    def rotate_ccw(self) -> 'Piece':
        """Rotate counter-clockwise."""
        return Piece(self.type, (self.rotation - 90) % 360)
```

### 4. Codec System

**Responsibilities:**
- Encode/decode braille symbols
- Handle serialization formats
- Support compression

**Interface:**
```python
class Codec:
    PALETTE = ['⠀', '⠇', '⠋', '⠏', '⠙', '⠦', '⠧', '⠴', '⠸', '⠹', '⠼']
    
    def encode_byte(self, value: int) -> str:
        """Encode byte as braille glyph."""
        return chr(0x2800 + value)
    
    def decode_byte(self, glyph: str) -> int:
        """Decode braille glyph to byte."""
        return ord(glyph) - 0x2800
    
    def encode_palette(self, index: int) -> str:
        """Encode palette index as glyph."""
        return self.PALETTE[index % len(self.PALETTE)]
    
    def decode_palette(self, glyph: str) -> int:
        """Decode glyph to palette index."""
        return self.PALETTE.index(glyph)
    
    def grid_to_utf8(self, grid: Grid) -> str:
        """Serialize grid as UTF-8 string."""
        return '\n'.join(''.join(row) for row in grid)
    
    def utf8_to_grid(self, s: str) -> Grid:
        """Deserialize UTF-8 string to grid."""
        return [list(line) for line in s.split('\n')]
    
    def grid_to_hex(self, grid: Grid) -> str:
        """Serialize grid as hex string."""
        bytes_data = bytes([self.decode_byte(cell) 
                           for row in grid for cell in row])
        return bytes_data.hex()
    
    def hex_to_grid(self, hex_str: str, rows: int, cols: int) -> Grid:
        """Deserialize hex string to grid."""
        bytes_data = bytes.fromhex(hex_str)
        glyphs = [self.encode_byte(b) for b in bytes_data]
        return [glyphs[i:i+cols] for i in range(0, len(glyphs), cols)]
```

### 5. Hash Engine

**Responsibilities:**
- Compute grid hashes
- Build Merkle trees
- Generate commitments

**Interface:**
```python
import hashlib

class HashEngine:
    def hash_grid(self, grid: Grid) -> str:
        """Compute SHA256 hash of grid."""
        serialized = self._serialize_canonical(grid)
        return hashlib.sha256(serialized).hexdigest()
    
    def hash_row(self, row: List[str]) -> str:
        """Compute hash of a single row."""
        serialized = ''.join(row).encode('utf-8')
        return hashlib.sha256(serialized).hexdigest()
    
    def merkle_root(self, grid: Grid) -> str:
        """Compute Merkle root of grid rows."""
        hashes = [self.hash_row(row) for row in grid]
        return self._merkle_tree(hashes)
    
    def _merkle_tree(self, hashes: List[str]) -> str:
        """Build Merkle tree from list of hashes."""
        if len(hashes) == 0:
            return hashlib.sha256(b'').hexdigest()
        if len(hashes) == 1:
            return hashes[0]
        
        # Pad to even length
        if len(hashes) % 2 == 1:
            hashes.append(hashes[-1])
        
        # Build next level
        next_level = []
        for i in range(0, len(hashes), 2):
            combined = bytes.fromhex(hashes[i]) + bytes.fromhex(hashes[i+1])
            next_level.append(hashlib.sha256(combined).hexdigest())
        
        return self._merkle_tree(next_level)
    
    def _serialize_canonical(self, grid: Grid) -> bytes:
        """Canonical serialization for hashing."""
        return '\n'.join(''.join(row) for row in grid).encode('utf-8')
```

### 6. PoP Engine

**Responsibilities:**
- Generate PoP transcripts
- Verify PoP chains
- Manage witnesses

**Interface:**
```python
class PoPEngine:
    def __init__(self, game_engine: GameEngine, hash_engine: HashEngine):
        self.game_engine = game_engine
        self.hash_engine = hash_engine
    
    def generate_pop(self, grid_prev: Grid, action: Action,
                     private_key: Optional[Key] = None) -> PoP:
        """Generate Proof-of-Placement."""
        prev_commit = self.hash_engine.hash_grid(grid_prev)
        
        grid_next = self.game_engine.move(grid_prev, action)
        if grid_next is None:
            raise InvalidMoveError("Action not legal")
        
        next_commit = self.hash_engine.hash_grid(grid_next)
        
        witness = self._extract_witness(grid_prev, grid_next, action)
        
        signature = None
        if private_key:
            signature = self._sign(prev_commit, action, next_commit, private_key)
        
        return PoP(prev_commit, action, next_commit, witness, signature)
    
    def verify_pop(self, pop: PoP, grid_prev: Grid,
                   public_key: Optional[Key] = None) -> bool:
        """Verify Proof-of-Placement."""
        # Check prev_commit
        if self.hash_engine.hash_grid(grid_prev) != pop.prev_commit:
            return False
        
        # Replay action
        grid_next = self.game_engine.move(grid_prev, pop.action)
        if grid_next is None:
            return False
        
        # Check next_commit
        if self.hash_engine.hash_grid(grid_next) != pop.next_commit:
            return False
        
        # Verify signature if present
        if pop.signature and public_key:
            if not self._verify_signature(pop, public_key):
                return False
        
        return True
    
    def verify_chain(self, chain: List[PoP], grid_init: Grid,
                    public_key: Optional[Key] = None) -> bool:
        """Verify entire PoP chain."""
        grid_current = grid_init
        
        for i, pop in enumerate(chain):
            if not self.verify_pop(pop, grid_current, public_key):
                return False
            
            grid_current = self.game_engine.move(grid_current, pop.action)
            
            # Check linking
            if i < len(chain) - 1:
                if pop.next_commit != chain[i+1].prev_commit:
                    return False
        
        return True
```

### 7. PoL Engine

**Responsibilities:**
- Generate challenges
- Score attempts
- Compute improvement metrics
- Verify PoL submissions

**Interface:**
```python
class PoLEngine:
    def __init__(self, pop_engine: PoPEngine):
        self.pop_engine = pop_engine
    
    def generate_challenge(self, seed: int, difficulty: float) -> Challenge:
        """Generate deterministic challenge."""
        rng = random.Random(seed)
        
        # Generate initial state
        grid_init = self._generate_initial_state(rng, difficulty)
        
        return Challenge(
            seed=seed,
            difficulty=difficulty,
            initial_state=grid_init,
            constraints=[],
            max_moves=200,
            scoring=self.default_scoring
        )
    
    def score_attempt(self, trajectory: List[Grid],
                     challenge: Challenge) -> float:
        """Score a single attempt."""
        return challenge.scoring(trajectory, challenge)
    
    def compute_improvement(self, scores: List[float]) -> Dict:
        """Compute improvement metrics."""
        n = len(scores)
        if n < 2:
            return {"improvement": 0.0}
        
        # Linear regression
        x = list(range(n))
        slope = self._linear_regression_slope(x, scores)
        
        return {
            "slope": slope,
            "pct_improvement": (scores[-1] - scores[0]) / max(scores[0], 1),
            "initial": scores[0],
            "final": scores[-1],
            "best": max(scores),
            "mean": sum(scores) / n
        }
    
    def generate_pol(self, agent: Any, challenge: Challenge,
                    num_attempts: int, private_key: Key) -> PoL:
        """Generate Proof-of-Learning."""
        attempts = []
        scores = []
        
        for _ in range(num_attempts):
            trajectory = agent.play(challenge)
            pop_chain = self._trajectory_to_pop_chain(trajectory, private_key)
            attempts.append(pop_chain)
            
            score = self.score_attempt(trajectory, challenge)
            scores.append(score)
        
        improvement = self.compute_improvement(scores)
        
        return PoL(challenge, attempts, scores, improvement, agent.id)
    
    def verify_pol(self, pol: PoL, public_key: Key) -> Dict:
        """Verify Proof-of-Learning."""
        results = {"valid": True, "errors": []}
        
        for i, pop_chain in enumerate(pol.attempts):
            if not self.pop_engine.verify_chain(
                pop_chain, pol.challenge.initial_state, public_key
            ):
                results["valid"] = False
                results["errors"].append(f"Attempt {i} invalid")
        
        return results
```

---

## Data Structures

### Grid Representation

```python
# Option 1: List of lists
Grid = List[List[str]]

# Option 2: Numpy array
import numpy as np
Grid = np.ndarray  # dtype='U1' for Unicode chars

# Option 3: Custom class
class Grid:
    def __init__(self, rows: int, cols: int):
        self.rows = rows
        self.cols = cols
        self.data = [['⠀'] * cols for _ in range(rows)]
    
    def __getitem__(self, key):
        return self.data[key]
    
    def __setitem__(self, key, value):
        self.data[key] = value
```

### PoP Structure

```python
@dataclass
class PoP:
    prev_commit: str
    action: Action
    next_commit: str
    witness: Witness
    signature: Optional[str] = None
    
    def to_dict(self) -> Dict:
        return {
            "prev_commit": self.prev_commit,
            "action": self.action.to_dict(),
            "next_commit": self.next_commit,
            "witness": self.witness.to_dict(),
            "signature": self.signature
        }
    
    @classmethod
    def from_dict(cls, data: Dict) -> 'PoP':
        return cls(
            prev_commit=data["prev_commit"],
            action=Action.from_dict(data["action"]),
            next_commit=data["next_commit"],
            witness=Witness.from_dict(data["witness"]),
            signature=data.get("signature")
        )
```

### PoL Structure

```python
@dataclass
class PoL:
    challenge: Challenge
    attempts: List[List[PoP]]
    scores: List[float]
    improvement: Dict
    agent_id: str
    signature: Optional[str] = None
    
    def to_json(self) -> str:
        return json.dumps({
            "challenge": self.challenge.to_dict(),
            "attempts": [[pop.to_dict() for pop in chain] 
                        for chain in self.attempts],
            "scores": self.scores,
            "improvement": self.improvement,
            "agent_id": self.agent_id,
            "signature": self.signature
        }, indent=2)
```

---

## Storage Layer

### File System Storage

```python
class FileSystemStorage:
    def __init__(self, base_path: str):
        self.base_path = Path(base_path)
        self.grids_dir = self.base_path / "grids"
        self.chains_dir = self.base_path / "chains"
        self.pols_dir = self.base_path / "pols"
        
        # Create directories
        for dir_path in [self.grids_dir, self.chains_dir, self.pols_dir]:
            dir_path.mkdir(parents=True, exist_ok=True)
    
    def save_grid(self, grid: Grid, grid_id: str):
        """Save grid to file."""
        path = self.grids_dir / f"{grid_id}.grid"
        with open(path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(''.join(row) for row in grid))
    
    def load_grid(self, grid_id: str) -> Grid:
        """Load grid from file."""
        path = self.grids_dir / f"{grid_id}.grid"
        with open(path, 'r', encoding='utf-8') as f:
            return [list(line.strip()) for line in f]
    
    def save_pop_chain(self, chain: List[PoP], chain_id: str):
        """Save PoP chain to file."""
        path = self.chains_dir / f"{chain_id}.json"
        with open(path, 'w') as f:
            json.dump([pop.to_dict() for pop in chain], f, indent=2)
    
    def save_pol(self, pol: PoL, pol_id: str):
        """Save PoL to file."""
        path = self.pols_dir / f"{pol_id}.json"
        with open(path, 'w') as f:
            f.write(pol.to_json())
```

### Database Storage

```python
import sqlite3

class DatabaseStorage:
    def __init__(self, db_path: str):
        self.conn = sqlite3.connect(db_path)
        self._create_tables()
    
    def _create_tables(self):
        """Create database schema."""
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS grids (
                grid_id TEXT PRIMARY KEY,
                hash TEXT NOT NULL,
                data BLOB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS pop_chains (
                chain_id TEXT PRIMARY KEY,
                agent_id TEXT,
                initial_grid_hash TEXT,
                final_grid_hash TEXT,
                length INTEGER,
                data BLOB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        self.conn.execute("""
            CREATE TABLE IF NOT EXISTS pols (
                pol_id TEXT PRIMARY KEY,
                agent_id TEXT NOT NULL,
                challenge_seed INTEGER,
                num_attempts INTEGER,
                best_score REAL,
                improvement REAL,
                data BLOB NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        self.conn.commit()
    
    def save_pol(self, pol: PoL, pol_id: str):
        """Save PoL to database."""
        self.conn.execute("""
            INSERT INTO pols (pol_id, agent_id, challenge_seed, 
                            num_attempts, best_score, improvement, data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            pol_id,
            pol.agent_id,
            pol.challenge.seed,
            len(pol.attempts),
            max(pol.scores),
            pol.improvement["slope"],
            pol.to_json().encode('utf-8')
        ))
        self.conn.commit()
```

---

## API Layer

### REST API

```python
from flask import Flask, jsonify, request

app = Flask(__name__)

@app.route('/api/v1/grid/<grid_id>', methods=['GET'])
def get_grid(grid_id):
    """Retrieve a grid by ID."""
    grid = storage.load_grid(grid_id)
    return jsonify({
        "grid_id": grid_id,
        "grid": codec.grid_to_utf8(grid),
        "hash": hash_engine.hash_grid(grid)
    })

@app.route('/api/v1/pop/verify', methods=['POST'])
def verify_pop():
    """Verify a PoP."""
    data = request.json
    pop = PoP.from_dict(data["pop"])
    grid_prev = codec.utf8_to_grid(data["grid_prev"])
    
    valid = pop_engine.verify_pop(pop, grid_prev)
    
    return jsonify({"valid": valid})

@app.route('/api/v1/pol/submit', methods=['POST'])
def submit_pol():
    """Submit a PoL."""
    data = request.json
    pol = PoL.from_json(json.dumps(data))
    
    # Verify PoL
    verification = pol_engine.verify_pol(pol, get_public_key(pol.agent_id))
    
    if verification["valid"]:
        # Save to storage
        pol_id = hashlib.sha256(pol.to_json().encode()).hexdigest()[:16]
        storage.save_pol(pol, pol_id)
        
        return jsonify({"pol_id": pol_id, "status": "accepted"})
    else:
        return jsonify({
            "status": "rejected",
            "errors": verification["errors"]
        }), 400
```

---

<div style="opacity: 0.01; font-size: 1px; color: #fff; position: absolute; left: -9999px;">
ankihub technical-architecture system-design api-design storage-layer game-engine
proof-verification codec-system hash-functions blockchain-integration
</div>

[← Back to Proof Systems](proof-systems.md) | [Next: Radial Data Zones →](radial-data-zones.md)
