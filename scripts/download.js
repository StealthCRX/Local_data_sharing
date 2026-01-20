
const fs = require('fs');
const path = require('path');
const { S3Client, ListObjectsV2Command, GetObjectCommand } = require('@aws-sdk/client-s3');
const { pipeline } = require('stream/promises');

// Read configuration from wrangler.json
const wranglerConfigPath = path.join(__dirname, '../wrangler.json');
let config;

try {
    const rawConfig = fs.readFileSync(wranglerConfigPath, 'utf8');
    config = JSON.parse(rawConfig);
} catch (error) {
    console.error('Error reading wrangler.json:', error);
    process.exit(1);
}

const vars = config.vars;

if (!vars || !vars.R2_ACCOUNT_ID || !vars.R2_ACCESS_KEY_ID || !vars.R2_SECRET_ACCESS_KEY || !vars.R2_BUCKET_NAME) {
    console.error('Missing R2 variables in wrangler.json');
    process.exit(1);
}

const R2_ACCOUNT_ID = vars.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = vars.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = vars.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = vars.R2_BUCKET_NAME;

const downloadDir = path.join(__dirname, '../downloads');

if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir, { recursive: true });
}

const S3 = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

async function main() {
    console.log(`Connecting to R2 Bucket: ${R2_BUCKET_NAME}...`);

    try {
        // List objects
        const listCommand = new ListObjectsV2Command({ Bucket: R2_BUCKET_NAME });
        const data = await S3.send(listCommand);

        if (!data.Contents || data.Contents.length === 0) {
            console.log('No files found in the bucket.');
            return;
        }

        console.log(`Found ${data.Contents.length} files. Starting download...`);

        for (const file of data.Contents) {
            const fileName = file.Key;
            const filePath = path.join(downloadDir, fileName);

            console.log(`Downloading ${fileName}...`);

            const getCommand = new GetObjectCommand({ Bucket: R2_BUCKET_NAME, Key: fileName });
            const response = await S3.send(getCommand);

            await pipeline(response.Body, fs.createWriteStream(filePath));
            console.log(`✓ Saved to ${filePath}`);
        }

        console.log('All downloads complete!');

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
