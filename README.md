# Roobie CMS - Distribution & Release Suite

This is the umbrella repository for **Roobie CMS**. It coordinates submodules, manages the build pipeline, and generates production-ready Windows executables.

## 🏗 Project Architecture
This project utilizes Git Submodules to manage its components:
* `backend/` -> points to [roobie_cms](https://github.com/mwawrzen/roobie_cms)
* `frontend/` -> points to [roobie_dashboard](https://github.com/mwawrzen/roobie_dashboard/)

## 📦 Build & Release Automation
Releases are fully automated via **GitHub Actions** using a custom `scripts/release.ts` build script.

### Build Pipeline Overview
1. **Backend Compilation**: Compiles the server into a single `build_server.exe` using Bun.
2. **Frontend Standalone**: Builds the Next.js UI into a standalone package.
3. **Launcher Generation**: Creates `RoobieCMS.exe`, which manages both processes and automatically opens the browser.
4. **Artifact Bundling**: Packages all components into a single ZIP file with a clean root directory structure.
## ➡️ Installation

Get latest ZIP file from Releases section, make changes in environment variables file if it's needed and run **RoobieCMS.exe**. You will find the initial admin credentials in `.env` file.
