const { EmbedBuilder, MessageFlags } = require('discord.js');

module.exports = {
    name: 'Untimeout',
    type: 'user',
    run: async (Client, interaction) => {
        console.log('untimout');
        let previousTimeout = await Client.Timeouts.findOne({ where: { userID: interaction.targetUser.id, guildID: interaction.guild.id } });
        if (!previousTimeout) return interaction.reply({ content: ':x: Cet utilisateur n\'est pas exclu temporairement', flags: MessageFlags.Ephemeral });
        
        for (let role of Object.keys(Client.settings.toClose.roles)) {
            for (let channelID of Client.settings.toClose.roles[role]) {
                let channel = interaction.guild.channels.cache.get(channelID);
                if (channel) {
                    switch (channel.type) {
                        case 0:
                            channel.permissionOverwrites.delete(interaction.targetUser.id);
                            break;
                        case 5:
                            channel.permissionOverwrites.delete(interaction.targetUser.id);
                            break;
                    }
                }
            }
        }

        interaction.guild.members.cache.get(interaction.targetUser.id).send({
            embeds: [
                new EmbedBuilder()
                    .setColor('9bd2d2')
                    .setTitle('Exclusion temporaire')
                    .setDescription(`Votre exclusion temporaire du serveur **${interaction.guild.name}** a pris fin.`)
                    .setAuthor({
                        name: interaction.guild.name,
                        iconURL: interaction.guild.iconURL({ dynamic: true })
                    })
            ]
        });
        await previousTimeout.destroy();
        await interaction.reply({
            embeds: [
                new EmbedBuilder()
                    .setColor('9bd2d2')
                    .setDescription(`:white_check_mark: L'exclusion temporaire de <@${interaction.targetUser.id}> a été levée.`)
            ], flags: MessageFlags.Ephemeral
        });

    }
}