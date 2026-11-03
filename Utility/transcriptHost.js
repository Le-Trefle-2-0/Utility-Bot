/**
 * Hébergement en ligne des transcripts de tickets (Cloudflare Workers KV, offre gratuite).
 * Le bot dépose le HTML dans un namespace KV ; un Worker (cloudflare/transcript-worker.mjs)
 * le sert dans le navigateur sur `${tickets.transcriptBaseUrl}/<id>`.
 *
 * Variables d'environnement : CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, CF_API_TOKEN
 * settings.json : tickets.transcriptBaseUrl (ex. "https://transcripts.xxx.workers.dev/transcript")
 */

const fs = require('fs');
const path = require('path');
const ticketsConfig = require('../config/ticketsConfig');

// Limite des valeurs Workers KV : 25 MiB
const MAX_BYTES = 25 * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 20000;

const TRANSCRIPTS_DIR = path.join(__dirname, '../Transcripts');
const TRANSCRIPT_FILE = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.html$/i;

// Bornes d'une synchronisation : l'offre gratuite autorise 1 000 écritures par jour
const MAX_UPLOADS_PER_SYNC = 100;
const MAX_CONSECUTIVE_FAILURES = 3;

const isConfigured = () => Boolean(
    process.env.CF_ACCOUNT_ID
    && process.env.CF_KV_NAMESPACE_ID
    && process.env.CF_API_TOKEN
    && ticketsConfig.getTicketsConfig().transcriptBaseUrl
);

const getTranscriptUrl = (id) =>
    `${ticketsConfig.getTicketsConfig().transcriptBaseUrl.replace(/\/+$/, '')}/${encodeURIComponent(id)}`;

async function putOnce(id, buffer) {
    const { CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, CF_API_TOKEN } = process.env;
    const response = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE_ID}/values/${encodeURIComponent(id)}`,
        {
            method: 'PUT',
            headers: {
                'Authorization': ['Bearer', CF_API_TOKEN].join(' '),
                'Content-Type': 'application/octet-stream'
            },
            body: buffer,
            signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS)
        }
    );

    if (!response.ok) {
        throw new Error(`Cloudflare KV HTTP ${response.status}`);
    }
}

/**
 * Dépose le transcript en ligne.
 * @returns {Promise<string>} l'URL consultable dans un navigateur
 * @throws si l'hébergement n'est pas configuré, si le fichier est trop gros ou si l'envoi échoue
 */
async function uploadTranscript(id, buffer) {
    if (!isConfigured()) throw new Error('Transcript hosting is not configured');
    if (buffer.length > MAX_BYTES) throw new Error(`Transcript too large (${buffer.length} bytes)`);

    try {
        await putOnce(id, buffer);
    } catch (firstError) {
        // Une seule nouvelle tentative, pour absorber un incident réseau passager
        await new Promise(resolve => setTimeout(resolve, 1500));
        try {
            await putOnce(id, buffer);
        } catch {
            throw firstError;
        }
    }

    return getTranscriptUrl(id);
}

/**
 * Liste les transcripts déjà présents dans Workers KV
 * @returns {Promise<Set<string>>} les identifiants (en minuscules)
 */
async function listUploadedIds() {
    const { CF_ACCOUNT_ID, CF_KV_NAMESPACE_ID, CF_API_TOKEN } = process.env;
    const ids = new Set();
    let cursor;

    // Garde-fou : 50 pages de 1 000 clés
    for (let page = 0; page < 50; page++) {
        const url = new URL(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/storage/kv/namespaces/${CF_KV_NAMESPACE_ID}/keys`);
        url.searchParams.set('limit', '1000');
        if (cursor) url.searchParams.set('cursor', cursor);

        const response = await fetch(url, {
            headers: { 'Authorization': ['Bearer', CF_API_TOKEN].join(' ') },
            signal: AbortSignal.timeout(UPLOAD_TIMEOUT_MS)
        });
        if (!response.ok) throw new Error(`Cloudflare KV list HTTP ${response.status}`);

        const body = await response.json();
        for (const key of body.result ?? []) ids.add(key.name.toLowerCase());

        cursor = body.result_info?.cursor;
        if (!cursor) break;
    }

    return ids;
}

let syncing = false;

/**
 * Met en ligne les transcripts enregistrés dans /Transcripts qui ne le sont pas encore
 * (ticket fermé pendant une panne de Cloudflare, hébergement configuré après coup, etc.).
 * Si la liste des transcripts déjà en ligne est introuvable, rien n'est envoyé.
 */
async function syncStoredTranscripts(dir = TRANSCRIPTS_DIR) {
    const result = { uploaded: 0, failed: 0, tooLarge: 0, remaining: 0 };
    if (syncing || !isConfigured()) return result;

    syncing = true;
    try {
        let files;
        try {
            files = await fs.promises.readdir(dir);
        } catch (error) {
            if (error.code === 'ENOENT') return result;
            throw error;
        }

        const stored = files.map(file => file.match(TRANSCRIPT_FILE)?.[1]).filter(Boolean);
        if (!stored.length) return result;

        const uploaded = await listUploadedIds();
        const missing = stored.filter(id => !uploaded.has(id.toLowerCase()));
        result.remaining = Math.max(0, missing.length - MAX_UPLOADS_PER_SYNC);

        let consecutiveFailures = 0;
        for (const id of missing.slice(0, MAX_UPLOADS_PER_SYNC)) {
            const buffer = await fs.promises.readFile(path.join(dir, `${id}.html`));
            if (buffer.length > MAX_BYTES) {
                result.tooLarge++;
                continue;
            }

            try {
                await uploadTranscript(id, buffer);
                result.uploaded++;
                consecutiveFailures = 0;
            } catch {
                result.failed++;
                // Cloudflare injoignable : inutile d'insister, la prochaine synchronisation reprendra
                if (++consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
                    result.remaining = missing.length - result.uploaded - result.failed - result.tooLarge;
                    break;
                }
            }
        }

        return result;
    } finally {
        syncing = false;
    }
}

module.exports = { isConfigured, uploadTranscript, getTranscriptUrl, syncStoredTranscripts, listUploadedIds };
