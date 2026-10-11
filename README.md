# Faujdarhat Cadet College Smart Dashboard — V29 Polished Build


## V29 update
- Added a single teacher search box in Teacher Wise view with name/short-code autocomplete suggestions.
- Selecting an exact teacher name or short code opens that teacher’s routine; one remaining match is selected automatically.
- Preserved the V28 fixed class-time toggle, period labels, print controls, Apps Script API settings, and master Excel template.
- No backend (`Code.gs`) change is required for this UI update.

## What you need
- Google account
- GitHub account
- The supplied `index.html`
- `Code.gs`

## Part A — Create Google Sheet automatically

1. Open **script.google.com**.
2. Create **New project**.
3. Delete the default code and paste the full contents of `Code.gs`.
4. Click **Save**.
5. From the function dropdown, select **setup**.
6. Click **Run**.
7. Approve Google permissions when asked.

### What `setup()` does automatically
- Creates a new Google Spreadsheet named `Faujdarhat Cadet College Smart Dashboard - Database`.
- Creates `AppData`.
- Creates `AuditLog`.
- Creates `Setup`.
- Generates a 6-digit Admin PIN on first setup.
- Stores the Spreadsheet ID and PIN hash in Apps Script Script Properties.

The generated PIN is shown in the Spreadsheet toast and in the Apps Script execution log. The `Setup` sheet also records the initial PIN for the owner. **Do not share the Setup sheet publicly.**

> If you run `setup()` again, it will NOT generate a new PIN. It keeps the existing PIN.

## Part B — Deploy the API

1. In Apps Script click **Deploy → New deployment**.
2. Select **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone**.
5. Click **Deploy**.
6. Copy the URL ending in `/exec`.

Example:
`https://script.google.com/macros/s/XXXXXXXX/exec`

## Part C — Connect Dashboard

1. Open the supplied `index.html`.
2. Open **Google Sheet / API Setup** inside the dashboard.
3. Paste the Apps Script `/exec` URL.
4. Save.
5. The status should become **Sheet Synced**.
6. Use the generated Admin PIN for Admin Login.

## Part D — GitHub Pages

Repository structure:

```text
faujdarhat-smart-dashboard/
├── index.html
├── README.md
└── .github/
    └── workflows/
        └── deploy.yml
```

Push to the `main` branch. GitHub Actions will deploy the site automatically.

Then open:
`https://YOUR-GITHUB-USERNAME.github.io/YOUR-REPOSITORY/`

## Important security notes
- Never put the Admin PIN or its hash inside `index.html`.
- Do not commit secrets to GitHub.
- Keep the Google Spreadsheet restricted to the staff/owner who needs access.
- The public GET endpoint is designed to provide dashboard state. Avoid storing confidential information in the public state.
- Teacher phone numbers are potentially sensitive; only expose them publicly if that is intentional.

## Updating the dashboard
Edit `index.html`, commit/push to `main`, and GitHub Actions will deploy the new version automatically.


## V13 Final additions
- Dashboard: Teacher Workload, Class Coverage, Routine Health report, and last Excel upload summary.
- Master Routine Excel full-sheet preview, teacher-wise summary, row validation, and confirmation before applying valid rows.
- Admin section shortcuts/overview and JSON backup restore in Backup / Export.


## Master Routine Matrix Excel (V16 matrix update)
- Admin Panel → Master Routine Excel → Download Template creates a weekly matrix workbook matching the supplied print layout: Dept, Name, Sunday–Thursday (7 periods each), TOTAL, SRT.
- Edit class/section values in the weekday/period cells. Keep the header rows and teacher names/codes unchanged.
- Upload the same workbook. The app detects matrix format, shows preview, then Confirm & Upload replaces the full weekly routine (blank cells clear old assignments).
- New section codes found in the matrix are added to the class/section list after confirmation.
- Make a backup before the first live import.


## V18 API Setup + Master Matrix Import
- Admin has an API Setup card with the supplied Apps Script URL prefilled.
- Save API URL stores it in this browser; Test Connection checks reachability (browser CORS may limit the test).
- Download Master Routine Excel downloads the exact supplied `Print 5.10.26.xlsx` workbook to preserve its layout.
- Upload edited matrix `.xlsx`, `.xls`, or `.csv`, preview and confirm.


## V19 — Import Preview and Login Responsiveness Fix
- Removed broken late import overrides that referenced undefined parser functions.
- Matrix parser now reads the supplied workbook's actual layout: row 3 weekday groups; row 4 period labels; columns A:B teacher details; C:AK class assignments; AM SRT code.
- Preview reports assignments, teacher match problems, all class IDs and new sections before touching existing data. Confirm is disabled if validation errors exist.
- Apps Script requests time out after 12 seconds, and login displays a connecting state rather than appearing frozen.

## V19 — Import Preview and Login Responsiveness Fix
- Removed broken late import overrides that referenced undefined parser functions.
- Matrix parser reads the supplied workbook layout: row 3 weekday groups; row 4 period labels; columns A:B teacher details; C:AK class assignments; AM SRT code.
- Preview reports assignments, matched teachers, class/section IDs, new sections, and teacher-row problems before changing any data. Confirm is disabled if validation errors exist.
- Apps Script requests time out after 12 seconds and login displays a connecting state. Initial dashboard renders local data first and performs remote refresh in the background.
