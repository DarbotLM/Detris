# Radial Data Zones (RDZ)

Radial Data Zones provide a structured approach to domain-specific routing, memory management, and tool access in Detris, enabling scalable agent architectures without monolithic context bloat.

---

## Motivation

### The Problem: Context Overload

Modern large language models face a fundamental limitation:
- **Finite context windows**: Even 200K tokens run out
- **Attention dilution**: Relevant info gets lost in noise
- **Routing ambiguity**: Which tool/memory for this query?
- **No boundaries**: Everything in one giant context

### The Solution: Radial Architecture

Instead of cramming everything into one context, **organize knowledge and capabilities into zones** that activate on-demand.

**Key Idea:** Move outward from a compact core to specialized periphery zones, engaging them only when needed.

---

## Core Concepts

### Zone Structure

```
             ┌─────────────────────┐
             │  Specialized Tools  │
             │   Domain Experts    │
             └──────────┬──────────┘
                        │
             ┌──────────┴──────────┐
             │  Knowledge Domains  │
             │  Historical Memory  │
             └──────────┬──────────┘
                        │
             ┌──────────┴──────────┐
             │   Active Memory     │
             │  Recent Context     │
             └──────────┬──────────┘
                        │
             ┌──────────┴──────────┐
             │       Core          │
             │   Current Task      │
             └─────────────────────┘
```

**Radial Zones (innermost to outermost):**

1. **Core (Radius 0)**: Current task, active state, immediate context
2. **Active Memory (Radius 1)**: Recently accessed data, working set
3. **Knowledge Domains (Radius 2)**: Specialized topic areas, long-term memory
4. **Tool Periphery (Radius 3)**: External APIs, databases, compute resources

### Zone Boundaries

**Definition:** A zone boundary is a threshold condition that determines when to engage the next zone.

**Boundary Types:**

1. **Relevance Gates**: Engage if query matches domain keywords
2. **Capability Gates**: Engage if required tool is in zone
3. **Resource Gates**: Engage if zone has needed data/memory
4. **Policy Gates**: Engage if permissions allow

---

## Detris Implementation

### Grids as Zones

In Detris, zones map naturally to grid structures:

**Zone 0 (Core):** Single grid representing current game state
```
Grid_Core: Active game board
```

**Zone 1 (Active Memory):** Last N frames
```
Grid_History[0..9]: Recent 10 states
```

**Zone 2 (Domain Memory):** Compressed trajectories
```
Grid_Compressed: Key states from past games
Grid_Patterns: Learned patterns/strategies
```

**Zone 3 (Tool Manifests):** External resources
```
Grid_Tools: Available tool descriptors
Grid_Policies: Access control rules
```

### Zone Encoding in Grids

**Method 1: Separate Grids per Zone**

```python
class RadialMemory:
    def __init__(self):
        self.core = Grid(10, 10)           # Zone 0
        self.active = [Grid(10, 10) for _ in range(10)]  # Zone 1
        self.domain = {}                   # Zone 2: dict of topic -> Grid
        self.tools = Grid(10, 10)          # Zone 3
```

**Method 2: Layer Encoding**

Use Grid A (state) and Grid B (payload) as different zones:
```
Grid A (Zone 0): Current game state
Grid B (Zone 1): Metadata/routing info
```

**Method 3: Column-Based Zones**

Partition columns as zones:
```
Columns 0-2: Core state
Columns 3-5: Active memory
Columns 6-7: Domain routing
Columns 8-9: Tool manifests
```

---

## Routing Algorithms

### 1. Keyword-Based Routing

```python
def route_query(query: str, zones: RadialMemory) -> int:
    """Determine which zone to engage based on keywords."""
    
    # Zone 0: Always engaged
    if is_immediate_action(query):
        return 0
    
    # Zone 1: Recent memory keywords
    if any(word in query for word in ["recent", "last", "previous"]):
        return 1
    
    # Zone 2: Domain-specific keywords
    domains = {
        "math": ["calculate", "compute", "equation"],
        "code": ["function", "class", "debug"],
        "strategy": ["plan", "optimize", "best move"]
    }
    for domain, keywords in domains.items():
        if any(word in query.lower() for word in keywords):
            return 2
    
    # Zone 3: Tool invocation
    if any(word in query for word in ["search", "API", "database"]):
        return 3
    
    return 0  # Default to core
```

### 2. Embedding-Based Routing

```python
import numpy as np

def route_query_embedding(query: str, zones: RadialMemory,
                         embeddings: Dict) -> int:
    """Route based on semantic similarity."""
    
    query_emb = embed(query)
    
    # Compute similarity to each zone's representative
    similarities = {
        0: cosine_similarity(query_emb, embeddings["core"]),
        1: cosine_similarity(query_emb, embeddings["active"]),
        2: max(cosine_similarity(query_emb, emb) 
              for emb in embeddings["domains"].values()),
        3: cosine_similarity(query_emb, embeddings["tools"])
    }
    
    return max(similarities, key=similarities.get)
```

### 3. Learned Routing

```python
class RoutingNetwork:
    def __init__(self):
        self.model = nn.Sequential(
            nn.Linear(768, 256),  # Embedding dim
            nn.ReLU(),
            nn.Linear(256, 4),    # 4 zones
            nn.Softmax(dim=-1)
        )
    
    def route(self, query_embedding: torch.Tensor) -> int:
        """Learned routing decision."""
        probs = self.model(query_embedding)
        return torch.argmax(probs).item()
```

---

## Context Capsules

### Concept

A **context capsule** is a compact grid encoding that carries only essential information between zones.

**Purpose:**
- Minimize data transfer
- Preserve key context
- Enable efficient handoffs

### Structure

```python
@dataclass
class ContextCapsule:
    source_zone: int
    target_zone: int
    query: str
    context_grid: Grid      # Compact encoded context
    routing_hints: List[str]
    timestamp: int
    
    def serialize(self) -> bytes:
        """Serialize capsule for transmission."""
        return pickle.dumps(self)
    
    @classmethod
    def deserialize(cls, data: bytes) -> 'ContextCapsule':
        """Deserialize capsule."""
        return pickle.loads(data)
```

### Capsule Encoding

**Method 1: Key-Value Encoding**

Encode key-value pairs as grid patterns:
```
Row 0: Keys (as braille tokens)
Row 1: Values (as braille tokens)
```

**Method 2: Compression**

Use run-length encoding or Huffman coding to pack more data:
```python
def create_capsule(context: Dict) -> Grid:
    """Create compressed context capsule."""
    # Serialize context
    json_str = json.dumps(context)
    
    # Compress
    compressed = zlib.compress(json_str.encode())
    
    # Encode as braille
    grid = Grid(10, 10)
    for i, byte in enumerate(compressed[:100]):  # Max 100 bytes
        r, c = i // 10, i % 10
        grid[r][c] = codec.encode_byte(byte)
    
    return grid
```

---

## Policy Rails

### Concept

**Policy rails** are grid rows/columns that enforce access control and permissions.

**Use Cases:**
- "This agent can't access financial data"
- "This query requires authentication"
- "Rate limit: max 10 requests/minute"

### Implementation

**Policy Grid Structure:**
```
    c0 c1 c2 c3 c4 c5 c6 c7 c8 c9
r09  A  A  A  R  R  R  D  D  D  D    ← Permission bits
r08  1  0  1  1  0  0  1  1  0  1    ← Access flags
r07  ⠀  ⠀  ⠴  ⠦  ⠧  ⠀  ⠀  ⠀  ⠀  ⠀    ← Rate limit counters
```

**Policy Types:**

```python
class PolicyRail:
    def __init__(self):
        self.permissions = {}  # agent_id -> permissions
    
    def check_access(self, agent_id: str, zone: int,
                    resource: str) -> bool:
        """Check if agent can access resource in zone."""
        perms = self.permissions.get(agent_id, {})
        
        # Check zone access
        if zone not in perms.get("zones", []):
            return False
        
        # Check resource access
        if resource not in perms.get("resources", []):
            return False
        
        # Check rate limits
        if self._rate_limit_exceeded(agent_id, zone):
            return False
        
        return True
    
    def _rate_limit_exceeded(self, agent_id: str, zone: int) -> bool:
        """Check rate limits."""
        key = f"{agent_id}:{zone}"
        count = self.request_counts.get(key, 0)
        return count >= self.limits.get(zone, 100)
```

---

## Zone Handoff Protocol

### Transfer Mechanism

When a query needs to engage a deeper zone:

1. **Package Context**: Create context capsule
2. **Validate Policy**: Check zone access permissions
3. **Transfer**: Send capsule to target zone
4. **Engage**: Target zone processes query
5. **Return**: Send result back to requester

### Example Flow

```python
class ZoneRouter:
    def __init__(self, zones: RadialMemory, policy: PolicyRail):
        self.zones = zones
        self.policy = policy
    
    def handle_query(self, query: str, agent_id: str) -> Response:
        """Handle query with zone routing."""
        
        # Determine target zone
        target_zone = self.route_query(query)
        
        # Check permissions
        if not self.policy.check_access(agent_id, target_zone, "read"):
            return Response(error="Access denied")
        
        # Create capsule
        capsule = ContextCapsule(
            source_zone=0,
            target_zone=target_zone,
            query=query,
            context_grid=self._create_context_grid(),
            routing_hints=[],
            timestamp=time.time()
        )
        
        # Engage zone
        result = self._engage_zone(target_zone, capsule)
        
        # Log handoff
        self._log_handoff(agent_id, capsule, result)
        
        return result
    
    def _engage_zone(self, zone: int, capsule: ContextCapsule) -> Response:
        """Engage specific zone."""
        if zone == 0:
            return self._process_core(capsule)
        elif zone == 1:
            return self._process_active_memory(capsule)
        elif zone == 2:
            return self._process_domain(capsule)
        elif zone == 3:
            return self._process_tools(capsule)
```

---

## BitNet + RDZ Synergy

### Small Models in Zones

**Idea:** Use specialized small models per zone instead of one giant model.

**Benefits:**
- Each zone's model is expert in its domain
- Faster inference (smaller models)
- Lower memory footprint
- Easier updates (swap zone models independently)

### Architecture

```
Zone 0 (Core): 1B param model - current state processing
Zone 1 (Memory): 500M param model - retrieval/recall
Zone 2 (Domains): 3B param model per domain - specialized knowledge
Zone 3 (Tools): 500M param model - tool selection/routing
```

### Training Strategy

1. **Pre-train** each zone model on domain-specific data
2. **Fine-tune** on Detris trajectories
3. **Distill** knowledge from larger models if needed
4. **Continual learning** from user interactions

---

## Advanced Patterns

### 1. Hierarchical Zones

Zones can have sub-zones:

```
Zone 2 (Knowledge)
├── Zone 2.1 (Math)
│   ├── Zone 2.1.1 (Algebra)
│   └── Zone 2.1.2 (Calculus)
├── Zone 2.2 (Code)
│   ├── Zone 2.2.1 (Python)
│   └── Zone 2.2.2 (JavaScript)
└── Zone 2.3 (Strategy)
```

### 2. Dynamic Zone Creation

Create zones on-demand:

```python
def create_zone(topic: str, data: List[Grid]) -> Zone:
    """Dynamically create new zone for topic."""
    zone = Zone(
        id=f"zone_{topic}_{uuid.uuid4()}",
        topic=topic,
        grids=data,
        embeddings=compute_embeddings(data)
    )
    return zone
```

### 3. Zone Merging

Combine underutilized zones:

```python
def merge_zones(zone1: Zone, zone2: Zone) -> Zone:
    """Merge two zones."""
    return Zone(
        id=f"merged_{zone1.id}_{zone2.id}",
        topic=f"{zone1.topic}+{zone2.topic}",
        grids=zone1.grids + zone2.grids,
        embeddings=combine_embeddings(zone1.embeddings, zone2.embeddings)
    )
```

### 4. Zone Eviction

Remove stale zones to conserve resources:

```python
def evict_zone(zone: Zone, threshold: float):
    """Evict zone if access frequency below threshold."""
    if zone.access_frequency < threshold:
        # Archive zone data
        archive_zone(zone)
        # Remove from active memory
        del zones[zone.id]
```

---

## Practical Applications

### 1. Multi-Agent Systems

Each agent has its own RDZ structure:

```
Agent A:
  Core: Task tracking
  Active: Recent conversations
  Domain: Python expertise
  Tools: Code execution

Agent B:
  Core: Task tracking
  Active: Recent conversations
  Domain: Data analysis
  Tools: Visualization APIs
```

Agents can **share capsules** to collaborate.

### 2. Personalized Assistants

User-specific zones:

```
User X:
  Core: Current conversation
  Active: Today's context
  Domain: User X's knowledge base
  Tools: User X's authorized APIs
```

### 3. Federated Learning

Agents train locally, share zone updates:

```python
def federated_update(local_zones: List[RadialMemory]) -> RadialMemory:
    """Aggregate zone updates from multiple agents."""
    # Average zone embeddings
    aggregated = RadialMemory()
    for zone_id in range(4):
        aggregated.zones[zone_id] = average_zone(
            [agent.zones[zone_id] for agent in local_zones]
        )
    return aggregated
```

---

<div style="opacity: 0.01; font-size: 1px; color: #fff; position: absolute; left: -9999px;">
ankihub radial-data-zones context-management memory-hierarchy routing-algorithms policy-enforcement
zone-architecture multi-agent-systems federated-learning small-models bitnet-integration
</div>

[← Back to Technical Architecture](technical-architecture.md) | [Back to Index](index.md)
