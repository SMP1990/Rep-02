# Deployment Guide: Hostinger Node.js

This application is built with a lightweight, production-ready full-stack architecture (**React 19 + Tailwind CSS + Node.js + Express**). It is ready for one-click deployment on Hostinger.

---

## Option 1: Hostinger Node.js Application (Recommended)

Hostinger's Web Hosting and Cloud Hosting include a built-in **Node.js Manager** in hPanel:

1. **Build the Production Assets:**
   ```bash
   npm run build
   ```
   This generates the optimized static files in `./dist/` and bundles the standalone backend in `./dist/server.cjs`.

2. **Upload to Hostinger:**
   - Compress the project root (or download as ZIP from AI Studio).
   - In Hostinger hPanel, go to **Websites** -> **Manage** -> **File Manager** -> `public_html`.
   - Extract your project files into your domain directory.

3. **Configure Node.js in Hostinger hPanel:**
   - In hPanel, search for **Node.js**.
   - Set **Node.js Version**: `20.x` or `22.x`.
   - Set **Application Root**: `/public_html` (or your subfolder).
   - Set **Application Startup File**: `dist/server.cjs`.
   - Set **Application Mode**: `Production`.

4. **Environment Variables:**
   - In the Node.js settings panel, add any necessary environment variables:
     - `PORT`: `3000` (or leave default assigned by Hostinger)
     - `NODE_ENV`: `production`

5. **Start Application:**
   - Click **Run NPM Install** (or install via SSH).
   - Click **Start Application**.

---

## Option 2: Hostinger VPS Deployment (with PM2 & Nginx)

If you are running on a Hostinger VPS:

1. **Install Node.js & PM2:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   sudo npm install -g pm2
   ```

2. **Clone / Upload Project:**
   ```bash
   git clone <your-repo> /var/www/fdownloader
   cd /var/www/fdownloader
   npm install
   npm run build
   ```

3. **Start with PM2:**
   ```bash
   pm2 start ecosystem.config.cjs
   pm2 save
   pm2 startup
   ```

4. **Nginx Reverse Proxy Config:**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com www.yourdomain.com;

       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

---

## Technical Support & Custom Extraction

The backend `/api/video/info` and `/api/video/download-proxy` routes are prepared with clear extension points. Once the user approves the extraction logic, scraping libraries (like `yt-dlp` or headless scraper) can be installed directly.
