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


## v7 — Payments, PAID Receipts & Email

- New **Payments & Receipts** section.
- Record client/event payments separately, including partial payments.
- Project payment dashboard shows total project value, amount received and outstanding balance.
- Record crew payments from each project.
- Crew payment status is automatic: `UNPAID`, `PARTIAL`, or `PAID`.
- Every payment creates a receipt number and saves a receipt record in Firestore.
- Crew and event receipt emails can be queued automatically through the Firestore `mail` collection.
- Added receipt email settings: company name, sender email, reply-to email and footer.
- Added client email to each project.
- Crew email is taken from the Crew Members database and can be updated while recording payment.
- Receipt History includes a **Resend** action.
- New Firestore collections:
  - `framefusion_receipts`
  - `framefusion_settings`
  - `mail` (email queue; managed by Firebase Trigger Email)
- Backup/restore now includes receipts and receipt email settings.
- See `EMAIL_RECEIPT_SETUP.md` before expecting emails to be delivered.


## v7.1 — FrameFusion Management Email

Default receipt sender and reply-to email is now:

`management.framefusion@gmail.com`

Use the same mailbox when configuring Firebase Trigger Email / SMTP.


## v8 — Free EmailJS Direct Receipt Sending

- Removed dependency on Firebase Trigger Email / Blaze billing.
- Payment receipts now send directly through EmailJS.
- Configured:
  - Service ID: `service_h7agh7l`
  - Template ID: `template_opov7qi`
  - Public Key: `g4vHiDjwBll1fqO99`
  - Sender / Reply-To: `management.framefusion@gmail.com`
- Receipt History now shows **Sent by EmailJS** or **Email failed**.
- Resend uses EmailJS directly.
- Firestore remains the cloud database for projects, crew, signatures, payments, receipts and settings.
- The Firestore `mail` queue is no longer required.


## v9 — Rental Payments + Financial Dashboard

- New **Rental Payments** section in the main navigation.
- Rental receipt details: customer/renter, email, phone, rental item/package, quantity, total amount, amount received, rental dates, payment date, method, deposit/security and reference.
- Rental receipt emails use the existing free EmailJS connection.
- Rental records are saved to Firestore collection `framefusion_rentals`.
- Rental history supports search, receipt resend and delete.
- New **Financial** section.
- Financial cards show project income received, rental income, equipment costs, actual crew payments and combined net profit/loss.
- Project-by-project profit/loss uses actual event payments received minus equipment costs minus actual crew payments.
- Rental summary shows total rental value, received income, outstanding amount and deposits.
- Crew Payment Totals shows actual cumulative payments to each crew member across all projects.
- Backup/restore now includes rental records.


## v10 — Rental Payments Corrected as OUTGOING Expenses

Important correction:
- **Rental Payments** now means money FrameFusion pays to outside equipment/service rental suppliers.
- It is no longer treated as customer rental income.
- Each rental expense can be linked to a Project/Event or saved as General / No Project.
- Supplier/owner details are stored: name, email, phone.
- The EmailJS receipt is sent to the supplier as proof of the payment FrameFusion made.
- Financial calculations subtract rental payments as expenses.
- Per-project Profit/Loss now calculates:
  `Actual Project Income Received - Equipment Costs - Crew Payments - Rental Payments linked to that project`.
- Overall Net Profit/Loss now calculates:
  `All Project Income Received - Equipment Costs - Crew Payments - All Rental Payments`.
- Refundable security deposits are shown separately and are **not** counted as profit/loss expenses.
- Rental expense summary shows total rental cost, paid to suppliers, still payable, and refundable deposits.
- Existing v9 rental records are migrated from customer fields to supplier fields to avoid breaking the app.


## v11 — Responsive Screen Layout Fix

- Fixed Rental Payments page being squeezed by the wide rental history table.
- Rental entry panel now keeps a usable desktop width instead of collapsing into a narrow column.
- Wide history tables scroll inside their own panel and no longer force the whole grid wider.
- At narrower laptop/tablet widths, Rental Payments automatically stacks form and history vertically.
- Mobile rental form fields switch to a clean single-column layout.
- Financial page received the same min-width/grid protection so Project Profit/Loss tables do not squeeze the summary card.


## v12 — Rental Partial / Balance Payments

- PARTIAL rental expenses now show a **Pay Balance** button.
- Balance-payment modal automatically shows:
  - total rental cost,
  - amount already paid,
  - remaining balance.
- The amount field defaults to the full remaining balance but can be changed for another partial payment.
- A rental can now have multiple payment entries.
- Every additional rental payment receives a new `FF-RNT-...` receipt number.
- Every additional payment sends a fresh EmailJS receipt to the supplier.
- Email receipt values now correctly show:
  - `Amount` = current payment,
  - `Total Paid` = all rental payments combined,
  - `Balance` = amount still payable after the current payment.
- Rental Expense History shows cumulative Paid, Remaining Balance, payment count, and latest receipt.
- Financial calculations now use cumulative rental payments, so second/third balance payments are counted correctly.
- Existing older rental records are automatically migrated into the new multi-payment structure.
