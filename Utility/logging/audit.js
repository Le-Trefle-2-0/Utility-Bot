const { sleep } = require('./helpers');

/**
 * Cherche dans le journal d'audit l'entrée récente qui correspond à une action.
 * Le journal d'audit est alimenté avec un léger retard : on patiente `delay` ms avant de lire.
 * Retourne l'entrée ou null (permission manquante, entrée absente, etc.).
 */
const fetchEntry = async (guild, type, { targetId, maxAge = 15000, delay = 1200, match, limit = 10 } = {}) => {
    try {
        if (!guild?.members?.me?.permissions?.has('ViewAuditLog')) return null;
        if (delay) await sleep(delay);
        const logs = await guild.fetchAuditLogs({ type, limit });
        const now = Date.now();
        return logs.entries.find(entry =>
            now - entry.createdTimestamp <= maxAge &&
            (!targetId || entry.targetId === targetId) &&
            (!match || match(entry))
        ) || null;
    } catch {
        return null;
    }
};

/**
 * Contexte laissé par les commandes du bot : quand le bot applique lui-même une sanction
 * (timeout via menu contextuel, softban…), l'auteur dans le journal d'audit est le bot.
 * La commande enregistre donc le vrai modérateur ici avant d'agir.
 */
const setModContext = (Client, targetId, type, data) => {
    if (!Client.modContext) Client.modContext = new Map();
    const key = `${type}:${targetId}`;
    Client.modContext.set(key, { ...data, at: Date.now() });
    setTimeout(() => Client.modContext?.delete(key), 60_000).unref?.();
};

const peekModContext = (Client, targetId, type) => {
    const entry = Client.modContext?.get(`${type}:${targetId}`);
    return entry && Date.now() - entry.at < 60_000 ? entry : null;
};

/**
 * Détermine l'auteur d'une action : contexte de commande d'abord, journal d'audit ensuite.
 * Retourne { executorId, reason, viaBot, entry }.
 */
const resolveActor = async (Client, guild, type, targetId, contextType, options = {}) => {
    const ctx = contextType ? peekModContext(Client, targetId, contextType) : null;
    if (ctx) return { executorId: ctx.moderatorId, reason: ctx.reason ?? null, viaBot: true, entry: null, context: ctx };
    const entry = await fetchEntry(guild, type, { targetId, ...options });
    if (!entry) return { executorId: null, reason: null, viaBot: false, entry: null };
    return { executorId: entry.executorId, reason: entry.reason ?? null, viaBot: entry.executorId === Client.user?.id, entry };
};

const executorText = (actor, Client) => {
    if (!actor?.executorId) return '*inconnu (journal d\'audit indisponible)*';
    if (actor.executorId === Client.user?.id && !actor.viaBot) return `🤖 le bot (<@${actor.executorId}>)`;
    return `<@${actor.executorId}> (\`${actor.executorId}\`)`;
};

module.exports = { fetchEntry, setModContext, peekModContext, resolveActor, executorText };
