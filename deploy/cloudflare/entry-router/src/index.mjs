const CanonicalHostname = "evanopolis.falafel.com.br";
const UpstreamOrigin = "https://falafel-open-games.github.io";
const UpstreamBasePath = "/evanopolis-v1";

export function upstreamUrlFor(requestUrl) {
    const incomingUrl = new URL(requestUrl);
    let upstreamPath = incomingUrl.pathname;

    if (upstreamPath === "/") {
        upstreamPath = "/room-entry.html";
    } else if (upstreamPath === "/free") {
        upstreamPath = "/free-entry.html";
    }

    const upstreamUrl = new URL(`${UpstreamBasePath}${upstreamPath}`, UpstreamOrigin);
    upstreamUrl.search = incomingUrl.search;
    return upstreamUrl;
}

export async function handleRequest(request) {
    const incomingUrl = new URL(request.url);

    if (incomingUrl.hostname !== CanonicalHostname) {
        return new Response("Unknown host.\n", { status: 421 });
    }
    if (incomingUrl.pathname === "/free/") {
        const canonicalUrl = new URL(request.url);
        canonicalUrl.pathname = "/free";
        return Response.redirect(canonicalUrl, 308);
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method not allowed.\n", {
            status: 405,
            headers: { Allow: "GET, HEAD" },
        });
    }

    const upstreamRequest = new Request(upstreamUrlFor(request.url), request);
    return fetch(upstreamRequest);
}

export default {
    fetch(request) {
        return handleRequest(request);
    },
};
