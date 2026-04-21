const { EmbedBuilder, PermissionsBitField, AuditLogEvent } = require('discord.js');

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
        if (alertUser) {
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

            alertUser.send({ embeds: [embed] }).catch(err => Client.log.error(`Échec de l'envoi du DM anti-raid : ${err.message}`));
        }
    }
}