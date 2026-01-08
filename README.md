# DWA Admin Portal

A professional-grade dashboard for managing crypto market intelligence and sanction lists.

## 🚀 Deployment to GitHub Pages

### 1. Initialize & Push
Run these in your terminal to sync with a new GitHub repository:
```bash
git init
git add .
git commit -m "Clean static build"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git push -u origin main
```

### ⚙️ CRITICAL: Enable Actions Permissions
If your deployment fails on GitHub, you must change this setting:
1. Go to your repository on GitHub.
2. Click **Settings** > **Actions** > **General**.
3. Scroll down to **Workflow permissions**.
4. Select **Read and write permissions**.
5. Click **Save**.

### 🛠️ Tech Stack
- **React** & **Vite**: Modern frontend framework.
- **Tailwind CSS**: Utility-first styling.
- **Lucide React**: Premium iconography.
- **GitHub Actions**: Automated CI/CD.

## 🔒 Security Note
This portal is currently configured as a **Static Application**. It uses `localStorage` for data persistence, ensuring no external database keys or AI API keys are exposed or required for hosting.