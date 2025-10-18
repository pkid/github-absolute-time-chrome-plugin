# GitHub Absolute Dates Landing Page

A minimal, fast, static landing site for the GitHub Absolute Dates Chrome extension. Built for SEO optimization and Core Web Vitals performance.

## 🚀 Quick Start

This is a pure static site with no build step required. Simply serve the files from any web server.

### Local Development

```bash
# Serve locally with Python
python -m http.server 8000

# Or with Node.js
npx serve .

# Or with PHP
php -S localhost:8000
```

Visit `http://localhost:8000` to view the site.

## 📁 Project Structure

```
/
├── index.html              # Main landing page
├── assets/
│   ├── css/
│   │   └── styles.css      # Mobile-first responsive styles
│   ├── js/
│   │   └── main.js         # CTA tracking and interactions
│   └── img/
│       ├── before.png      # Before screenshot (SVG placeholder)
│       └── after.png       # After screenshot (SVG placeholder)
├── robots.txt              # SEO crawling instructions
├── sitemap.xml             # Site structure for search engines
├── favicon.ico             # Site favicon
└── README.md               # This file
```

## 🌐 Hosting Options

### GitHub Pages (Recommended)

#### Option 1: Main Branch /docs Folder

1. Move all files to a `docs/` folder in your main branch
2. Go to repository Settings → Pages
3. Select "Deploy from a branch" → "main" → "/docs"
4. Your site will be available at `https://username.github.io/repository-name`

#### Option 2: gh-pages Branch

1. Create a new branch called `gh-pages`
2. Move all files to the root of this branch
3. Go to repository Settings → Pages
4. Select "Deploy from a branch" → "gh-pages" → "/ (root)"
5. Your site will be available at `https://username.github.io/repository-name`

### Netlify

1. Connect your GitHub repository to Netlify
2. Set build command to empty (no build step needed)
3. Set publish directory to `/` (root)
4. Deploy automatically on every push

### Vercel

1. Connect your GitHub repository to Vercel
2. Set framework preset to "Other"
3. Set build command to empty
4. Set output directory to `/` (root)

### Custom Domain Setup

1. Add a `CNAME` file with your domain name:
   ```
   pkid.github.io/github-absolute-time-chrome-plugin
   ```

2. Update DNS records to point to your hosting provider

3. Update URLs in:
   - `index.html` (canonical, Open Graph, Twitter Card URLs)
   - `sitemap.xml` (all URLs)
   - `robots.txt` (sitemap URL)

## 🔧 Customization

### Updating Meta Tags

Edit the `<head>` section in `index.html`:

```html
<title>Your Custom Title</title>
<meta name="description" content="Your custom description">
<link rel="canonical" href="https://yourdomain.com/">
```

### Updating Schema.org JSON-LD

Modify the JSON-LD script in `index.html`:

```html
<script type="application/ld+json">
{
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Your Extension Name",
    "description": "Your description",
    "downloadUrl": "https://chromewebstore.google.com/detail/your-extension-id",
    "sameAs": "https://github.com/your-username/your-repo"
}
</script>
```

### Adding German Translation

1. Create `/de/index.html` with German content
2. Update language links in navigation
3. Add German URLs to `sitemap.xml`
4. Update `hreflang` attributes

### Replacing Images

Replace the placeholder SVG files in `/assets/img/`:

- `before.png`: Screenshot showing relative timestamps
- `after.png`: Screenshot showing absolute timestamps
- `favicon.ico`: Your custom favicon

**Recommended image specs:**
- Before/after images: 800x600px, PNG format
- Favicon: 32x32px, ICO format
- Optimize images for web (use tools like TinyPNG)

### Adding Demo GIF

1. Create a short GIF showing the extension in action
2. Add it to `/assets/img/demo.gif`
3. Include it in the "How It Works" section:

```html
<div class="demo-gif">
    <img src="/assets/img/demo.gif" alt="GitHub Absolute Dates extension demo" loading="lazy">
</div>
```

## 📊 SEO Features

- ✅ Semantic HTML structure
- ✅ Meta tags optimized for target keywords
- ✅ Open Graph and Twitter Card tags
- ✅ JSON-LD structured data
- ✅ Mobile-first responsive design
- ✅ Fast loading (Core Web Vitals optimized)
- ✅ Accessible markup
- ✅ Clean URL structure
- ✅ XML sitemap
- ✅ Robots.txt

## 🎯 Target Keywords

- GitHub absolute dates extension
- GitHub exact timestamps
- Chrome extension GitHub time format
- GitHub relative time converter
- GitHub timestamp extension

## 📈 Analytics & Tracking

The site includes basic CTA click tracking via console.log. To add analytics:

1. **Google Analytics 4**: Add GA4 tracking code to `<head>`
2. **Google Tag Manager**: Add GTM container code
3. **Custom Analytics**: Modify `trackCTAClick()` function in `main.js`

## 🔒 Privacy & Performance

- No external tracking by default
- No external fonts or CDNs
- Minimal JavaScript
- System font stack
- Lazy loading for images
- Respects `prefers-reduced-motion`
- High contrast mode support

## 🧪 A/B Testing

The HTML includes commented A/B testing variants:

```html
<!-- 
<h1>Transform GitHub timestamps with absolute dates</h1>
<p class="hero-subtitle">See exact timestamps instead of relative time...</p>
-->
```

Uncomment different variants to test different messaging.

## 🚀 Performance Checklist

- [ ] Images optimized and compressed
- [ ] CSS minified (optional)
- [ ] JavaScript minified (optional)
- [ ] Gzip compression enabled on server
- [ ] HTTPS enabled
- [ ] CDN configured (optional)
- [ ] Lighthouse score > 90

## 📝 License

MIT License - see LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test locally
5. Submit a pull request

## 📞 Support

- GitHub Issues: [Create an issue](https://github.com/your-username/your-repo/issues)
- Chrome Web Store: [Extension page](https://chromewebstore.google.com/detail/your-extension-id)

---

**Not affiliated with GitHub.** This is an independent Chrome extension.