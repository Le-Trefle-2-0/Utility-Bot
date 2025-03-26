const transcript = require('discord-html-transcripts');
const { createWriteStream } = require('fs');
const {EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle} = require("discord.js");

module.exports = async (Client, interaction) => {
    await interaction.deferReply();

    let ticket = await Client.Tickets.findOne({ where: { channelID: interaction.channel.id } });
    if (!ticket) {
        return interaction.editReply({
            content: `:x: | Ce salon n'est pas un ticket.`
        });
    } else {
        ticket.destroy();

        interaction.editReply({
            content: `:white_check_mark: | Ticket fermé avec succès.`
        });

        let user = await Client.users.fetch(ticket.userID);

        const file = await transcript.createTranscript(interaction.channel, {
            limit: -1,
            returnType: 'buffer',
            filename: `${ticket.id}.html`,
            saveImages: true,
            footerText: 'Transcript confidentiel - Le Trèfle 2.0 - Tout repartage contrevient au règlement intérieur de l\'association.',
            poweredBy: false,
        });

        createWriteStream(`./Transcripts/${ticket.id}.html`).write(file);

        let row = [
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setStyle(ButtonStyle.Link)
                    .setLabel('Transcript')
                    .setURL(`http://cdn.letrefle.org/transcript/${ticket.id}`)
            )
        ]

        user.send({
            content: `:white_check_mark: | Votre ticket a été fermé.`,
            components: row
        });

        let transcriptChannel = await interaction.guild.channels.fetch(process.env.TRANSCRIPTS_CHANNEL_ID);
        transcriptChannel.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('9bd2d2')
                    .setDescription(`**Cloture de ticket**\n\nID : \`${ticket.id}\`\nOuvert par : <@${ticket.userID}>\nÉquipe en charge : <@&${ticket.assignedRoleID}>\nFermé par : <@${interaction.user.id}>`)
            ], components: row
        });

        setTimeout(() => {
            interaction.channel.delete();
        }, 5000);
    }
}