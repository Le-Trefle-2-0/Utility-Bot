const { ButtonBuilder } = require('@discordjs/builders');
const { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, MessageFlags} = require('discord.js');

module.exports = {
    description: 'DEVMODE Ouvre un ticket',
    guilds: [process.env.MAIN_GUILD_ID],
    options: [],
    run: (Client, interaction) => {
        let row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('openTicket')
                .setLabel('Ouvrir un ticket')
                .setStyle(2)
        );

        interaction.channel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('9bd2d2')
                    .setTitle('Nous contacter')
                    .setDescription(`Afin d'ouvrir un ticket, merci de cliquer sur le bouton ci-dessous.`)
            ], components: [row], ephemeral: false
        });

        interaction.reply({
            content: 'OK',
            flags: MessageFlags.Ephemeral
        });
    }
}