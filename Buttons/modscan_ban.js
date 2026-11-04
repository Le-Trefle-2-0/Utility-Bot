const { PermissionsBitField, MessageFlags } = require('discord.js');
const { disableButtons } = require('../Utility/modscanActions');

const REASON = 'Arnaque détectée par la modération IA';

module.exports = async (Client, interaction) => {
    // customId : modscan_ban_{userId}
    const userId = interaction.customId.split('_').pop();

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
        return interaction.reply({ content: "Vous n'avez pas la permission de bannir des membres.", flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (member && !member.bannable) return interaction.editReply({ content: "Je ne peux pas bannir ce membre (rôle supérieur ou permissions insuffisantes)." });

        // Supprime aussi les messages de la dernière heure (le scammer a souvent posté ailleurs)
        await interaction.guild.members.ban(userId, { reason: REASON, deleteMessageSeconds: 3600 });
        await Client.ModLogs.create({
            userID: userId,
            guildID: interaction.guild.id,
            moderatorID: interaction.user.id,
            reason: REASON,
            timestamp: Date.now(),
            type: 'Ban'
        });

        await disableButtons(interaction, `🔨 Membre banni par ${interaction.user}`);
        await interaction.editReply({ content: `<@${userId}> a été banni.` });
    } catch (error) {
        Client.log.error(`Erreur ban (modération IA) : ${error.message}`);
        await interaction.editReply({ content: "Une erreur est survenue lors du bannissement." });
    }
};
