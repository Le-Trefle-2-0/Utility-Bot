const { EmbedBuilder, PermissionsBitField, AuditLogEvent, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = async (Client, oldRole, newRole) => {
    // Anti-raid : Alerte de changement de permission Administrateur sur un rôle
    const alertUserId = process.env.ANTI_RAID_ALERT_USER_ID;
    if (!alertUserId || alertUserId === 'YOUR_USER_ID_HERE') return;

    const oldHasAdmin = oldRole.permissions.has(PermissionsBitField.Flags.Administrator);
    const newHasAdmin = newRole.permissions.has(PermissionsBitField.Flags.Administrator);

    if (oldHasAdmin !== newHasAdmin) {
        // Récupération des logs d'audit pour trouver l'auteur de l'action
        let executor = 'Inconnu';
        try {
            const fetchedLogs = await newRole.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.RoleUpdate,
            });
            const roleLog = fetchedLogs.entries.first();
            if (roleLog && roleLog.target.id === newRole.id && (Date.now() - roleLog.createdTimestamp) < 5000) {
                executor = roleLog.executor.tag;
            }
        } catch (error) {
            Client.log.error(`Échec de la récupération des logs d'audit : ${error.message}`);
        }

        const alertUser = await Client.users.fetch(alertUserId).catch(() => null);
        const embed = new EmbedBuilder()
            .setTitle('🚨 Alerte Anti-Raid : Changement de permission Administrateur sur un rôle')
            .setDescription(`La permission Administrateur a été ${newHasAdmin ? '**accordée au**' : '**révoquée du**'} rôle **${newRole.name}**.`)
            .addFields(
                { name: 'Rôle', value: `${newRole.name} (${newRole.id})`, inline: true },
                { name: 'Action', value: newHasAdmin ? '✅ Accordée' : '❌ Révoquée', inline: true },
                { name: 'Exécuté par', value: executor, inline: true },
                { name: 'Serveur', value: `${newRole.guild.name}`, inline: true }
            )
            .setColor(newHasAdmin ? 'Red' : 'Yellow')
            .setTimestamp();

        if (alertUser) {
            alertUser.send({ embeds: [embed] }).catch(err => Client.log.error(`Échec de l'envoi du DM anti-raid : ${err.message}`));
        }

        // Log sur Discord (Salon de serveur/modération)
        const sendLog = require('../logs.js');
        const logContent = `**Rôle :** ${newRole.name} (${newRole.id})\n` +
                           `**Action :** ${newHasAdmin ? '✅ Administrateur Accordé' : '❌ Administrateur Révoqué'}\n` +
                           `**Exécuté par :** ${executor}`;
        
        const components = [];
        if (newHasAdmin && newRole.guild.members.me.roles.highest.position > newRole.position) {
            const revokeButton = new ButtonBuilder()
                .setCustomId(`antiraid_revoke_role_${newRole.id}`)
                .setLabel('Révoquer Administrateur')
                .setStyle(ButtonStyle.Danger);
            components.push(new ActionRowBuilder().addComponents(revokeButton));
        }

        sendLog(Client, 'server', '🚨 Alerte Anti-Raid : Permission sur Rôle', logContent, 'Anti-Raid System', null, components);
    }
}
