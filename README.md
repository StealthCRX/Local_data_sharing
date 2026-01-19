# Local Data Sharing Portal

A simple, serverless file uploader that streams large video files directly to Cloudflare R2 storage.

## How to Deploy (Drag & Drop)

1. **Locate the `dist` folder** in this project.
   - It contains `index.html` (The UI) and `_worker.js` (The Logic).

2. **Go to Cloudflare Dashboard**:
   - Navigate to **Compute (Workers & Pages)** -> **Overview**.
   - Click **Create Application**.
   - Click the **Pages** tab -> **Upload Assets**.
   - Name your project (e.g., `localdatasharing`).

3. **Upload**:
   - Drag and drop the **entire `dist` folder** into the Cloudflare upload box.
   - Click **Deploy Site**.

4. **Connect R2 Bucket**:
   - Once deployed, go to the project's **Settings** -> **Functions**.
   - Scroll down to **R2 Bucket Bindings**.
   - Click **Add binding**.
   - **Variable name**: `MY_BUCKET` (Must be exactly this).
   - **R2 Bucket**: Select your `localdata` bucket.
   - Click **Save**.

5. **Redeploy**:
   - Go to **Deployments** -> **Create new deployment**.
   - Re-upload the same `dist` folder. (This step is necessary to bake in the new binding).

## Features
- **Direct Streaming**: Files go straight from browser -> R2. No server timeouts.
- **Large File Support**: Handles 100GB+ files seamlessly.
- **Zero Config**: No complex build steps required.
