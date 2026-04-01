# Deployment Guide

## Prerequisites

- GitHub account
- Vercel account (free tier works)
- Project pushed to https://github.com/Kaneki27/Onelab.git

## ✅ Pre-Deployment Checklist

- [x] Backend tests passing (`npm test` in /backend)
- [x] Frontend builds successfully (`npm run build` in /frontend)
- [x] `.gitignore` includes `node_modules/`
- [x] `vercel.json` configured correctly
- [x] API functions in `/api` folder
- [x] Environment variables: None required
- [x] Git repository pushed to GitHub

## 🚀 Deploy to Vercel (5 minutes)

### Step 1: Link GitHub
```bash
# Ensure latest code is pushed
git push -u origin main
```

### Step 2: Create Vercel Project
1. Go to https://vercel.com/new
2. Click "Import Git Repository"
3. Search for and select `Kaneki27/Onelab`
4. Click "Import"

### Step 3: Configure Project
- **Project Name**: `reconciliation-tool` (auto-filled)
- **Framework Preset**: `Other` (auto-detected)
- **Root Directory**: `./` (leave default)
- **Build Command**: Already set in `vercel.json`
- **Environment Variables**: None needed

### Step 4: Deploy
Click "Deploy" button

Vercel will:
- Clone your repository
- Build the frontend with Vite
- Build API serverless functions
- Deploy everything automatically

### Step 5: Access Your App
Once deployed, you'll get a URL like:
```
https://reconciliation-tool-abc123.vercel.app
```

## 🔄 Continuous Deployment

Every time you push to `main`:
```bash
git add .
git commit -m "Your changes"
git push origin main
```

Vercel automatically:
1. Detects the push
2. Rebuilds frontend + backend
3. Deploys in ~1 minute
4. Gives you a new deployment URL

## 🔧 Environment Variables (if needed later)

To add env variables:
1. Go to Vercel Dashboard
2. Select your project
3. Settings → Environment Variables
4. Add your variables (optional)

For this project: **No environment variables are required**

## 🧪 Verify Deployment

After deployment, test:

```bash
# Test transactions endpoint
curl https://your-vercel-app.vercel.app/api/transactions

# Test reconciliation endpoint
curl https://your-vercel-app.vercel.app/api/reconcile | jq .summary
```

Should return:
- 60 transactions
- Gap detection results
- Summary statistics

## 📊 Monitor Deployment

In Vercel Dashboard:
- **Deployments**: View build logs, rollback if needed
- **Analytics**: Monitor performance and usage
- **Logs**: Real-time API logs
- **Settings**: Configure domains, env vars, etc.

## ⚡ Performance Tips

- Frontend is cached globally via CDN
- API functions auto-scale
- Cold starts are ~200-500ms (acceptable)
- Data is regenerated per-request (in-memory)

## 🐛 Troubleshooting

### "Build failed"
Check Vercel build logs:
1. Go to Deployments tab
2. Click failed deployment
3. View "Build Logs"
Common issues:
- Missing dependencies in `package.json`
- Syntax errors in code
- File path case sensitivity (Linux ≠ Windows)

### "API error 500"
Check Function Logs:
1. Go to Deployments tab
2. Click successful deployment
3. View "Function Logs"
May be due to:
- Import errors in `/api` files
- Missing modules in `/backend`

### "Frontend shows blank page"
1. Check browser console (F12)
2. Verify API URL is correct
3. Check API endpoints are responding

### "CORS errors"
The API functions include CORS headers. If still issues:
1. Check browser Network tab
2. Verify function returns proper headers
3. Test with `curl -i [url]`

## 📝 Local Testing Before Deploy

Always test locally first:

```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend
cd frontend && npm run dev

# Terminal 3: Run tests
cd backend && npm test
```

Then push to GitHub, which triggers Vercel deployment.

## 🎯 Next Steps

1. ✅ Deploy to Vercel
2. Share your deployed URL
3. Monitor real deployments
4. Add custom domain (optional, in Vercel Settings)
5. Set up GitHub notifications (optional)

## 📧 Support

For Vercel-specific help:
- https://vercel.com/docs
- https://vercel.com/support

For this project:
- Check `README.md`
- Review comments in `backend/data.js` and `backend/reconcile.js`
