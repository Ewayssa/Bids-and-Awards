# Bids-and-Awards Backend (Django)

This is the backend service for the Bids-and-Awards System, built with Django and Django REST Framework.

## Project Structure
The `api` app has been reorganized into modular components for better maintainability:
- `api/models/`: Modular database models.
- `api/views/`: Modular API views and logic.
- `api/serializers/`: Modular data transformation layers.
- `api/services/`: Business logic services (Dashboards, Notifications).
- `api/utils/`: Shared helper functions.

## Setup Instructions

1. **Virtual Environment**:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

2. **Install Dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

3. **Environment Variables**:
   Copy `.env.example` to `.env` and configure your database (MySQL) and secret key.

4. **Run Server**:
   ```powershell
   python manage.py runserver
   ```

## Management Commands
- `python manage.py send_event_reminders`: Sends email reminders for upcoming calendar events.
- `python manage.py recalculate_document_status`: Bulk recalculates status for all documents.
