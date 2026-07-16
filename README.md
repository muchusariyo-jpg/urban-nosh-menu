# Urban Nosh — Digital Menu (PWA)

A mobile-first digital menu for Urban Nosh. Customers scan a QR code on the
table, land on this page, and browse the full menu — no app install required
(though it can be installed as an app if they want).

Everything on the page is generated from **`menu.json`** and
**`restaurant.json`**. You should never need to edit `index.html`,
`style.css`, or `script.js` for day-to-day menu changes.

---

## 1. Upload to GitHub

1. Create a free account at [github.com](https://github.com) if you don't have one.
2. Click **+** (top right) → **New repository**.
3. Name it, e.g. `urban-nosh-menu`. Set it to **Public**. Create it.
4. On the repo page, click **"uploading an existing file"** and drag in
   **all the files and folders** from this project (keep the folder
   structure — `assets/` must stay a folder).
5. Commit the changes.

## 2. Enable GitHub Pages

1. In your repo, go to **Settings → Pages**.
2. Under "Branch", choose `main` and folder `/ (root)` → **Save**.
3. GitHub gives you a live link, e.g.:
   `https://yourusername.github.io/urban-nosh-menu/`
4. That link is what goes into your QR code.

## 3. Connect a custom domain (optional)

If you buy a domain (e.g. from Namecheap or GoDaddy):
1. In **Settings → Pages**, enter it under "Custom domain".
2. At your domain registrar, add a CNAME record pointing to
   `yourusername.github.io`.
3. Wait for DNS to propagate (can take a few hours).

## 4. Replace images

Photos are optional — the menu works fine without them (it shows a neat
placeholder icon instead). To add a photo for an item:

1. Put the image file in `assets/images/` (create subfolders if you like,
   e.g. `assets/images/frys/epic-bite.jpg`).
2. Open `menu.json`, find that item, and set its `"image"` field to the
   path, e.g. `"assets/images/frys/epic-bite.jpg"`.
3. Commit the change on GitHub (or re-upload the file). No other file
   needs to change.

Keep photos reasonably small (compress to under ~300KB each) so the page
stays fast on mobile data.

## 5. Edit the menu — `menu.json`

Every dish, drink, and snack is one object in the `items` array. Example:

```json
{
  "id": 141,
  "name": "Filter Coffee",
  "description": "Strong and frothy, South Indian style.",
  "price": 25,
  "category": "Tea & Beverages",
  "subcategory": "Hot Beverages",
  "image": "",
  "veg": true,
  "available": true,
  "recommended": false,
  "popular": false,
  "spicyLevel": 0,
  "bestSeller": false,
  "newItem": true,
  "chefSpecial": false,
  "preparationTime": "",
  "tags": ["coffee"]
}
```

**To add an item:** copy an existing object, change the values, give it a
unique `"id"` (use the next unused number), add a comma after the previous
item's closing `}`.

**To remove an item:** delete its whole `{ ... }` block (and the comma
that separated it from the next one).

**To change a price:** edit the `"price"` number.

**To mark something out of stock:** set `"available": false` — it'll
automatically show an "Out of stock" tag.

**To feature something:**
- `"bestSeller": true` → shows a "Best Seller" badge and appears in
  Today's Special.
- `"chefSpecial": true` → shows "Chef Recommends" badge and appears in
  the Chef Recommends strip.
- `"newItem": true` → shows a "New" badge.

**To create a new category or subcategory:** just type a new name in the
`"category"` or `"subcategory"` field of any item — it appears
automatically in the sticky nav bar and as its own section. No other
file needs to change.

**To hide a whole category:** set every item in it to
`"available": false`, or remove those items.

> Tip: any text editor works (Notepad, VS Code, or even GitHub's own
> in-browser editor — click the pencil icon on the file in your repo).
> Just make sure the file stays valid JSON (matching brackets and commas).
> If you're not sure, paste the file into [jsonlint.com](https://jsonlint.com)
> to check before saving.

## 6. Edit restaurant details — `restaurant.json`

This file holds everything about the business itself:

- `"name"`, `"tagline"`, `"handle"` — shown in the header.
- `"address"`, `"phone"`, `"whatsapp"` — shown in the About section and
  power the floating Call/WhatsApp buttons. `whatsapp` should be the full
  number with country code and no symbols, e.g. `"919876543210"`.
- `"openingHours"` — a list of `{ "day": "...", "hours": "..." }` entries.
- `"instagram"` / `"facebook"` — full profile URLs; leave empty (`""`) to
  hide that icon.
- `"services"` — the pills under the tagline (Dine In / Take Away /
  Delivery).
- `"themeColors"` — the brand's hex colors. Change these only if your
  actual branding changes; the whole page re-colors from these values
  automatically.

## 7. Generate a QR code

Once your GitHub Pages link is live:
1. Go to any free QR generator (e.g. qr-code-generator.com).
2. Paste your link, generate the code, download it.
3. Print it on table tents, receipts, or counter signage.

## 8. Updating the site after a menu change

Any time you edit `menu.json` or `restaurant.json` and save/commit the
change on GitHub, the live site updates automatically within a minute or
two — customers just need to refresh (or reopen) the page. No republishing
step needed.

---

## What's inside

| File | Purpose |
|---|---|
| `index.html` | Page structure — don't need to edit this for menu changes |
| `style.css` | All visual styling, including dark mode |
| `script.js` | Reads the JSON files and renders everything: search, filters, sorting, favorites, the item modal, dark mode, floating buttons |
| `menu.json` | Every menu item — **edit this to change the menu** |
| `restaurant.json` | Business info, contact, hours, colors — **edit this to change business details** |
| `manifest.json` | Lets phones "install" the page as an app |
| `service-worker.js` | Caches the page so it still opens with no signal after the first visit |
| `assets/icons/` | App icons used when installed on a phone |
| `assets/images/` | Put your food photos here |

## Notes

- All 140 items were transcribed directly from your five menu photos
  (Fry's, Snacks, Beverages, UBN Combos, and the Bread/Biriyani/Shawarma
  sheet). Double-check prices and spellings against your printed menu —
  a couple of names were lightly standardized for readability (e.g.
  "Special Kizhi Chicken" instead of "Special Kizhi Chicken" as printed)
  and can be edited freely in `menu.json`.
- This build keeps everything as a single scrolling page (rather than
  separate `menu.html`/`food.html`/`about.html` pages) so there's only
  one header, one nav, and one place to look — it's simpler to maintain
  and still lets customers jump straight to a section from the top nav.
- The "Install as App" prompt is provided by the phone's browser
  automatically (e.g. Chrome's "Add to Home Screen") once the manifest
  and service worker are detected — there's nothing extra to build for
  that.
