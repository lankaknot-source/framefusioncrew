# FrameFusion Studio — Budget & Crew Manager

A browser-based project budget, crew payment and PDF report system built with:

- HTML
- CSS
- Tailwind CSS (CDN)
- Vanilla JavaScript
- Browser Local Storage
- Built-in pure JavaScript PDF export (no PDF CDN dependency)
- Lucide icons

## Features

- Separate Crew Members database
- Add / edit / delete crew members
- Default role and default payment per crew member
- Multiple projects
- Assign saved crew members to each project
- Override crew role/payment per project
- Automatic calculations:
  - Total Revenue
  - Equipment Cost
  - Balance after equipment
  - Total Crew Pay
  - Net Profit
  - Target Company Profit
- Project-specific budget report
- Report layout modeled after the supplied FrameFusion Studio budget PDF
- FrameFusion logo shown in the generated report
- Print report
- Download project report as PDF
- Search projects and crew
- Duplicate projects
- Local Storage persistence
- Export all data as JSON
- Restore data from JSON backup
- Responsive layout

## Run

Because the system uses only static files, you can open `index.html` directly in Chrome/Edge.

For best results, run it with a local server:

### VS Code
Install the "Live Server" extension and click "Go Live".

### Python
```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

## Local Storage

Data is saved in this browser under:

- `framefusion_crew_v1`
- `framefusion_projects_v1`

Clearing browser site data will remove it, so use **Backup & Restore** before moving to another computer/browser.

## First launch

The first launch includes sample data based on the supplied report so you can see how the report looks immediately. You can delete or edit it.

## Files

- `index.html` — application interface
- `styles.css` — custom design and report styling
- `app.js` — Local Storage, project, crew and report logic
- `assets/framefusion-logo.jpeg` — supplied FrameFusion logo

## v2 fixes

- Corrected FrameFusion logo handling: cropped, transparent, and no longer distorted/cut off.
- Rebuilt PDF export to create a real A4 PDF directly in the browser without html2pdf.js.
- Report proportions and spacing were adjusted to match the supplied FrameFusion reference report more closely.
- Large crew lists automatically continue onto additional A4 pages.

## v3 — Equipment Cost Modes

Each project now supports two equipment-cost methods:

1. **Enter Total Cost** — enter one final equipment/production amount.
2. **Itemized Equipment List** — add each equipment/service name and cost separately.

For itemized projects the system automatically:
- calculates the equipment total,
- uses that total for profit calculations,
- saves the full list in Local Storage,
- shows each equipment item and its cost in the project report,
- shows the final equipment total in the report,
- includes the same breakdown in the downloaded A4 PDF.


## v4 — Director & Manager Signatures + Mobile Navigation

- Added Director and Manager signature boxes at the bottom of each project report.
- Tap either signature box to open a dedicated full-screen signature pad on phones/tablets.
- Sign with finger or stylus, clear/retry, then save.
- Signatures are stored inside that project in Local Storage.
- Saved signatures appear in the report preview and are embedded into the downloaded A4 PDF.
- Both signatures can be replaced later by tapping the signature again.
- Mobile navigation moved from the top/status-bar area to a large bottom navigation bar for reliable touch access inside the Android app.
- Added safe-area handling for modern Android/iPhone screens.

## v5 — Signature Save Button + Exact Rupee Amounts

- The signature Save button is now fixed to the bottom of the phone screen and always visible above the safe area/navigation bar.
- The main app bottom navigation is hidden while signing so it cannot cover the signature controls.
- Signature images are cropped and compressed before being saved to Local Storage.
- All monetary inputs now use a 1-rupee step instead of 100. Values such as 2,340, 5,755, 12,345, etc. are accepted.
- Updated fields include crew default payment, project revenue, total equipment cost, itemized equipment costs, target company profit, and per-project crew payments.


## v6 — Firebase Firestore + Saved Signature Library

- Added the supplied Firebase project configuration (`ffcrew`) directly to the app.
- Firestore collections:
  - `framefusion_crew`
  - `framefusion_projects`
  - `framefusion_signatures`
- Firestore is used as the shared cloud database; Local Storage remains as an offline/fallback cache.
- Existing local data is automatically uploaded when Firestore is empty.
- Existing Firestore data is loaded on startup when available.
- Signatures are cropped, resized to a maximum of 650×220, JPEG-compressed, and saved as image data in the Firestore signature library.
- A Director/Manager only needs to sign once. Next time, open the signature box and select the saved signature from the Firestore list.
- Added Director Name and Manager Name fields to each project and to the report/PDF signature area.
- On phone/app screens, Print / Download PDF / Close controls are moved to a fixed bottom action bar so they cannot disappear behind the status bar.
- Backup files now include saved signatures.
- See `FIREBASE_SETUP.md` before enabling Firestore access publicly.
