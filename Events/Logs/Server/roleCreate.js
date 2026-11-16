const { EmbedBuilder } = require('discord.js');
const { emitLog, roleRef, permName, permsList } = require('../../../Utility/logging/helpers');
const { fetchEntry, executorText } = require('../../../Utility/logging/audit');
const { trackSensitive } = require('../../../Utility/logging/tracker');

module.exports = async (Client, role) => {
    const entry = await fetchEntry(role.guild, 30, { targetId: role.id }); // RoleCreate
    trackSensitive(Client, role.guild, entry?.executorId, 'roleCreate', `Rôle « ${role.name} »`);
    emitLog(Client, 'server', new EmbedBuilder()
        .setTitle('🎭 Rôle créé')
        .setDescription(
            `**Rôle :** ${roleRef(role)} (\`${role.id}\`)\n**Nom :** ${role.name}\n**Couleur :** ${role.hexColor}\n` +
            `**Affiché séparément :** ${role.hoist ? 'oui' : 'non'} — **Mentionnable :** ${role.mentionable ? 'oui' : 'non'}\n` +
            `**Permissions :** ${permsList(role.permissions).map(permName).join(', ') || 'aucune'}\n` +
            `**Par :** ${executorText({ executorId: entry?.executorId }, Client)}`
        ));
};
