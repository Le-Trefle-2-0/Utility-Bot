const { EmbedBuilder, MessageFlags } = require('discord.js');
const { getCurrentEvent, getScoreboard, getPlace, scoreboardEmbed } = require('../Utility/collect');

module.exports = {
    description: 'Afficher le classement de l\'évènement de collecte',
    options: [],
    run: async (Client, interaction) => {
        if (!interaction.guild) return;

        const event = await getCurrentEvent(Client, interaction.guild.id);
        if (!event) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('9bd2d2').setDescription('Aucun évènement de collecte pour le moment.')],
                flags: MessageFlags.Ephemeral
            });
        }

        const rows = await getScoreboard(Client, event.id, 10);
        const embed = scoreboardEmbed(event, rows, { final: event.endsAt <= new Date() });

        // Position du membre s'il n'est pas dans le top 10
        const mine = await getPlace(Client, event, interaction.user.id);
        if (mine && !rows.some(r => r.userID === interaction.user.id)) {
            embed.addFields({ name: 'Ta position', value: `**${mine.place}.** ${mine.count.toLocaleString('fr-FR')} ${event.emoji}` });
        }

        interaction.reply({ embeds: [embed] });
    }
};
