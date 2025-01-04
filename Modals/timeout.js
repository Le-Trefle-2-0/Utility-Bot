const { EmbedBuilder, MessageFlags } = require("discord.js");
const ms = require('ms')
const { scheduleJob } = require('node-schedule');

module.exports = async (Client, interaction) => {
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    let reason = interaction.fields.getTextInputValue('reason');
    let duration = interaction.fields.getTextInputValue('duration');
    let userId = interaction.fields.getTextInputValue('userId');
    let durationTimestamp = ms(duration);

    let member = await interaction.guild.members.fetch(userId);
    if (member) {
        await Client.Timeouts.create({
            userID: userId,
            guildID: interaction.guild.id,
            reason: reason,
            startTimestamp: Date.now(),
            endTimestamp: (Date.now() + durationTimestamp)
        });

        await Client.ModLogs.create({
            userID: userId,
            guildID: interaction.guild.id,
            moderatorID: interaction.user.id,
            reason: reason,
            timestamp: Date.now(),
            type: 'timeout'
        });

        scheduleJob(new Date(Date.now() + durationTimestamp), () => {
            member.user.send({
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
            Client.Timeouts.destroy({ where: { userID: userId, guildID: interaction.guild.id } });
        });
        for (let role of Object.keys(Client.settings.toClose.roles)) {
            for (let channelID of Client.settings.toClose.roles[role]) {
                let channel = member.guild.channels.cache.get(channelID);
                if (channel) {
                    switch (channel.type) {
                        case 0:
                            channel.permissionOverwrites.edit(member, {
                                SendMessages: false,
                                AddReactions: false,
                                SendMessagesInThreads: false,
                                AddReactions: false
                            });
                            scheduleJob(new Date(Date.now() + durationTimestamp), async () => {
                                channel.permissionOverwrites.delete(member);
                            });
                            break;

                        case 2:
                            channel.permissionOverwrites.edit(member, {
                                Speak: false,
                                SendMessages: false,
                                Connect: false
                            });
                            scheduleJob(new Date(Date.now() + durationTimestamp), async () => {
                                channel.permissionOverwrites.delete(member);
                            });
                            channel.members.forEach(voiceMember => {
                                if (member.id == voiceMember.id) voiceMember.voice.disconnect();
                            });
                            break;
                    }
                }
            }
        }
        member.user.send({
            embeds: [
                new EmbedBuilder()
                    .setColor('c1121f')
                    .setTitle('Exclusion temporaire')
                    .setDescription(`Vous avez été exclu temporairement du serveur **${interaction.guild.name}**.`)
                    .addFields(
                        {
                            name: 'Motif',
                            value: reason,
                            inline: true
                        },
                        {
                            name: 'Durée',
                            value: `${duration} (fin <t:${Math.round(new Date(Date.now() + durationTimestamp).getTime()/1000)}:R>)`,
                            inline: true
                        }
                    )
                    .setAuthor({
                        name: interaction.guild.name,
                        iconURL: interaction.guild.iconURL({ dynamic: true })
                    })
            ]
        });
        let message = await interaction.followUp({ content: ':white_check_mark: Utilisateur exclu temporairement', flags: MessageFlags.Ephemeral });
        message.delete();
    } else {
        interaction.followUp({ content: ':x: Utilisateur introuvable', flags: MessageFlags.Ephemeral });
    }
}