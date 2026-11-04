const { guildCache, recentlyDeleted } = require('../Utility/logging/invites');

// Une invitation à usage limité est supprimée juste après son dernier usage : on la garde en mémoire quelques secondes
module.exports = async (Client, invite) => {
    if (invite.guild.id !== Client.settings.mainGuildID) return;

    const cache = guildCache(Client, invite.guild.id);
    const previous = cache.get(invite.code);
    if (previous) recentlyDeleted(Client).set(invite.code, { ...previous, at: Date.now() });
    cache.delete(invite.code);
    setTimeout(() => recentlyDeleted(Client).delete(invite.code), 20_000).unref?.();
};
