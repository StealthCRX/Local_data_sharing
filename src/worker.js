export default {
    async fetch(request, env) {
        const url = new URL(request.url);
        const key = url.pathname.slice(1);

        // Allow PUT requests to upload files
        if (request.method === "PUT") {
            await env.MY_BUCKET.put(key, request.body);
            return new Response(`Put ${key} successfully!`);
        }

        // For everything else, serve static assets (the HTML page)
        return env.ASSETS.fetch(request);
    },
};
