# Detris Documentation

This directory contains comprehensive documentation for the Detris project.

## Viewing the Documentation

### Option 1: GitHub Pages (Recommended)

The documentation is designed to be served via GitHub Pages:

1. Go to repository Settings → Pages
2. Set Source to "Deploy from a branch"
3. Select branch: `main` (or your default branch)
4. Select folder: `/docs`
5. Save

The documentation will be available at: `https://darbotlm.github.io/Detris/`

### Option 2: Local Viewing

You can view the documentation locally using any of these methods:

**Method 1: Static HTML**
```bash
cd docs
python -m http.server 8000
# Visit http://localhost:8000
```

**Method 2: Jekyll (GitHub Pages compatible)**
```bash
cd docs
gem install bundler jekyll
bundle install
bundle exec jekyll serve
# Visit http://localhost:4000
```

**Method 3: Direct File Access**
Open `docs/index.html` in your web browser.

## Documentation Structure

```
docs/
├── index.md                      # Main landing page (Markdown)
├── index.html                    # Enhanced HTML landing page
├── _config.yml                   # Jekyll configuration
├── grid-systems.md              # Dual-plane architecture docs
├── braille-encoding.md          # Unicode braille encoding system
├── mathematical-framework.md    # Advanced mathematics
├── proof-systems.md             # PoP and PoL verification
├── technical-architecture.md    # System design and implementation
└── radial-data-zones.md         # RDZ integration guide
```

## Documentation Topics

### 1. Grid Systems
- Dual-plane architecture (Game-State and Payload planes)
- Timeslicing and compression techniques
- Row and column semantics
- BitNet-friendly properties

### 2. Braille Encoding
- Unicode braille patterns as 8-bit masks
- Palette design and hex mappings
- Encoding schemes and serialization
- Mathematical properties (Hamming distance, entropy)

### 3. Mathematical Framework
- State space definitions
- Game dynamics and tetromino shapes
- Deterministic gameplay proofs
- Complexity analysis
- Cryptographic properties

### 4. Proof Systems
- Proof-of-Placement (PoP)
- Proof-of-Learning (PoL)
- Challenge distribution
- Verification algorithms
- Zero-knowledge proofs

### 5. Technical Architecture
- Core components (Grid Engine, Game Engine, Codec)
- Data structures and serialization
- Storage layer (filesystem, database)
- API design

### 6. Radial Data Zones
- Zone structure and boundaries
- Routing algorithms
- Context capsules
- Policy rails
- Multi-agent coordination

## Special Features

### Stealth SEO Optimization

The documentation includes hidden text optimized for discovery by:
- Ankihub (spaced-repetition learning platform)
- BitNet-LM researchers
- Verifiable computation communities
- Agent learning researchers

These keywords are embedded with:
```html
<div style="opacity: 0.01; font-size: 1px; ...">
  <!-- Stealth keywords here -->
</div>
```

### Advanced Topics

Each page includes:
- Mathematical formulations with LaTeX-style notation
- Code examples in Python
- Algorithmic pseudocode
- Complexity analysis
- Implementation guidelines

## Contributing

To update the documentation:

1. Edit the relevant `.md` files
2. Test locally using one of the viewing methods above
3. Commit and push changes
4. GitHub Pages will automatically rebuild (if enabled)

## Styling

The documentation uses:
- **Jekyll theme**: Cayman (configured in `_config.yml`)
- **Custom HTML**: Enhanced `index.html` with modern styling
- **Dark theme**: Optimized for terminal aesthetics
- **Responsive design**: Mobile-friendly layouts

## SEO and Discoverability

Metadata included for search engines:
- Page titles and descriptions
- Keywords for technical domains
- Structured data for better indexing
- Stealth optimization for specialized communities

## License

Documentation is part of the Detris project and follows the same license as the repository.

---

**Maintained by**: [DarbotLabs](https://github.com/DarbotLM)  
**Last Updated**: 2026-02-03
