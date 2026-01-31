# 🚀 Deployment Guide - FinanceFlow

This guide covers deploying FinanceFlow to production with PostgreSQL database.

## 📋 Prerequisites for Production

- Python 3.9+
- Node.js 18+
- PostgreSQL 14+ (for production)
- Domain name (optional)
- SSL certificate (recommended)

## 🗄️ Database Setup

### Switch from SQLite to PostgreSQL

1. Install PostgreSQL:
```bash
# Ubuntu/Debian
sudo apt install postgresql postgresql-contrib

# macOS
brew install postgresql
```

2. Create database:
```bash
sudo -u postgres psql
CREATE DATABASE financeflow;
CREATE USER financeuser WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE financeflow TO financeuser;
\q
```

3. Update `backend/main.py`:

Replace:
```python
DATABASE_URL = "sqlite:///./finance_tracker.db"
```

With:
```python
import os
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://financeuser:your_secure_password@localhost/financeflow"
)
```

4. Install PostgreSQL driver:
```bash
pip install psycopg2-binary
```

## 🔐 Environment Variables

Create `.env` file in backend directory:

```env
# Database
DATABASE_URL=postgresql://financeuser:password@localhost/financeflow

# Security
SECRET_KEY=your-secret-key-here-generate-random-string
BACKEND_CORS_ORIGINS=["http://localhost:3000","https://yourdomain.com"]

# Optional
DEBUG=False
```

Install python-dotenv:
```bash
pip install python-dotenv
```

Update `backend/main.py`:
```python
from dotenv import load_dotenv
import os

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
```

## 🌐 Frontend Deployment

### Build for Production

```bash
cd frontend
npm run build
```

This creates an optimized build in `frontend/dist/`

### Option 1: Deploy to Vercel (Recommended)

1. Install Vercel CLI:
```bash
npm i -g vercel
```

2. Deploy:
```bash
cd frontend
vercel
```

3. Follow prompts and configure environment variables in Vercel dashboard

### Option 2: Deploy to Netlify

1. Build the project:
```bash
npm run build
```

2. Deploy `dist/` folder to Netlify via drag-and-drop or CLI

### Option 3: Serve with Nginx

1. Copy build files:
```bash
sudo cp -r dist/* /var/www/financeflow/
```

2. Nginx configuration:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    root /var/www/financeflow;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🔧 Backend Deployment

### Option 1: Deploy with Gunicorn (Production)

1. Install Gunicorn:
```bash
pip install gunicorn
```

2. Create systemd service `/etc/systemd/system/financeflow.service`:
```ini
[Unit]
Description=FinanceFlow API
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/path/to/finance-tracker/backend
Environment="PATH=/path/to/finance-tracker/backend/venv/bin"
ExecStart=/path/to/finance-tracker/backend/venv/bin/gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 0.0.0.0:8000

[Install]
WantedBy=multi-user.target
```

3. Start service:
```bash
sudo systemctl start financeflow
sudo systemctl enable financeflow
```

### Option 2: Deploy to Railway

1. Create account at [Railway.app](https://railway.app)
2. Create new project
3. Add PostgreSQL database
4. Deploy from GitHub or upload backend folder
5. Set environment variables in Railway dashboard

### Option 3: Deploy to Render

1. Create account at [Render.com](https://render.com)
2. Create new Web Service
3. Connect to GitHub repo
4. Set build command: `pip install -r requirements.txt`
5. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### Option 4: Docker Deployment

Create `Dockerfile` in backend:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Build and run:
```bash
docker build -t financeflow-backend .
docker run -p 8000:8000 financeflow-backend
```

## 🔒 Security Checklist

- [ ] Use HTTPS (SSL certificate)
- [ ] Add authentication (JWT tokens)
- [ ] Set strong database passwords
- [ ] Use environment variables for secrets
- [ ] Enable CORS only for your domain
- [ ] Add rate limiting
- [ ] Implement input validation
- [ ] Regular security updates
- [ ] Database backups
- [ ] Monitor logs

## 📊 Database Backup

### PostgreSQL Backup Script

Create `backup.sh`:
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/path/to/backups"
pg_dump financeflow > $BACKUP_DIR/financeflow_$DATE.sql
# Keep only last 30 days
find $BACKUP_DIR -name "financeflow_*.sql" -mtime +30 -delete
```

Run daily with cron:
```bash
0 2 * * * /path/to/backup.sh
```

## 🔍 Monitoring

### Setup Logging

Add to `backend/main.py`:
```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('financeflow.log'),
        logging.StreamHandler()
    ]
)
```

### Health Check Endpoint

Add to `backend/main.py`:
```python
@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

## 🚀 Performance Optimization

1. **Database Indexing**: Already included in models
2. **Caching**: Use Redis for frequently accessed data
3. **CDN**: Serve static assets via CDN
4. **Compression**: Enable gzip in Nginx
5. **Database Connection Pool**: Configure SQLAlchemy pool size

## 📱 Mobile App (Optional)

For a mobile version, consider:
1. **React Native** - Reuse React components
2. **Progressive Web App (PWA)** - Add service worker to frontend
3. **Capacitor** - Wrap web app as native app

## 🔄 Continuous Deployment

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build and Deploy to Vercel
        run: vercel --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

## 📞 Support

For production issues:
1. Check application logs
2. Verify database connections
3. Test API endpoints at `/docs`
4. Monitor server resources
5. Review CORS settings

---

**Ready for Production! 🎉**
