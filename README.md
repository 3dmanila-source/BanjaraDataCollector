# Banjara Language Data Collection System

## Overview

This project provides a professional data collection tool for training Banjara language AI models. It is a single-file HTML application designed to efficiently collect parallel corpus data (English-Banjara text pairs with audio).

**Goals:**
- Collect 1,000-3,000 parallel sentence pairs.
- Create a dataset for Machine Translation, Speech Recognition, and Text-to-Speech models.

## How to Use

1.  **Open the Tool:** Double-click `banjara_data_collector.html` in your browser.
2.  **Record:**
    - Read the English sentence.
    - Type the Banjara translation.
    - Click "Start Recording", speak, then "Stop Recording".
    - Click "Save & Next Sentence".
3.  **Export:**
    - When finished, click "Export All Data".
    - Save the downloaded files (`.csv` and `.webm`).

## Data Safety

**Important:** This tool runs entirely in your browser. Data is stored in memory and **must be exported** before closing the tab.

**Where is my data?**
- **While Recording:** In your browser's temporary memory.
- **After Export:** In your "Downloads" folder (or wherever you save the files).

**Database Safety:**
Since there is no central server, your "database" consists of the exported CSV and Audio files.
- **Backup Strategy:**
    - Create a folder on your computer for the exports (e.g., `Banjara_Exports`).
    - Upload this folder to Google Drive or Dropbox for cloud backup.
    - Commit small CSVs to this GitHub repository. (Avoid committing thousands of large audio files if possible, or use Git LFS).

## Deployment

To make this tool accessible online:
1.  Go to the **Settings** tab of this GitHub repository.
2.  Scroll to **Pages**.
3.  Select the `main` branch and `/root` folder.
4.  Click **Save**.
5.  Your tool will be live at `https://<your-username>.github.io/BanjaraDataCollector/banjara_data_collector.html`.
