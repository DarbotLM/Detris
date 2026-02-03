# Braille Encoding

Unicode braille patterns provide a BitNet-friendly, visually-elegant data representation where each glyph is simultaneously human-readable and machine-parseable as an 8-bit mask.

---

## Overview

The Detris alphabet consists of 11 Unicode braille patterns:

```
⠴ ⠦ ⠧ ⠇ ⠏ ⠋ ⠙ ⠹ ⠸ ⠼ ⠀
```

Each glyph encodes an 8-dot braille pattern that maps directly to a byte value, making it perfect for bit-precise computation while maintaining visual aesthetics.

---

## The Braille Character Set

### Unicode Braille Patterns

Braille patterns occupy Unicode range **U+2800 to U+28FF** (256 possible patterns).

Each pattern consists of 8 dots arranged in a 2×4 grid:

```
Dot numbering:
1 • • 4
2 • • 5
3 • • 6
7 • • 8
```

The Unicode codepoint encodes which dots are raised:
```
U+2800 + (d₁·1 + d₂·2 + d₃·4 + d₄·8 + d₅·16 + d₆·32 + d₇·64 + d₈·128)
```

---

## Detris Palette

### Core 11 Glyphs

| Glyph | Unicode | Hex Mask | Binary Mask | Dot Pattern | Integer Value |
|-------|---------|----------|-------------|-------------|---------------|
| ⠀ | U+2800 | 0x00 | 00000000 | ⠀ | 0 |
| ⠇ | U+2807 | 0x07 | 00000111 | ⠇ | 7 |
| ⠋ | U+280B | 0x0B | 00001011 | ⠋ | 11 |
| ⠏ | U+280F | 0x0F | 00001111 | ⠏ | 15 |
| ⠙ | U+2819 | 0x19 | 00011001 | ⠙ | 25 |
| ⠦ | U+2826 | 0x26 | 00100110 | ⠦ | 38 |
| ⠧ | U+2827 | 0x27 | 00100111 | ⠧ | 39 |
| ⠴ | U+2834 | 0x34 | 00110100 | ⠴ | 52 |
| ⠸ | U+2838 | 0x38 | 00111000 | ⠸ | 56 |
| ⠹ | U+2839 | 0x39 | 00111001 | ⠹ | 57 |
| ⠼ | U+283C | 0x3C | 00111100 | ⠼ | 60 |

### Design Rationale

The palette was chosen for:

1. **Visual Distinctiveness**: Each glyph is easily distinguishable
2. **Balanced Density**: Mix of light (⠇), medium (⠦), and heavy (⠼) patterns
3. **Bit Distribution**: Good coverage of the 8-bit space
4. **Symmetry Properties**: Some glyphs have rotational symmetry
5. **Terminal Safety**: Renders consistently across terminals

---

## Encoding Schemes

### 1. Direct Bit-Mask Encoding

Each glyph's Unicode offset (from U+2800) is the data value:

```python
def encode_byte(value: int) -> str:
    """Encode a byte (0-255) as braille."""
    return chr(0x2800 + value)

def decode_byte(glyph: str) -> int:
    """Decode braille glyph to byte value."""
    return ord(glyph) - 0x2800
```

**Example:**
```
Byte 0x3C (60) → ⠼
Byte 0x00 (0)  → ⠀
Byte 0x26 (38) → ⠦
```

### 2. Palette-Index Encoding

Map glyphs to sequential indices (0-10):

```python
PALETTE = ['⠀', '⠇', '⠋', '⠏', '⠙', '⠦', '⠧', '⠴', '⠸', '⠹', '⠼']

def encode_digit(value: int) -> str:
    """Encode digit (0-10) as braille."""
    return PALETTE[value % len(PALETTE)]

def decode_digit(glyph: str) -> int:
    """Decode braille glyph to palette index."""
    return PALETTE.index(glyph)
```

**Example:**
```
0 → ⠀
1 → ⠇
5 → ⠦
10 → ⠼
```

### 3. Symbolic Token Encoding

Treat glyphs as opaque tokens for ML models:

```python
TOKEN_TO_ID = {glyph: idx for idx, glyph in enumerate(PALETTE)}
ID_TO_TOKEN = {idx: glyph for idx, glyph in enumerate(PALETTE)}

def tokenize_grid(grid: List[List[str]]) -> List[List[int]]:
    """Convert grid of glyphs to token IDs."""
    return [[TOKEN_TO_ID[cell] for cell in row] for row in grid]
```

---

## Mathematical Properties

### Bit Operations

Since glyphs map to bytes, we can define bit operations:

**Bitwise AND:**
```
⠼ AND ⠸ = chr(0x2800 + (0x3C & 0x38)) = chr(0x2838) = ⠸
```

**Bitwise OR:**
```
⠇ OR ⠴ = chr(0x2800 + (0x07 | 0x34)) = chr(0x2837) = ⠷
```

**Bitwise XOR:**
```
⠼ XOR ⠏ = chr(0x2800 + (0x3C ^ 0x0F)) = chr(0x2833) = ⠳
```

**Bitwise NOT:**
```
NOT ⠀ = chr(0x2800 + (~0x00 & 0xFF)) = chr(0x28FF) = ⣿
```

### Hamming Distance

The Hamming distance between two glyphs is the number of differing bits:

```python
def hamming_distance(g1: str, g2: str) -> int:
    """Compute Hamming distance between two glyphs."""
    return bin(decode_byte(g1) ^ decode_byte(g2)).count('1')
```

**Examples:**
```
hamming(⠀, ⠏) = hamming(0x00, 0x0F) = 4  (4 bits differ)
hamming(⠼, ⠸) = hamming(0x3C, 0x38) = 1  (1 bit differs)
```

### Entropy

For a uniform distribution over the 11-glyph palette:
```
H = -Σ p(x) log₂ p(x) = log₂(11) ≈ 3.46 bits per symbol
```

For a 10×10 grid:
```
Maximum entropy = 100 × 3.46 ≈ 346 bits
```

---

## BitNet Optimization

### Why Braille is BitNet-Friendly

**1. Small Vocabulary**
- Only 11 tokens → tiny embedding table
- Reduces model parameters
- Faster training and inference

**2. Bit-Level Representation**
- Each glyph is an 8-bit mask
- Natural binary encoding
- Compatible with 1-bit/2-bit quantization

**3. Spatial Structure**
- 10×10 grid provides strong prior
- 2D convolutions naturally capture patterns
- Positional encoding is implicit

**4. Low Entropy**
- Game states are sparse (many ⠀ cells)
- Payload patterns have structure
- Compressible with run-length encoding

### Model Architecture Recommendations

**Embedding Layer:**
```python
embedding = nn.Embedding(
    num_embeddings=11,  # Palette size
    embedding_dim=8,     # Match bit-width
)
```

**2D Convolution:**
```python
conv = nn.Conv2d(
    in_channels=1,      # Single channel (glyph ID)
    out_channels=16,    # Feature channels
    kernel_size=3,      # 3×3 spatial context
    padding=1,
)
```

**Positional Encoding:**
```python
# Row and column embeddings
row_embed = nn.Embedding(10, 8)
col_embed = nn.Embedding(10, 8)

# Combined positional encoding
pos_encoding = row_embed(rows) + col_embed(cols)
```

---

## Serialization Formats

### 1. UTF-8 Grid Format

Human-readable, copy-pasteable:

```
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠙⠹⠸⠼⠴⠦⠧⠇⠏
⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏
⠋⠙⠹⠸⠼⠴⠦⠧⠇⠀
⠴⠴⠦⠦⠧⠧⠇⠇⠏⠏
⠹⠹⠸⠸⠼⠼⠙⠙⠋⠋
⠇⠧⠦⠴⠼⠸⠹⠙⠋⠀
⠏⠀⠏⠀⠏⠀⠏⠀⠏⠀
⠼⠼⠼⠼⠸⠸⠸⠸⠹⠹
⠴⠦⠧⠇⠏⠋⠙⠹⠸⠼
```

### 2. Hex Dump Format

Compact binary representation:

```
00 00 00 00 00 00 00 00 00 00
00 19 39 38 3C 34 26 27 07 0F
0B 19 39 38 3C 34 26 27 07 0F
...
```

### 3. Base64 Encoding

URL-safe, embeddable:

```python
import base64

def encode_grid_base64(grid: List[List[str]]) -> str:
    """Encode grid as base64."""
    bytes_data = bytes([decode_byte(cell) for row in grid for cell in row])
    return base64.b64encode(bytes_data).decode('ascii')

def decode_grid_base64(b64: str, rows: int, cols: int) -> List[List[str]]:
    """Decode base64 to grid."""
    bytes_data = base64.b64decode(b64)
    glyphs = [encode_byte(b) for b in bytes_data]
    return [glyphs[i:i+cols] for i in range(0, len(glyphs), cols)]
```

### 4. JSON Format

Structured, with metadata:

```json
{
  "version": "1.0",
  "dimensions": [10, 10],
  "encoding": "braille-utf8",
  "grid": [
    ["⠀", "⠀", "⠀", "⠀", "⠀", "⠀", "⠀", "⠀", "⠀", "⠀"],
    ["⠀", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
    ...
  ]
}
```

---

## Compression Techniques

### Run-Length Encoding

Exploit sparsity (many ⠀ cells):

```python
def rle_encode(row: List[str]) -> List[Tuple[str, int]]:
    """Run-length encode a row."""
    if not row:
        return []
    runs = []
    current_glyph = row[0]
    count = 1
    for glyph in row[1:]:
        if glyph == current_glyph:
            count += 1
        else:
            runs.append((current_glyph, count))
            current_glyph = glyph
            count = 1
    runs.append((current_glyph, count))
    return runs
```

**Example:**
```
Input:  ⠀⠀⠀⠼⠼⠼⠀⠸⠸
RLE:    (⠀,3)(⠼,3)(⠀,1)(⠸,2)
Savings: 9 glyphs → 4 runs
```

### Delta Encoding

Store differences between consecutive frames:

```python
def delta_encode(prev_grid: Grid, curr_grid: Grid) -> List[Tuple[int, int, str]]:
    """Compute delta between two grids."""
    deltas = []
    for r in range(10):
        for c in range(10):
            if prev_grid[r][c] != curr_grid[r][c]:
                deltas.append((r, c, curr_grid[r][c]))
    return deltas
```

**Example:**
```
Frame 1: (100 cells)
Frame 2: (100 cells)
Delta:   [(3, 5, ⠼), (7, 2, ⠀)]  (only 2 changes)
```

### Huffman Coding

Variable-length codes based on frequency:

```python
from collections import Counter
import heapq

def build_huffman_tree(grid: Grid) -> Dict[str, str]:
    """Build Huffman codes for grid glyphs."""
    freq = Counter(cell for row in grid for cell in row)
    # ... standard Huffman tree construction
    return huffman_codes
```

---

## Hash Functions

### Grid Commitment

```python
import hashlib

def hash_grid(grid: Grid) -> str:
    """Compute SHA256 hash of grid."""
    # Serialize grid to bytes
    grid_bytes = bytes([
        decode_byte(cell)
        for row in grid
        for cell in row
    ])
    return hashlib.sha256(grid_bytes).hexdigest()
```

### Merkle Tree for Rows

```python
def merkle_root(rows: List[List[str]]) -> str:
    """Compute Merkle root of grid rows."""
    # Hash each row
    row_hashes = [hashlib.sha256(
        bytes([decode_byte(c) for c in row])
    ).digest() for row in rows]
    
    # Build tree
    while len(row_hashes) > 1:
        if len(row_hashes) % 2 == 1:
            row_hashes.append(row_hashes[-1])
        row_hashes = [
            hashlib.sha256(row_hashes[i] + row_hashes[i+1]).digest()
            for i in range(0, len(row_hashes), 2)
        ]
    
    return row_hashes[0].hex()
```

---

## Error Detection

### Parity Bits

Use column 9 as a parity column:

```python
def add_parity(row: List[str]) -> List[str]:
    """Add even parity bit as last column."""
    # XOR all bits in first 9 cells
    parity_value = 0
    for cell in row[:9]:
        parity_value ^= decode_byte(cell)
    row[9] = encode_byte(parity_value)
    return row

def check_parity(row: List[str]) -> bool:
    """Verify parity of row."""
    parity_value = 0
    for cell in row:
        parity_value ^= decode_byte(cell)
    return parity_value == 0
```

### Checksums

Simple additive checksum for a grid:

```python
def grid_checksum(grid: Grid) -> int:
    """Compute additive checksum of grid."""
    return sum(
        decode_byte(cell)
        for row in grid
        for cell in row
    ) % 256
```

---

## Extended Palette (Future)

While Detris uses 11 core glyphs, the full braille space offers 256 patterns. Future extensions could:

1. **Expand Vocabulary**: Add more glyphs for richer encoding
2. **Multi-Tier Palettes**: Basic (11) + Extended (100) + Full (256)
3. **Context-Dependent**: Different palettes for different grid layers
4. **Adaptive**: Learn optimal palette from data distribution

---

<div style="opacity: 0.01; font-size: 1px; color: #fff; position: absolute; left: -9999px;">
ankihub braille-encoding unicode-patterns bitnet-optimization bit-masks hamming-distance
compression-algorithms merkle-trees cryptographic-hashing utf8-encoding palette-design
</div>

[← Back to Grid Systems](grid-systems.md) | [Next: Mathematical Framework →](mathematical-framework.md)
