# Push to GitHub

I have reset the remote to:
`https://github.com/3dmanila-source/BanjaraDataCollector.git`

**Try running this command:**

```bash
git push -u origin main
```

## Potential Errors & Fixes

**1. "Repository not found"**
*   Make sure you have actually created the repository `BanjaraDataCollector` on GitHub.
*   Make sure it is **Public** (or you are logged in).

**2. "Updates were rejected" (Remote contains work)**
*   If you created the repo with a README or License, run this *before* pushing:
    ```bash
    git pull origin main --rebase
    git push -u origin main
    ```
