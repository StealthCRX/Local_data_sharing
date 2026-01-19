export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const key = url.pathname.slice(1);

        // If it's a PUT request, save to R2
        if (request.method === "PUT") {
            if (!env.MY_BUCKET) {
                return new Response("R2 Bucket binding 'MY_BUCKET' not found.", { status: 500 });
            }
            await env.MY_BUCKET.put(key, request.body);
            return new Response(`Uploaded ${key}`);
        }

        // Otherwise, assume it's a request for a static file (like index.html)
        // The Direct Upload system handles ASSETS automatically, but if we have a _worker.js,
        // we must manually fall back to env.ASSETS.fetch()
        return env.ASSETS.fetch(request);
    },
};
