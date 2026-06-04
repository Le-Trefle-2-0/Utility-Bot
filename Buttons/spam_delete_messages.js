const { PermissionsBitField } = require('discord.js');

module.exports = async (Client, interaction) => {
    // Format customId: spam_delete_messages_{userId}_{channelId}
    const parts = interaction.customId.split('_');
    const channelId = parts.pop();
    const targetUserId = parts.pop();

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
        return interaction.reply({ content: "Vous n'avez pas la permission de gérer les messages.", ephemeral: true });
    }

    const channel = interaction.guild.channels.cache.get(channelId);
    if (!channel) return interaction.reply({ content: "Salon introuvable.", ephemeral: true });

    await interaction.deferReply({ ephemeral: true });

    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        const userMessages = messages.filter(m => m.author.id === targetUserId && (Date.now() - m.createdTimestamp) < 3600000); // 1h max

        if (userMessages.size === 0) {
            return interaction.editReply({ content: "Aucun message récent trouvé pour cet utilisateur dans ce salon." });
        }

        await channel.bulkDelete(userMessages, true);
        interaction.editReply({ content: `${userMessages.size} messages ont été supprimés.` });
        
        // Mettre à jour le bouton pour indiquer qu'il a été utilisé
        await interaction.message.edit({ components: [] }).catch(() => null);

    } catch (error) {
        Client.log.error(`Erreur lors de la suppression massive (bouton) : ${error.message}`);
        interaction.editReply({ content: "Une erreur est survenue lors de la suppression des messages." });
    }
};
