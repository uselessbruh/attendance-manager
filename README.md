# Attendance Manager

A modern, full-stack web application to track and manage your class attendance with both frontend and backend hosted together.

## Features

- 🎯 Real-time attendance tracking
- 📊 Calculate how many classes you can skip
- 🎨 Beautiful dark theme UI
- 📱 Fully responsive design
- ⚡ Fast Python backend with Flask
- 🔐 Secure session management

## Project Structure

```
attendance-manager/
├── api/                    # Python Backend (Flask)
│   ├── index.py           # Main API routes
│   ├── scraping.py        # Web scraping logic
│   ├── config.py          # Configuration
│   └── __init__.py
├── index.html             # Frontend
├── styles.css             # Styling
├── script.js              # Frontend logic
├── vercel.json            # Vercel configuration
└── requirements.txt       # Python dependencies
```

## Deployment on Vercel

### Step 1: Push to GitHub

```bash
cd attendance-manager
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/attendance-manager.git
git push -u origin main
```

### Step 2: Deploy on Vercel

1. Go to https://vercel.com
2. Click "New Project"
3. Import your `attendance-manager` repository
4. Add Environment Variable (optional):
   - `FLASK_SECRET_KEY` = your-secret-key
5. Click "Deploy"

That's it! Your app will be live at `https://your-app.vercel.app`

## Tech Stack

### Frontend
- Pure HTML/CSS/JavaScript
- No frameworks - lightweight and fast

### Backend
- Python 3.8+
- Flask - Web framework
- BeautifulSoup4 - Web scraping
- Requests - HTTP client

## How it Works

1. **Backend API** (Python/Flask):
   - Handles login authentication
   - Scrapes attendance data from academy portal
   - Processes and formats data
   - Manages user sessions

2. **Frontend** (HTML/CSS/JS):
   - Beautiful, responsive UI
   - Real-time calculations
   - Interactive dashboard
   - Smooth animations

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
python -m flask --app api.index run

# Or using Vercel CLI
npm i -g vercel
vercel dev
```

## Usage

1. Open the app
2. Enter your student credentials
3. View your attendance dashboard
4. Adjust target percentage slider
5. See how many classes you can skip for each course
6. Sort by name, percentage, or bunks available

## Security

- Credentials are not stored
- Session-based authentication
- Secure HTTPS connections
- Environment variables for secrets
