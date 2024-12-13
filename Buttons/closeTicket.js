const transcript = require('discord-html-transcripts');

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
            returnType: 'attachment',
            filename: `transcript-${user.displayName}.html`,
            saveImages: true,
            footerText: 'Transcript confidentiel - Le Trèfle 2.0 - Tout repartage contrevient au règlement intérieur de l\'association.',
            poweredBy: false,
        });

        user.send({
            content: `:white_check_mark: | Votre ticket a été fermé. Voici le transcript de votre ticket :`,
            files: [file]
        });

        let transcriptChannel = await interaction.guild.channels.fetch(process.env.TRANSCRIPTS_CHANNEL_ID);
        transcriptChannel.send({
            files: [file]
        });

        setTimeout(() => {
            interaction.channel.delete();
        }, 5000);
    }
}