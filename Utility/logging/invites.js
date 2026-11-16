/**
 * Suivi des invitations : Client.invites = Map<guildID, Map<code, { uses, maxUses, inviterId, channelId }>>
 * L'invitation utilisée se déduit en comparant les compteurs avant / après l'arrivée d'un membre.
 */

const snapshot = (invite) => ({
    uses: invite.uses ?? 0,
    maxUses: invite.maxUses ?? 0,
    inviterId: invite.inviter?.id ?? invite.inviterId ?? null,
    channelId: invite.channelId ?? invite.channel?.id ?? null
});

const guildCache = (Client, guildId) => {
    if (!Client.invites) Client.invites = new Map();
    if (!Client.invites.has(guildId)) Client.invites.set(guildId, new Map());
    return Client.invites.get(guildId);
};

const cacheAll = async (Client, guild) => {
    const invites = await guild.invites.fetch();
    if (!Client.invites) Client.invites = new Map();
    Client.invites.set(guild.id, new Map(invites.map(invite => [invite.code, snapshot(invite)])));
    try {
        const vanity = await guild.fetchVanityData();
        if (!Client.vanityUses) Client.vanityUses = new Map();
        Client.vanityUses.set(guild.id, vanity.uses);
    } catch { /* pas d'URL personnalisée */ }
    return invites.size;
};

/** Invitations supprimées il y a peu (une invitation à usage limité disparaît juste après le dernier usage). */
const recentlyDeleted = (Client) => {
    if (!Client.deletedInvites) Client.deletedInvites = new Map();
    return Client.deletedInvites;
};

/**
 * Retourne { code, inviterId, channelId, uses, maxUses, vanity } ou null si indéterminé.
 * Met à jour le cache au passage.
 */
const resolveUsedInvite = async (Client, guild) => {
    const cache = guildCache(Client, guild.id);
    let fresh;
    try {
        fresh = await guild.invites.fetch();
    } catch {
        return null;
    }

    let found = null;
    for (const invite of fresh.values()) {
        const before = cache.get(invite.code);
        if (invite.uses > (before?.uses ?? 0)) {
            found = { code: invite.code, ...snapshot(invite), vanity: false };
            break;
        }
    }

    // Invitation à usage limité épuisée : elle a disparu de la liste
    if (!found) {
        const gone = [...cache.entries()].filter(([code, data]) =>
            !fresh.has(code) && data.maxUses > 0 && data.uses + 1 >= data.maxUses);
        const deleted = recentlyDeleted(Client);
        const candidates = gone.length ? gone : [...deleted.entries()]
            .filter(([, data]) => Date.now() - data.at < 15000 && data.maxUses > 0 && data.uses + 1 >= data.maxUses);
        if (candidates.length === 1) {
            const [code, data] = candidates[0];
            found = { code, ...data, uses: data.uses + 1, vanity: false };
        }
    }

    // URL personnalisée
    if (!found && guild.features.includes('VANITY_URL')) {
        try {
            const vanity = await guild.fetchVanityData();
            const previous = Client.vanityUses?.get(guild.id);
            if (previous !== undefined && vanity.uses > previous) {
                found = { code: vanity.code, inviterId: null, channelId: null, uses: vanity.uses, maxUses: 0, vanity: true };
            }
            if (!Client.vanityUses) Client.vanityUses = new Map();
            Client.vanityUses.set(guild.id, vanity.uses);
        } catch { /* ignoré */ }
    }

    Client.invites.set(guild.id, new Map(fresh.map(invite => [invite.code, snapshot(invite)])));
    return found;
};

module.exports = { snapshot, guildCache, cacheAll, resolveUsedInvite, recentlyDeleted };
