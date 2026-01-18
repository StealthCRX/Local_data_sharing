import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";

// 1. Force Cloudflare Pages Edge Runtime
export const runtime = 'edge';

// 2. Configure the R2 Client
const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

export async function POST(request: Request) {
  try {
    // 3. Parse the incoming request
    const { filename, contentType } = await request.json();

    if (!filename || !contentType) {
      return NextResponse.json(
        { error: "Missing filename or content type" },
        { status: 400 }
      );
    }

    // 4. sanitize filename to prevent overwrites (Optional but recommended)
    // Adds a timestamp: "myvideo.mp4" -> "16999999-myvideo.mp4"
    const uniqueFilename = `${Date.now()}-${filename}`;

    // 5. Prepare the upload command
    const command = new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: uniqueFilename,
      ContentType: contentType,
      // ACL: "public-read", // Uncomment only if you want files public immediately
    });

    // 6. Generate the Magic URL (Valid for 1 hour)
    // This URL allows the browser to bypass the server and upload straight to R2
    const signedUrl = await getSignedUrl(r2, command, { expiresIn: 3600 });

    return NextResponse.json({ 
      url: signedUrl, 
      method: "PUT",
      fields: {} // Uppy expects this structure
    });

  } catch (error) {
    console.error("R2 Signing Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error signing URL" },
      { status: 500 }
    );
  }
}
