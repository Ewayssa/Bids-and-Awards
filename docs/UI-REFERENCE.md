# BAC Documents Tracking System – UI Reference

This document describes the **intended UI** of the system (based on the reference screenshots). The app should match this layout and copy.

---

## Sidebar (all pages)

- **Header:** Green circular icon with letter **B** + title **"Bids and Awards Document Tracking"** (single line, no DILG logo).
- **MENU** (all caps): Dashboard, Encode, Reports, Personnel, Settings.
- **Admin** (all caps): User name (e.g. "Administrator"), then **Logout**.
- **Bottom:** Current URL (e.g. `localhost:5173/personnel`).
- Active menu item: green accent (background and/or left bar).

---

## Dashboard

- **Title:** BAC Dashboard  
- **Subtitle:** `{User name} · {Weekday, Mon DD, YYYY}` (e.g. Admin Wednesday, Feb 18, 2026)
- **Summary cards (left to right):**
  - **Total documents** (count)
  - **Completed** (count)
  - **On-going** (count)
  - **Pending** (count)
- **Calendar:** "Calendar" / "BAC events and deadlines", month navigation, "Upcoming" with "None scheduled" when empty.
- **Document status:** Donut chart with "X total" in center; legend for Completed, On-going, Pending.

---

## Encode (Document Encoding)

- **Title:** Document Encoding  
- **Subtitle:** View all documents uploaded by users. Status is set automatically from document completeness. View or download files.
- **Section:** "All Uploaded Documents"
- **Controls:** Search (placeholder: "Search by title, PR No, category, sub-document, or uploaded by..."), **Group View**, **Export**, **Filters**.
- **Table columns:** TITLE, PR NO, CATEGORY / SUB-DOC, DATE SUBMITTED, UPLOADED BY, STATUS, ACTIONS.
- **Status:** e.g. "Ongoing" (yellow/orange badge). **Actions:** e.g. "No file" when no file.

---

## Reports

- **Title:** Reports  
- **Subtitle:** Upload and view all reports in the system.
- **Section:** "All Uploaded Reports"
- **Filters:** Report Title (All), Submitting Office (All), Date From, Date To.
- **Empty state:** "No reports uploaded yet" and "Use 'Upload Report' to add one."
- **Button:** Green **Upload Report** (top right of content).

---

## Personnel

- **Title:** Personnel  
- **Subtitle:** Create and manage user accounts, assign roles and permissions.
- **Button:** Green **Add User** (top right).
- **Section:** "System Users" / "All registered users and their roles"
- **Table columns:** USERNAME, FULL NAME, OFFICE, ROLE, ACCOUNT STATUS, ACTIONS.
- **Actions:** Edit (blue), Disable (red). Account status: "Active" (green) or inactive.

---

## Settings

- **Title:** System Settings  
- **Subtitle:** Backup and system options.
- **Section:** "Backup & Restore" / "Save or restore system data."
- **Description:** Save all file metadata, users, and events to a JSON file. Restore reapplies events, user status, and document status from a previously saved backup.
- **Buttons:** Green **Save all (Backup)** and **Restore from Backup** (white with green border).

---

## Browser / App title

- **Document title:** BAC Documents Tracking System

---

*Keep the implemented UI in sync with this reference when making changes.*
