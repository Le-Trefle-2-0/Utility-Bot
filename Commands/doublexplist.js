const { EmbedBuilder, MessageFlags } = require('discord.js');
const { SERVER_WIDE, purgeExpired } = require('../Utility/xpEvents');

module.exports = {
    description: 'Afficher les évènements d\'XP doublée en cours',
    options: [],
    run: async (Client, interaction) => {
        if (!interaction.guild) return;

        await purgeExpired(Client);
        const events = await Client.XpEvents.findAll({ where: { guildID: interaction.guild.id }, order: [['endsAt', 'ASC']], raw: true });

        if (events.length === 0) {
            return interaction.reply({
                embeds: [new EmbedBuilder().setColor('9bd2d2').setDescription('Aucun évènement d\'XP doublée n\'est en cours.')],
                flags: MessageFlags.Ephemeral
            });
        }

        interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('8cc088')
                    .setTitle('🍀 Évènements d\'XP doublée')
                    .setDescription(events.map(e => {
                        const ts = Math.floor(new Date(e.endsAt).getTime() / 1000);
                        return `${e.channelID === SERVER_WIDE ? '**Tout le serveur**' : `<#${e.channelID}>`} : jusqu'à <t:${ts}:t> (<t:${ts}:R>)`;
                    }).join('\n'))
            ],
            flags: MessageFlags.Ephemeral
        });
    }
};
