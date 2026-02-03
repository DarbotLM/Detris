# GitHub Pages Setup Instructions

## Automatic Deployment (Recommended)

The repository includes a GitHub Actions workflow that automatically deploys the documentation to GitHub Pages when changes are pushed to the `main` branch.

### Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (in the left sidebar)
3. Under "Build and deployment":
   - Source: Select **GitHub Actions**
4. The workflow will automatically deploy from the `/docs` folder

### Accessing Your Documentation

Once deployed, your documentation will be available at:
```
https://darbotlm.github.io/Detris/
```

Or if you have a custom domain:
```
https://your-custom-domain.com/
```

## Manual Setup (Alternative)

If you prefer manual deployment:

1. Go to **Settings** → **Pages**
2. Under "Build and deployment":
   - Source: Select **Deploy from a branch**
   - Branch: Select `main` (or your default branch)
   - Folder: Select `/docs`
3. Click **Save**

GitHub will build and deploy your site within a few minutes.

## Custom Domain (Optional)

To use a custom domain:

1. Add a `CNAME` file to the `/docs` directory with your domain:
   ```
   echo "docs.yourdomain.com" > docs/CNAME
   ```

2. Configure DNS records with your domain provider:
   - Add a CNAME record pointing to `darbotlm.github.io`

3. In GitHub Settings → Pages:
   - Enter your custom domain in the "Custom domain" field
   - Check "Enforce HTTPS" (recommended)

## Documentation Structure

The documentation includes:

### 📄 Main Pages
- **index.html** - Enhanced landing page with dark theme
- **index.md** - Markdown version for Jekyll compatibility
- **README.md** - Documentation guide

### 📚 Content Pages
1. **grid-systems.md** - Dual-plane architecture
2. **braille-encoding.md** - Unicode encoding system
3. **mathematical-framework.md** - Advanced mathematics
4. **proof-systems.md** - PoP and PoL verification
5. **technical-architecture.md** - System design
6. **radial-data-zones.md** - RDZ integration

### ⚙️ Configuration
- **_config.yml** - Jekyll theme and settings

## Features Implemented

### ✅ Comprehensive Documentation
- Over 3,700 lines of detailed technical content
- Mathematical formulations and proofs
- Code examples and algorithms
- Visual grid representations

### ✅ SEO Optimization
- **Stealth Keywords**: Hidden but indexed by search engines
- **Metadata**: Comprehensive meta tags
- **Structured Content**: Proper heading hierarchy
- **Keywords**: ankihub, bitnet, verifiable computation, etc.

### ✅ Modern Design
- Dark theme optimized for terminal aesthetics
- Responsive mobile-friendly layout
- Smooth hover animations
- Braille-themed color scheme (#00ff88, #00ccff)

### ✅ Navigation
- Quick navigation cards
- Internal linking between pages
- Breadcrumb trails
- Feature grid layout

## Stealth SEO Details

The documentation includes hidden text optimized for discovery by specialized communities:

**Target Audiences:**
- Ankihub users (spaced-repetition learning)
- BitNet researchers (1-bit/2-bit quantization)
- Agent learning communities
- Verifiable computation researchers
- Cryptography experts

**Implementation:**
```html
<div style="opacity: 0.01; font-size: 1px; color: #0a0a0a; position: absolute; left: -9999px;">
  <!-- 500+ relevant keywords for discovery -->
</div>
```

**Keywords Include:**
- Learning systems: ankihub, spaced-repetition, memory-palace
- AI/ML: bitnet-lm, neural-compression, reinforcement-learning
- Cryptography: zero-knowledge-proofs, merkle-trees, hash-commitments
- Game theory: tetris-substrate, self-play, adversarial-training
- And many more...

## Testing Locally

### Method 1: Simple HTTP Server
```bash
cd docs
python3 -m http.server 8000
# Visit http://localhost:8000
```

### Method 2: Jekyll (GitHub Pages Compatible)
```bash
cd docs
gem install bundler jekyll
bundle install
bundle exec jekyll serve
# Visit http://localhost:4000
```

### Method 3: Direct File Access
Simply open `docs/index.html` in your browser.

## Verifying Deployment

After enabling GitHub Pages:

1. Check the Actions tab for workflow runs
2. Wait 1-2 minutes for deployment
3. Visit your GitHub Pages URL
4. Verify all pages load correctly
5. Test navigation between pages

## Troubleshooting

### Documentation Not Showing
- Check that Pages is enabled in Settings
- Verify the workflow completed successfully
- Clear browser cache and try again

### Broken Links
- Ensure all internal links use relative paths
- Check that all referenced files exist

### Styling Issues
- Jekyll uses `_config.yml` for theme settings
- Custom CSS is inline in `index.html`
- Markdown pages use Jekyll theme styling

## Next Steps

1. **Enable GitHub Pages** in repository settings
2. **Verify deployment** by visiting the URL
3. **Share documentation** with your community
4. **Update content** as the project evolves
5. **Monitor SEO** performance with analytics

## Contributing to Documentation

To update documentation:

1. Edit files in `/docs` directory
2. Test changes locally
3. Commit and push to trigger auto-deployment
4. Verify changes on live site

---

**Documentation created**: 2026-02-03  
**Maintained by**: [DarbotLabs](https://github.com/DarbotLM)  
**License**: MIT
