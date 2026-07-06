const { EmbedBuilder, PermissionsBitField, AuditLogEvent, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = async (Client, oldMember, newMember) => {
    if (oldMember.pending && !newMember.pending) {
        Client.emit('guildMemberVerify', newMember);
    }

    // Anti-raid : Alerte de changement de permission Administrateur
    const alertUserId = process.env.ANTI_RAID_ALERT_USER_ID;
    if (!alertUserId || alertUserId === 'YOUR_USER_ID_HERE') return;

    const oldHasAdmin = oldMember.permissions.has(PermissionsBitField.Flags.Administrator);
    const newHasAdmin = newMember.permissions.has(PermissionsBitField.Flags.Administrator);

    if (oldHasAdmin !== newHasAdmin) {
        // Récupération des logs d'audit pour trouver l'auteur de l'action
        let executor = 'Inconnu';
        try {
            const fetchedLogs = await newMember.guild.fetchAuditLogs({
                limit: 1,
                type: AuditLogEvent.MemberRoleUpdate,
            });
            const roleLog = fetchedLogs.entries.first();
            if (roleLog && roleLog.target.id === newMember.id && (Date.now() - roleLog.createdTimestamp) < 5000) {
                executor = roleLog.executor.tag;
            }
        } catch (error) {
            Client.log.error(`Échec de la récupération des logs d'audit : ${error.message}`);
        }

        const alertUser = await Client.users.fetch(alertUserId).catch(() => null);
        const embed = new EmbedBuilder()
            .setTitle('🚨 Alerte Anti-Raid : Changement de permission Administrateur')
            .setDescription(`La permission Administrateur a été ${newHasAdmin ? '**accordée à**' : '**révoquée de**'} un membre.`)
            .addFields(
                { name: 'Membre', value: `${newMember.user.tag} (${newMember.id})`, inline: true },
                { name: 'Action', value: newHasAdmin ? '✅ Accordée' : '❌ Révoquée', inline: true },
                { name: 'Exécuté par', value: executor, inline: true }
            )
            .setColor(newHasAdmin ? 'Red' : 'Yellow')
            .setTimestamp();

        if (alertUser) {
            alertUser.send({ embeds: [embed] }).catch(err => Client.log.error(`Échec de l'envoi du DM anti-raid : ${err.message}`));
        }

        // Log sur Discord (Salon de modération/serveur)
        const sendLog = require('../logs.js');
        const logEmbed = new EmbedBuilder()
            .setAuthor({
                name: newMember.user.displayName || newMember.user.username,
                iconURL: newMember.user.displayAvatarURL({ dynamic: true })
            })
            .setDescription(
                `🚨 **Alerte Anti-Raid : Permission Administrateur**\n\n` +
                `**Membre :** <@${newMember.id}> (\`${newMember.id}\`)\n` +
                `**Action :** ${newHasAdmin ? '✅ Administrateur Accordé' : '❌ Administrateur Révoqué'}\n` +
                `**Exécuté par :** ${executor}`
            )
            .setFooter({ text: `ID de l'utilisateur : ${newMember.id} | Anti-Raid System` });
        
        const components = [];
        if (newHasAdmin && newMember.guild.members.me.roles.highest.position > newMember.roles.highest.position) {
            const revokeButton = new ButtonBuilder()
                .setCustomId(`antiraid_revoke_member_${newMember.id}`)
                .setLabel('Révoquer Administrateur')
                .setStyle(ButtonStyle.Danger);
            components.push(new ActionRowBuilder().addComponents(revokeButton));
        }

        sendLog(Client, 'moderation', logEmbed, components);
    }
}