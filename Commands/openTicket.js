const { ButtonBuilder } = require('@discordjs/builders');
const { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
    description: 'DEVMODE Ouvre un ticket',
    options: [],
    run: (Client, interaction) => {
        let row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('openTicket')
                .setLabel('Ouvrir un ticket')
                .setStyle(1)
        )

        interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('9bd2d2')
                    .setDescription(`Ouvrir un ticket`)
            ], components: [row], ephemeral: true
        })
    }
}