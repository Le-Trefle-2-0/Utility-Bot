const { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } = require('discord.js');

module.exports = {
    description: 'DEVMODE Ouvre un ticket',
    options: [],
    run: (Client, interaction) => {
        let row = new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('openTicket')
                .setPlaceholder('Sélectionnez une option')
                .addOptions(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Guide')
                        .setValue('guide')
                        .setDescription('Contacter l\'équipe de Guide')
                        .setEmoji('1207378732625567824')
                        .setDefault(true),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('Modération')
                        .setValue('modo')
                        .setDescription('Contacter l\'équipe de Modération')
                        .setEmoji('1207378624030965770')
                )
        )

        interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('9bd2d2')
                    .setDescription(`Quelle est la raison de l'ouverture de ce ticket ?`)
            ], components: [row], ephemeral: true
        })
    }
}