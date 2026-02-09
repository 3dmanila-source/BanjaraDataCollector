# Next Steps: Launching on GitHub

Since the GitHub CLI tool is not installed, I prepared the files locally. Follow these steps to put them online:

1.  **Create a New Repository on GitHub:**
    - Go to [github.com/new](https://github.com/new).
    - Repository name: `BanjaraDataCollector`.
    - Description: "Banjara Language Data Collection Tool".
    - **Do not** check "Initialize with README" (we already have one).
    - Click **Create repository**.

2.  **Push the Code:**
    Open your terminal in `f:\Banjara AI\BanjaraDataCollector` and run:

    ```bash
    git remote add origin https://github.com/<YOUR_USERNAME>/BanjaraDataCollector.git
    git branch -M main
    git push -u origin main
    ```

3.  **Enable GitHub Pages (for online access):**
    - Go to your repository **Settings** > **Pages**.
    - For **Source**, select `main` branch.
    - Click **Save**.
    - Your tool will be available at: `https://<YOUR_USERNAME>.github.io/BanjaraDataCollector/banjara_data_collector.html`

## Data Safety Note
- Your "database" constitutes the exported CSV and Audio files.
- **Do not** rely on the browser cache. Always export your data.
- **Backup:** Upload your exported files to Google Drive or a similar service securely.
