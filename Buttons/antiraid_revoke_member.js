const { PermissionsBitField } = require('discord.js');

module.exports = async (Client, interaction) => {
    // Format customId: antiraid_revoke_member_{memberId}
    const targetId = interaction.customId.split('_').pop();

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "Seul un administrateur peut utiliser ce bouton.", ephemeral: true });
    }

    const targetMember = await interaction.guild.members.fetch(targetId).catch(() => null);
    if (!targetMember) return interaction.reply({ content: "Membre introuvable.", ephemeral: true });

    // Vérification de la hiérarchie du bot
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({ content: "Je n'ai pas la permission de gérer les rôles.", ephemeral: true });
    }

    if (interaction.guild.members.me.roles.highest.position <= targetMember.roles.highest.position) {
        return interaction.reply({ content: "Je ne peux pas modifier ce membre car il possède un rôle supérieur ou égal au mien.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        // Identifier les rôles qui donnent la permission Administrateur
        const adminRoles = targetMember.roles.cache.filter(role => role.permissions.has(PermissionsBitField.Flags.Administrator));
        
        if (adminRoles.size === 0) {
            return interaction.editReply({ content: "Ce membre ne possède plus de rôles d'administrateur." });
        }

        await targetMember.roles.remove(adminRoles, "Anti-Raid: Révocation automatique de l'Administrateur");
        
        interaction.editReply({ content: `Les rôles d'administrateur ont été retirés à **${targetMember.user.tag}**.` });
        
        // Retirer le bouton
        await interaction.message.edit({ components: [] }).catch(() => null);

    } catch (error) {
        Client.log.error(`Erreur lors de la révocation membre (bouton) : ${error.message}`);
        interaction.editReply({ content: `Erreur lors de la modification des rôles : ${error.message}` });
    }
};
