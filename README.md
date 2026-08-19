# Abby Jones Photography

Static site hosted on GitHub Pages at [abbyjonesphotography.com](https://abbyjonesphotography.com).

## Editing the site (for Abby)

Go to **[abbyjonesphotography.com/admin](https://abbyjonesphotography.com/admin/)** and sign in with GitHub. From there you can:

- Add, remove, and reorder photos in the Weddings / Couples / Families galleries
- Change alt text, captions, and which photos are "featured" on the home page
- Edit the About page (bio, portrait, locations)
- Edit pricing tiers and add-ons
- Add testimonials and blog posts when you're ready

Every save commits to this repo; the live site rebuilds in about 30 seconds.

## Structure

```
├── index.html                  # Home
├── galleries.html              # Gallery index
├── galleries/{weddings,couples,families}.html
├── pricing.html
├── about.html
├── inquire.html
├── blog.html
├── 404.html
├── admin/                      # Sveltia CMS (config.yml + mount)
├── assets/
│   ├── site/                   # Site-level images (portrait, logo, etc.)
│   └── galleries/{weddings,couples,families,testimonials,client}/
├── css/site.css                # All styles
├── js/
│   ├── site.js                 # Loads nav/footer partials, reveal animations
│   ├── gallery.js              # Data-driven gallery renderer + lightbox
│   ├── pricing.js              # Renders /data/pricing.json
│   └── inquiry.js              # Posts inquiry form to Formspree
├── partials/{nav,footer}.html  # Shared nav + footer
└── data/                       # All editable content (edited via CMS)
    ├── site.json
    ├── about.json
    ├── pricing.json
    ├── testimonials.json
    ├── blog.json
    └── galleries/{weddings,couples,families}.json
```

## To-do before launch

- [ ] Create Formspree endpoint and paste into `data/site.json` → `formEndpoint`
- [ ] Forward `abby@abbyjonesphotography.com` → Abby's Gmail; set up Gmail "Send mail as"
- [ ] Give Abby a GitHub account + Personal Access Token with `repo` scope
- [ ] Walk her through `/admin/` once
- [ ] Verify site in Google Search Console; submit `sitemap.xml`
- [ ] Set up Google Business Profile for Buffalo
- [ ] Optional: GitHub Action to auto-optimize new gallery images (sharp → WebP)

Site by [PalmWeb](https://palmweb.net).
