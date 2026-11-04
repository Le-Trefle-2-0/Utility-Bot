const { PermissionsBitField, MessageFlags } = require('discord.js');
const { disableButtons } = require('../Utility/modscanActions');

const DURATION_MS = 7 * 24 * 60 * 60 * 1000;
const REASON = 'Arnaque détectée par la modération IA';

module.exports = async (Client, interaction) => {
    // customId : modscan_timeout_{userId}
    const userId = interaction.customId.split('_').pop();

    if (!interaction.member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
        return interaction.reply({ content: "Vous n'avez pas la permission d'exclure temporairement des membres.", flags: MessageFlags.Ephemeral });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        const member = await interaction.guild.members.fetch(userId).catch(() => null);
        if (!member) return interaction.editReply({ content: "Ce membre n'est plus sur le serveur." });
        if (!member.moderatable) return interaction.editReply({ content: "Je ne peux pas exclure ce membre (rôle supérieur ou permissions insuffisantes)." });

        await member.timeout(DURATION_MS, REASON);
        await Client.ModLogs.create({
            userID: userId,
            guildID: interaction.guild.id,
            moderatorID: interaction.user.id,
            reason: REASON,
            timestamp: Date.now(),
            type: 'Timeout'
        });

        await disableButtons(interaction, `⏳ Timeout de 7 jours appliqué par ${interaction.user}`);
        await interaction.editReply({ content: `${member.user.tag} est exclu temporairement pendant 7 jours.` });
    } catch (error) {
        Client.log.error(`Erreur timeout (modération IA) : ${error.message}`);
        await interaction.editReply({ content: "Une erreur est survenue lors de l'exclusion temporaire." });
    }
};
