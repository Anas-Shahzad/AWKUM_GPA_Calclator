# GPA & CGPA Calculator

Lightweight Flask web app for accurate GPA and CGPA calculations with mobile-first UI.

## Features
- GPA (single semester) and CGPA (multi-semester) modes with quick toggle.
- Marks-to-grade-point mapping per provided table (50->2.00, +0.05 per mark up to 89=3.95, 90-100=4.00, below 50=0.00).
- Rounds GPA/CGPA to two decimals; shows total credit hours and pass/fail when CGPA < 2.00.
- Dynamic add/remove courses and semesters; client-side validation plus backend checks.
- Responsive layout with large touch-friendly inputs.

## Project Structure
- `app.py`: Flask app factory, routes, validation, calculation logic.
- `templates/`: HTML templates (`index.html`).
- `static/css/`: Styles (`styles.css`).
- `static/js/`: Client interactions (`main.js`).
- `requirements.txt`: Python deps.
- `Procfile`: Process entry for Render/Railway/Heroku.

## Running Locally
```bash
python -m venv .venv
.venv\Scripts\activate  # Windows
pip install -r requirements.txt
python app.py  # starts on http://127.0.0.1:5000
```

## Deploying
- Render/Railway/Heroku: set build to `pip install -r requirements.txt`, start command `gunicorn "app:create_app()"`.
- Ensure `PORT` env var is honored by platform; gunicorn handles this automatically.

## API
POST `/api/calculate`
- GPA payload: `{ "mode": "gpa", "courses": [{"name": "Math", "credit_hours": 3, "marks": 82}] }`
- CGPA payload: `{ "mode": "cgpa", "semesters": [[{...course...}, {...}]] }`
- Response: `{ "result": 3.21, "totalCredits": 15, "type": "GPA" }` or `{ "result": 3.11, "totalCredits": 90, "type": "CGPA", "pass": true }`

## Notes
- Validation blocks empty names, credit hours <= 0, marks outside 0-100, and zero total credits.
- Adjust UI copy/styling in `templates/index.html` and `static/css/styles.css`.
