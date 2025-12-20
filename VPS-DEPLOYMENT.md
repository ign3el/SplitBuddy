# VPS Deployment Guide - SplitBuddy

## Overview
Deploy SplitBuddy on a single VPS with nested subdomains:
- **Frontend**: https://www.splitbuddy.ign3el.com
- **Backend**: https://api.splitbuddy.ign3el.com
- **Database**: MySQL on the same VPS

## Prerequisites
- Ubuntu/Debian VPS with root access
- Domain `ign3el.com` DNS configured with A records:
  - `www.splitbuddy.ign3el.com` → VPS IP
  - `api.splitbuddy.ign3el.com` → VPS IP
  - `splitbuddy.ign3el.com` → VPS IP (optional redirect to www)
- Node.js 18+ installed
- MySQL installed and running
- Nginx installed
- PM2 installed globally: `npm install -g pm2`

## 1. Initial Server Setup

### Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MySQL
sudo apt install mysql-server -y
sudo mysql_secure_installation

# Install Nginx
sudo apt install nginx -y

# Install PM2 globally
sudo npm install -g pm2

# Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx -y
```

### Setup MySQL Database
```bash
sudo mysql

# In MySQL shell:
CREATE DATABASE splitbuddy_db;
CREATE USER 'splitbuddy'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON splitbuddy_db.* TO 'splitbuddy'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 2. Clone Repository

```bash
# Create directory
sudo mkdir -p /var/www/splitbuddy
sudo chown -R $USER:$USER /var/www/splitbuddy

# Clone repo
cd /var/www/splitbuddy
git clone https://github.com/ign3el/SplitBuddy.git .
```

## 3. Configure Backend Environment

Create `/var/www/splitbuddy/server/.env`:
```bash
# Database
DB_HOST=localhost
DB_PORT=3306
DB_USER=splitbuddy
DB_PASSWORD=your_secure_password
DB_NAME=splitbuddy_db
DB_SSL_REQUIRED=false

# JWT
JWT_SECRET=generate_a_long_random_string_here

# CORS
CORS_ORIGIN=https://www.splitbuddy.ign3el.com

# Email (optional)
MOCK_EMAIL=true
# Or configure SMTP:
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your@email.com
# SMTP_PASSWORD=your_smtp_password
# SMTP_SECURE=false

# URLs
FRONTEND_URL=https://www.splitbuddy.ign3el.com
RESET_PUBLIC_URL=https://api.splitbuddy.ign3el.com
VERIFY_PUBLIC_URL=https://api.splitbuddy.ign3el.com

# Server
PORT=3003
```

## 4. Setup SSL Certificates

```bash
# Get certificates for both subdomains
sudo certbot certonly --nginx -d www.splitbuddy.ign3el.com -d splitbuddy.ign3el.com
sudo certbot certonly --nginx -d api.splitbuddy.ign3el.com

# Auto-renewal (certbot should set this up automatically)
sudo certbot renew --dry-run
```

## 5. Configure Nginx

```bash
# Copy nginx configs
sudo cp /var/www/splitbuddy/nginx-frontend.conf /etc/nginx/sites-available/splitbuddy-frontend
sudo cp /var/www/splitbuddy/nginx-backend.conf /etc/nginx/sites-available/splitbuddy-backend

# Enable sites
sudo ln -s /etc/nginx/sites-available/splitbuddy-frontend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/splitbuddy-backend /etc/nginx/sites-enabled/

# Test nginx config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

## 6. Initial Build and Deploy

```bash
cd /var/www/splitbuddy

# Install dependencies
npm install
cd server && npm install && cd ..

# Build frontend
npm run build

# Deploy frontend
sudo mkdir -p /var/www/splitbuddy/frontend
sudo cp -r dist/* /var/www/splitbuddy/frontend/

# Start backend with PM2
cd server
pm2 start index.js --name splitbuddy-backend
pm2 save
pm2 startup  # Follow the instructions to enable PM2 on boot
```

## 7. Deployment Script

Make the deploy script executable:
```bash
chmod +x /var/www/splitbuddy/deploy.sh
```

To deploy updates:
```bash
cd /var/www/splitbuddy
./deploy.sh
```

## 8. Firewall Configuration

```bash
# Allow Nginx
sudo ufw allow 'Nginx Full'

# Allow SSH
sudo ufw allow OpenSSH

# Enable firewall
sudo ufw enable
```

## 9. Monitoring

```bash
# Check backend logs
pm2 logs splitbuddy-backend

# Check Nginx logs
sudo tail -f /var/log/nginx/splitbuddy-api-access.log
sudo tail -f /var/log/nginx/splitbuddy-frontend-access.log

# Check PM2 status
pm2 status

# Monitor backend
pm2 monit
```

## 10. Subdomain Cookie Sharing

The backend is configured to set cookies with `domain: .splitbuddy.ign3el.com`, which allows:
- Cookies set by `api.splitbuddy.ign3el.com` to be accessible by `www.splitbuddy.ign3el.com`
- Session sharing between frontend and backend subdomains
- Secure cross-subdomain authentication

This is handled in `server/app.js` with the CORS configuration:
```javascript
cors({ 
  origin: 'https://www.splitbuddy.ign3el.com',
  credentials: true 
})
```

And the frontend makes requests with `credentials: 'include'` in the fetch calls.

## Troubleshooting

### Backend not accessible
```bash
# Check if backend is running
pm2 status
pm2 logs splitbuddy-backend

# Restart backend
pm2 restart splitbuddy-backend
```

### Nginx errors
```bash
# Test config
sudo nginx -t

# Check error logs
sudo tail -f /var/log/nginx/error.log
```

### SSL certificate issues
```bash
# Renew certificates manually
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

### Database connection issues
```bash
# Check MySQL status
sudo systemctl status mysql

# Test connection
mysql -u splitbuddy -p splitbuddy_db
```

## Security Best Practices

1. **Use strong passwords** for MySQL and JWT_SECRET
2. **Keep system updated**: `sudo apt update && sudo apt upgrade`
3. **Enable fail2ban**: `sudo apt install fail2ban`
4. **Configure firewall** properly with ufw
5. **Regular backups** of MySQL database:
   ```bash
   mysqldump -u splitbuddy -p splitbuddy_db > backup.sql
   ```
6. **Monitor logs** regularly for suspicious activity
7. **Keep SSL certificates** renewed (certbot auto-renewal should handle this)

## Updating the Application

### Manual Deployment
Simply run the deployment script:
```bash
cd /var/www/splitbuddy
./deploy.sh
```

This will:
1. Pull latest code from Git
2. Install dependencies
3. Build frontend
4. Deploy frontend to Nginx directory
5. Restart backend with PM2

### Automatic Deployment with GitHub Actions

The repository includes a GitHub Actions workflow that automatically deploys to your VPS on every push to the `main` branch.

#### Setup GitHub Secrets

1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Add the following repository secrets:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `VPS_HOST` | Your VPS IP address or domain | `123.45.67.89` or `vps.ign3el.com` |
| `VPS_USERNAME` | SSH username (usually `root` or your user) | `root` |
| `VPS_SSH_KEY` | Private SSH key for authentication | *(see below)* |
| `VPS_PORT` | SSH port (optional, defaults to 22) | `22` |

#### Generate and Configure SSH Key

On your **local machine**:

```bash
# Generate a new SSH key pair (if you don't have one)
ssh-keygen -t ed25519 -C "github-actions-splitbuddy" -f ~/.ssh/vps_deploy_key

# Copy the public key
cat ~/.ssh/vps_deploy_key.pub
```

On your **VPS**:

```bash
# Add the public key to authorized_keys
echo "your-public-key-here" >> ~/.ssh/authorized_keys

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

On **GitHub**:

1. Copy the **private key** content:
   ```bash
   cat ~/.ssh/vps_deploy_key
   ```
2. Add it as the `VPS_SSH_KEY` secret (copy the entire output including `-----BEGIN` and `-----END` lines)

#### Test the Workflow

1. Make any change to your code
2. Commit and push to `main`:
   ```bash
   git add .
   git commit -m "Test auto-deployment"
   git push origin main
   ```
3. Go to **Actions** tab in your GitHub repository to watch the deployment progress
4. Check your site after the workflow completes

#### Manual Trigger

You can also manually trigger deployment from GitHub:
1. Go to **Actions** tab
2. Select **Deploy to VPS** workflow
3. Click **Run workflow** → **Run workflow**

#### Troubleshooting GitHub Actions

**SSH Connection Failed:**
- Verify `VPS_HOST` is correct (IP or domain)
- Check firewall allows SSH from GitHub Actions IPs
- Ensure SSH key is added to `authorized_keys` correctly

**Permission Denied:**
- Check `VPS_USERNAME` is correct
- Verify the user has permissions for `/var/www/splitbuddy`
- Ensure `deploy.sh` is executable: `chmod +x /var/www/splitbuddy/deploy.sh`

**Deploy Script Errors:**
- SSH into VPS manually and run `./deploy.sh` to see detailed errors
- Check PM2 is installed: `pm2 --version`
- Verify all dependencies are installed
