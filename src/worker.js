import { AwsClient } from 'aws4fetch';

const HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Local Data Sharing</title>
    <style>
        body { background-color: #0a0a0a; color: #e5e5e5; font-family: monospace; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .container { width: 100%; max-width: 600px; padding: 20px; text-align: center; }
        h1 { font-weight: 400; margin-bottom: 2rem; color: #a3a3a3; letter-spacing: -1px; }
        
        #connection-status { margin-bottom: 20px; padding: 8px 16px; border-radius: 20px; background: #171717; display: inline-flex; align-items: center; gap: 8px; font-size: 0.8rem; border: 1px solid #262626; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: #52525b; }
        .dot.connected { background: #22c55e; box-shadow: 0 0 8px rgba(34, 197, 94, 0.4); }
        .dot.error { background: #ef4444; }

        #drop-zone { border: 2px dashed #404040; border-radius: 12px; padding: 4rem 2rem; background: #171717; cursor: pointer; transition: 0.2s; position: relative; overflow: hidden; }
        #drop-zone:hover, #drop-zone.hover { border-color: #3b82f6; background: #1e1e1e; }
        
        .status-item { padding: 12px; border-bottom: 1px solid #262626; display: flex; flex-direction: column; gap: 4px; margin-top: 10px; font-size: 0.9em; background: #111; border-radius: 6px; text-align: left; }
        .row-top { display: flex; justify-content: space-between; align-items: center; }
        .filename { max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .progress-bar { width: 100%; height: 4px; background: #333; border-radius: 2px; overflow: hidden; margin-top: 6px; }
        .progress-fill { height: 100%; background: #3b82f6; width: 0%; transition: width 0.2s; }
        
        .success-text { color: #22c55e; } .error-text { color: #ef4444; }
    </style>
</head>
<body>
<div class="container">
    <div id="connection-status">
        <div class="dot" id="status-dot"></div>
        <span id="status-text">Checking R2 Credentials...</span>
    </div>

    <h1>Data Ingest Portal</h1>
    
    <div id="drop-zone">
        <div style="pointer-events: none;">Drag & Drop files here or Click</div>
    </div>
    <input type="file" id="file-input" multiple style="display: none;">
    <div id="status-list"></div>
</div>
<script>
    const dz = document.getElementById('drop-zone');
    const fi = document.getElementById('file-input');
    const sl = document.getElementById('status-list');
    const statusDot = document.getElementById('status-dot');
    const statusText = document.getElementById('status-text');

    // Check Status
    fetch('/status').then(r => r.json()).then(data => {
        if(data.ok) {
            statusDot.classList.add('connected');
            statusText.textContent = 'R2 Signed URL Mode Ready';
        } else {
            statusDot.classList.add('error');
            statusText.textContent = 'Missing Config';
        }
    });

    dz.onclick = () => fi.click();
    fi.onchange = e => handleFiles(e.target.files);
    dz.ondragover = e => { e.preventDefault(); dz.classList.add('hover'); };
    dz.ondragleave = () => dz.classList.remove('hover');
    dz.ondrop = e => { e.preventDefault(); dz.classList.remove('hover'); handleFiles(e.dataTransfer.files); };

    function handleFiles(files) {
        Array.from(files).forEach(uploadWithSignedUrl);
    }

    async function uploadWithSignedUrl(file) {
        const el = document.createElement('div');
        el.className = 'status-item';
        el.innerHTML = \`
            <div class="row-top">
                <span class="filename">\${file.name}</span>
                <span class="status-msg">Getting Signature...</span>
            </div>
            <div class="progress-bar"><div class="progress-fill"></div></div>
        \`;
        sl.appendChild(el);
        const fill = el.querySelector('.progress-fill');
        const msg = el.querySelector('.status-msg');

        try {
            // 1. Get Signed URL
            const signature = await fetch('/sign', {
                method: 'POST',
                body: JSON.stringify({ key: file.name, type: file.type })
            });
            
            if(!signature.ok) {
                 const txt = await signature.text();
                 throw new Error(txt);
            }
            
            const { url } = await signature.json();
            
            // 2. Upload to R2 directly (XMLHttpRequest for progress)
            msg.textContent = 'Uploading...';
            
            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();
                xhr.open('PUT', url, true);
                xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
                
                xhr.upload.onprogress = (e) => {
                    if (e.lengthComputable) {
                        const percent = (e.loaded / e.total) * 100;
                        fill.style.width = percent + '%';
                    }
                };
                
                xhr.onload = () => {
                   if (xhr.status >= 200 && xhr.status < 300) resolve();
                   else reject(new Error('Upload failed: ' + xhr.statusText));
                };
                
                xhr.onerror = () => reject(new Error('Network Error'));
                xhr.send(file);
            });

            msg.textContent = '✓ Uploaded';
            msg.classList.add('success-text');
            fill.style.background = '#22c55e';

        } catch (err) {
            console.error(err);
            msg.textContent = 'Failed: ' + err.message;
            msg.classList.add('error-text');
            fill.style.background = '#ef4444';
        }
    }
</script>
</body>
</html>
`;

export default {
    async fetch(request, env) {
        const url = new URL(request.url);

        // Status Check
        if (url.pathname === "/status") {
            const ok = !!(env.R2_ACCESS_KEY_ID && env.R2_SECRET_ACCESS_KEY && env.R2_BUCKET_NAME && env.R2_ACCOUNT_ID);
            return new Response(JSON.stringify({ ok }));
        }

        // Serve HTML
        if (request.method === "GET") {
            return new Response(HTML, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
        }

        // Sign URL Endpoint
        if (url.pathname === "/sign" && request.method === "POST") {
            const { key, type } = await request.json();

            if (!env.R2_ACCESS_KEY_ID) return new Response("Missing R2_ACCESS_KEY_ID", { status: 500 });

            const r2 = new AwsClient({
                accessKeyId: env.R2_ACCESS_KEY_ID,
                secretAccessKey: env.R2_SECRET_ACCESS_KEY,
                region: 'auto',
                service: 's3' // Required for aws4fetch
            });

            // The URL must point to the Cloudflare R2 endpoint
            // Correct format: https://<ACCOUNT_ID>.r2.cloudflarestorage.com/<BUCKET_NAME>/<KEY>
            const endpoint = 'https://' + env.R2_ACCOUNT_ID + '.r2.cloudflarestorage.com';
            const path = '/' + env.R2_BUCKET_NAME + '/' + encodeURIComponent(key);
            const fullUrl = new URL(path, endpoint);

            // Sign the request
            // aws4fetch .sign() returns a Request object. We extract the signed URL from it.
            const signed = await r2.sign(fullUrl.toString(), {
                method: 'PUT',
                headers: { 'Content-Type': type || 'application/octet-stream' },
                aws: { signQuery: true } // Sign with query params (Presigned URL)
            });

            return new Response(JSON.stringify({ url: signed.url }));
        }

        return new Response("Not Found", { status: 404 });
    },
};
