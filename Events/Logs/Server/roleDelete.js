const { EmbedBuilder } = require('discord.js');
const { emitLog, permName, permsList, MODERATION_PERMISSIONS } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');
const { trackSensitive } = require('../../../Utility/logging/tracker');

module.exports = async (Client, role) => {
    const entry = await fetchEntry(role.guild, 32, { targetId: role.id }); // RoleDelete
    const actor = { executorId: entry?.executorId ?? null };
    trackSensitive(Client, role.guild, entry?.executorId, 'roleDelete', `Rôle « ${role.name} »`);

    const embed = new EmbedBuilder()
        .setTitle('🎭 Rôle supprimé')
        .setDescription(
            `**Nom :** ${role.name} (\`${role.id}\`)\n**Couleur :** ${role.hexColor}\n` +
            `**Permissions :** ${permsList(role.permissions).map(permName).join(', ') || 'aucune'}\n` +
            `**Par :** ${executorText(actor, Client)}`
        );
    emitLog(Client, 'server', embed);

    if (entry && entry.executorId !== Client.user.id) {
        emitLog(Client, 'moderation', new EmbedBuilder()
            .setTitle('⚠️ Action sensible : rôle supprimé')
            .setDescription(`**Rôle :** ${role.name}${MODERATION_PERMISSIONS.some(f => role.permissions.has(f)) ? ' *(rôle de modération)*' : ''}\n**Par :** ${executorText(actor, Client)}`));
    }
};
