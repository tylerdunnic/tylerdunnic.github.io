# tylerdunnic.github.io

Personal portfolio site for Tyler Dunnic. Static HTML/CSS/JS, no build step, no backend.

Live at: https://tylerdunnic.github.io

## Structure

```
index.html            One page, all sections. Layout only — no content hardcoded here.
css/styles.css         Design tokens (colors/fonts/spacing) at the top, styles below.
js/main.js              Fetches everything in data/ and renders it into index.html.
data/                  Content lives here. Edit these to change what the site says.
  about.json           Bio + tagline
  experience.json      Work history
  projects.json        Project write-ups + image galleries
  certifications.json  Certs with verification links
  education.json       Degrees/schools
  skills.json          Grouped skill tags
  contact.json         Email, phone, location, LinkedIn, resume path
assets/
  resume/              Resume PDF
  images/              Project photos, grouped by project
.github/workflows/
  deploy.yml           GitHub Actions: auto-deploys to Pages on every push to main
```

## Local preview

No build tools needed — just serve the folder so `fetch()` can load the JSON files
(opening `index.html` directly via `file://` will NOT work, browsers block fetch on local files).

From this folder, run one of:

```bash
# Python 3 (built into most systems)
python -m http.server 8000

# Node (if installed)
npx serve .
```

Then open `http://localhost:8000` in your browser.

## Day-to-day workflow

1. **Preview a change locally** — start the local server above, edit files, refresh the browser.
2. **Add new content** — most additions are just a new entry in a `data/*.json` file:
   - New job → add an object to `experience.json`
   - New project → add an object to `projects.json` (drop new photos in `assets/images/<project>/` first)
   - New certification → add an object to `certifications.json`
   No HTML/CSS editing required for routine content updates.
3. **Push it live** — commit and push to `main`. GitHub Actions rebuilds and redeploys automatically within about a minute:
   ```bash
   git add -A
   git commit -m "Add <whatever> project"
   git push
   ```

## Changing the visual theme

Edit the `:root` block at the top of `css/styles.css` — colors, fonts, and spacing are all
defined there as CSS variables. Nothing else in the file needs to change to retheme the site.
