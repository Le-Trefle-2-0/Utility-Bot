const { PermissionsBitField } = require('discord.js');

module.exports = async (Client, interaction) => {
    // Format customId: antiraid_revoke_role_{roleId}
    const targetId = interaction.customId.split('_').pop();

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        return interaction.reply({ content: "Seul un administrateur peut utiliser ce bouton.", ephemeral: true });
    }

    const targetRole = await interaction.guild.roles.fetch(targetId).catch(() => null);
    if (!targetRole) return interaction.reply({ content: "Rôle introuvable.", ephemeral: true });

    // Vérification de la hiérarchie du bot
    if (!interaction.guild.members.me.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
        return interaction.reply({ content: "Je n'ai pas la permission de gérer les rôles.", ephemeral: true });
    }

    if (interaction.guild.members.me.roles.highest.position <= targetRole.position) {
        return interaction.reply({ content: "Je ne peux pas modifier ce rôle car il est supérieur ou égal au mien.", ephemeral: true });
    }

    await interaction.deferReply({ ephemeral: true });

    try {
        // Retirer la permission Administrateur du rôle
        const newPermissions = targetRole.permissions.remove(PermissionsBitField.Flags.Administrator);
        
        await targetRole.setPermissions(newPermissions, "Anti-Raid: Révocation automatique de l'Administrateur");
        
        interaction.editReply({ content: `La permission Administrateur a été retirée du rôle **${targetRole.name}**.` });
        
        // Retirer le bouton
        await interaction.message.edit({ components: [] }).catch(() => null);

    } catch (error) {
        Client.log.error(`Erreur lors de la révocation rôle (bouton) : ${error.message}`);
        interaction.editReply({ content: `Erreur lors de la modification des permissions : ${error.message}` });
    }
};
