"use client";

import React, { useState } from "react";
import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import { Dashboard } from "@uppy/react";

import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";

export default function Home() {
  const [uppy] = useState(() => {
    const u = new Uppy({
      id: "simple-uploader",
      autoProceed: false,
      debug: true,
      restrictions: {
        maxFileSize: 150 * 1024 * 1024 * 1024, // 150GB Limit
        maxNumberOfFiles: 50,
        allowedFileTypes: [".mp4", ".insv", ".mkv", ".mov"],
      },
    });

    // @ts-ignore
    u.use(AwsS3, {
      shouldUseMultipart: false,
      getUploadParameters: async (file: any) => {
        const response = await fetch("/api/sign-r2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            contentType: file.type,
          }),
        });

        if (!response.ok) throw new Error("Failed to get signed URL");

        const data = await response.json();

        return {
          method: data.method,
          url: data.url,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        };
      },
    });

    return u;
  });

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-neutral-950 p-6">
      <div className="w-full max-w-4xl">
        <h1 className="text-2xl mb-6 font-mono text-neutral-400 text-center">
          Local Data Sharing
        </h1>

        <div className="border border-neutral-800 rounded-lg overflow-hidden bg-black">
          <Dashboard
            uppy={uppy}
            theme="dark"
            width="100%"
            height="500px"
            showProgressDetails={true}
            proudlyDisplayPoweredByUppy={false}
            note="Files upload directly to R2 Storage"
          />
        </div>
      </div>
    </main>
  );
}
