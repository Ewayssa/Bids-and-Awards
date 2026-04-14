# How to Run the BAC Project

**If you see "Connection failed"** → Use **http://localhost:5173** (Vite dev server). Run `start-project.ps1` to start both backend and frontend.

---

## Option 1: One script (recommended)

1. In File Explorer, go to the `bids-and-awards` folder.
2. Right-click **`start-project.ps1`** → **Run with PowerShell**.
3. A **backend** window will open (leave it open). This window will then start the **frontend** in the same script window.
4. In your browser, open **http://localhost:5173**.
5. Log in with **admin** / **admin123**.

---

## Option 2: Two scripts (backend + frontend separate)

1. **Start the backend**  
   Right-click `run-backend.ps1` → **Run with PowerShell**.  
   Leave that window open (Django at **http://localhost:8000**).

2. **Start the frontend**  
   Right-click `run-frontend.ps1` → **Run with PowerShell**.  
   Vite will show **http://localhost:5173**.

3. **Open the app**  
   In your browser go to **http://localhost:5173**.  
   Log in with **admin** / **admin123**.

---

## Option 3: Run in terminals manually

**Terminal 1 – Backend**
```powershell
cd backend
python manage.py runserver
```

**Terminal 2 – Frontend**
```powershell
cd "c:\Users\elyss\OneDrive\Documents\React Projects\BIDS_and_Award\bids-and-awards"
npm run dev
```

Then open the URL that Vite prints (e.g. http://localhost:5173) in your browser.

---

## If the UI looks broken (no styles, wrong layout)

1. **Use the correct URL**  
   Open **http://localhost:5173** in your browser (not a file path like `file:///...`).

2. **Hard refresh**  
   Press **Ctrl+Shift+R** (or Cmd+Shift+R on Mac) to clear cached CSS.

3. **Restart the frontend**  
   Close the terminal running `npm run dev`, then run `start-project.ps1` again (or `run-frontend.ps1`).

4. **Clear Vite cache and reinstall (if still broken)**  
   In the `bids-and-awards` folder run:
   ```powershell
   Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
   npm install
   npm run dev
   ```
   Then open http://localhost:5173 and hard refresh again.

---

## If you get "cannot run scripts" on the .ps1 files

1. Open PowerShell as Administrator.
2. Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
3. Confirm with `Y`, then run the scripts again.
