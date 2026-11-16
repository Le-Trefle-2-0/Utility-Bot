const { EmbedBuilder } = require('discord.js');
const { emitLog, channelRef } = require('../../../Utility/logging/helpers');
const { fetchEntry } = require('../../../Utility/logging/audit');

module.exports = async (Client, invite) => {
    if (invite.guild?.id !== Client.settings.mainGuildID) return;
    const entry = await fetchEntry(invite.guild, 42, { match: e => e.changes?.some(c => c.key === 'code' && c.old === invite.code) }); // InviteDelete
    emitLog(Client, 'member', new EmbedBuilder()
        .setTitle('🔗 Invitation supprimée')
        .setDescription(
            `**Code :** \`${invite.code}\`\n` +
            `**Salon :** ${channelRef(invite.channel)}\n` +
            `**Supprimée par :** ${entry?.executorId ? `<@${entry.executorId}>` : 'inconnu (ou expirée / épuisée)'}`
        ));
};
