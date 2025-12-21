# GitHub Actions Deployment Setup

This guide explains how to set up automatic VPS deployment using GitHub Actions.

## What It Does

Every time you push to the `main` branch, GitHub Actions will:
1. SSH into your VPS
2. Pull the latest code
3. Stop and rebuild Docker containers
4. Start the updated application

## Setup Instructions

### Step 1: Generate SSH Key (if you don't have one)

```bash
ssh-keygen -t ed25519 -C "github-deploy" -f ~/.ssh/github_deploy
```

### Step 2: Add SSH Key to Your VPS

Copy the public key to your VPS's authorized_keys:

```bash
cat ~/.ssh/github_deploy.pub | ssh user@your-vps-ip "mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys"
```

### Step 3: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and Variables → Actions

Add the following secrets:

| Secret Name | Value |
|-------------|-------|
| `VPS_HOST` | Your VPS IP address or domain (e.g., `192.168.1.100`) |
| `VPS_USER` | SSH username (e.g., `root` or `deploy`) |
| `VPS_SSH_KEY` | Contents of your private key file (`~/.ssh/github_deploy`) |
| `VPS_PORT` | SSH port (optional, defaults to 22) |

**To get your private key content:**
```bash
cat ~/.ssh/github_deploy
```

Copy the entire content (including `-----BEGIN OPENSSH PRIVATE KEY-----` lines) into the `VPS_SSH_KEY` secret.

### Step 4: Verify VPS Setup

Ensure your VPS has:
- ✅ Docker and Docker Compose installed
- ✅ Git installed
- ✅ Repository cloned at `~/SplitBuddy`
- ✅ `.env` file configured with required variables
- ✅ SSH key added to `authorized_keys`

### Step 5: Test Deployment

Push a small change to main:
```bash
git add .
git commit -m "Test deployment"
git push origin main
```

Check the GitHub Actions tab in your repository to see the deployment status.

## Workflow Details

The deployment workflow (`.github/workflows/deploy.yml`):

```yaml
- Triggers on: push to main branch
- Uses: appleboy/ssh-action (secure SSH execution)
- Runs:
  1. cd ~/SplitBuddy
  2. git pull origin main
  3. docker-compose down (stop current containers)
  4. docker-compose up -d --build (rebuild and start)
  5. docker-compose logs -f backend (show logs)
```

## Troubleshooting

### "Permission denied (publickey)"
- Verify SSH key is in VPS's `~/.ssh/authorized_keys`
- Check SSH key permissions: `chmod 600 ~/.ssh/authorized_keys`

### "Repository not found"
- SSH into VPS and verify repo exists at `~/SplitBuddy`
- Check git remote: `cd ~/SplitBuddy && git remote -v`

### "Docker not found"
- Install Docker on VPS: `curl -fsSL https://get.docker.com | sh`
- Install Docker Compose: `apt-get install docker-compose`

### Workflow fails silently
- Check GitHub Actions logs: Go to Actions tab → Click on failed workflow
- Review error messages and adjust VPS paths if needed

## Optional: Add Environment Variables

If your deployment needs environment variables, add them to VPS before deployment:

```bash
# SSH into VPS and create/update .env
cd ~/SplitBuddy
nano .env
# Add your variables
```

Or update the workflow to pass them:

```yaml
script: |
  cd ~/SplitBuddy
  export VITE_API_URL=https://your-api.com
  git pull origin main
  docker-compose down
  docker-compose up -d --build
```

## Manual Workflow Trigger

You can manually trigger the deployment from GitHub:
1. Go to Actions tab
2. Select "Deploy to VPS" workflow
3. Click "Run workflow"
4. Select the branch and click "Run workflow"

## Monitoring Deployments

View deployment logs in GitHub:
1. Go to Actions tab
2. Click on the workflow run
3. Expand the "SSH and Deploy" step to see output

## Rollback

If deployment fails, SSH into your VPS and:

```bash
cd ~/SplitBuddy
git reset --hard HEAD~1
docker-compose down
docker-compose up -d
```

## Security Best Practices

✅ Use ED25519 SSH keys (more secure than RSA)
✅ Use a dedicated deploy user with limited permissions
✅ Rotate SSH keys regularly
✅ Keep GitHub secrets secure
✅ Use environment variables for sensitive data
✅ Monitor deployment logs for suspicious activity
