/**
 * Cloudflare Worker qui sert les transcripts de tickets dans le navigateur.
 * Les transcripts sont déposés dans Workers KV par le bot (Utility/transcriptHost.js).
 *
 * Mise en place (tout est gratuit, uniquement depuis le tableau de bord Cloudflare) :
 *  1. Storage & databases > KV > Create a namespace (ex. "transcripts") : noter son ID.
 *  2. Compute (Workers) > Create > Hello World > nommer le Worker (ex. "transcripts"),
 *     Deploy, puis Edit code : coller ce fichier et Deploy.
 *  3. Worker > Settings > Bindings > Add > KV namespace :
 *     variable name = TRANSCRIPTS, namespace = celui créé à l'étape 1.
 *  4. My Profile > API Tokens > Create Token > Custom token :
 *     permission "Account > Workers KV Storage > Edit". Noter le jeton.
 *  5. Dans le .env du bot : CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, CF_API_TOKEN.
 *     Dans settings.json : tickets.transcriptBaseUrl = "https://<worker>.<compte>.workers.dev/transcript"
 *
 * Les liens ne sont pas indexables et se basent sur l'UUID du ticket (non devinable).
 */
export default {
    async fetch(request, env) {
        const match = new URL(request.url).pathname.match(/^\/transcript\/([0-9a-f-]{36})\/?$/i);

        if (request.method !== 'GET' || !match) {
            return new Response('Not found', { status: 404 });
        }

        const html = await env.TRANSCRIPTS.get(match[1], 'stream');
        if (!html) {
            return new Response('Transcript introuvable', { status: 404 });
        }

        return new Response(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'X-Robots-Tag': 'noindex, nofollow',
                'Referrer-Policy': 'no-referrer',
                'Cache-Control': 'private, no-store'
            }
        });
    }
};
