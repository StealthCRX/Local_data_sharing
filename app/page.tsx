"use client";

import React, { useEffect, useState } from "react";
import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import { Dashboard } from "@uppy/react";

// Import Uppy CSS directly
import "@uppy/core/dist/style.min.css";
import "@uppy/dashboard/dist/style.min.css";

export default function Home() {
  // We use state to ensure Uppy only initializes on the client (browser)
  const [uppy] = useState(() =>
    new Uppy({
      id: "mule-uploader",
      autoProceed: false,
      debug: true,
      restrictions: {
        maxFileSize: 150 * 1024 * 1024 * 1024, // 150GB Limit
        maxNumberOfFiles: 50,
        allowedFileTypes: [".mp4", ".insv", ".mkv", ".mov"],
      },
    }).use(AwsS3, {
      // This is the magic bridge to your API route
      getUploadParameters: async (file) => {
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
          method: data.method as "PUT",
          url: data.url,
          headers: {
            "Content-Type": file.type || "application/octet-stream",
          },
        };
      },
    })
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 p-4 sm:p-24 text-zinc-100">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
        <p className="fixed left-0 top-0 flex w-full justify-center border-b border-zinc-700 bg-zinc-900/50 pb-6 pt-8 backdrop-blur-2xl lg:static lg:w-auto lg:rounded-xl lg:border lg:bg-zinc-800/50 lg:p-4">
          The Mule &nbsp; <code className="font-bold">Data Ingest Portal</code>
        </p>
        <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-black via-black lg:static lg:h-auto lg:w-auto lg:bg-none">
          <span className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0 text-zinc-400">
            Destination: Cloudflare R2
          </span>
        </div>
      </div>

      <div className="mt-12 w-full max-w-4xl relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-teal-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
        <div className="relative bg-zinc-900 rounded-xl shadow-2xl overflow-hidden border border-zinc-800">
          <Dashboard
            uppy={uppy}
            theme="dark"
            width="100%"
            height="550px"
            showProgressDetails={true}
            note="Drag .mp4 or .insv files here. Supports 100GB+ files."
            proudlyDisplayPoweredByUppy={false}
          />
        </div>
      </div>

      <div className="mt-16 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-3 lg:text-left gap-4">
        <InfoCard
          title="Batch Upload"
          desc="Drop 50 files at once. The system will queue them automatically."
        />
        <InfoCard
          title="Direct Edge"
          desc="Files bypass the server and go straight to R2 storage."
        />
        <InfoCard
          title="Resumable"
          desc="If WiFi drops, don't refresh. It will retry automatically."
        />
      </div>
    </main>
  );
}

function InfoCard({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-neutral-700 hover:bg-neutral-800/30">
      <h2 className={`mb-3 text-2xl font-semibold`}>
        {title} <span className="inline-block transition-transform group-hover:translate-x-1 motion-reduce:transform-none">-&gt;</span>
      </h2>
      <p className={`m-0 max-w-[30ch] text-sm opacity-50`}>{desc}</p>
    </div>
  );
}
