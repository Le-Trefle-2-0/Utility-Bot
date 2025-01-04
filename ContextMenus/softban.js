const { EmbedBuilder, MessageFlags } = require('discord.js');
const { Op } = require('sequelize');
const ms = require('ms');
const { scheduleJob } = require('node-schedule');

module.exports = {
    name: 'Softban',
    type: 'user',
    run: async (Client, interaction) => {
        let previousSoftban = await Client.ModLogs.findAll({ 
            where: { 
                userID: interaction.targetUser.id, 
                guildID: interaction.guild.id,
                type: {
                    [Op.startsWith]: 'Softban'
                }
            } 
        });
        
        let durations = ['7d', '30d', '365d', '36500d'];
        if (previousSoftban.length >= durations.length) return interaction.reply({ content: ':x: Cet utilisateur est déjà softban pour toutes les durées possibles.', flags: MessageFlags.Ephemeral });
        for (let softban of previousSoftban) {
            let softbanStartDate = new Date(softban.createdAt).getTime();
            let softbanEndDate = softbanStartDate + ms(softban.type.split(' ')[1]);

            if (softbanEndDate > Date.now()) {
                let remainingTime = softbanEndDate - Date.now();
                return interaction.reply({ content: `:x: Cet utilisateur est déjà softban jusqu'au <t:${Math.round(softbanEndDate/1000)}:f>.`, flags: MessageFlags.Ephemeral });
            }
        }

        let newDuration = durations[previousSoftban.length];
        let member = await interaction.guild.members.fetch(interaction.targetUser.id);
        if (member) {
            await Client.ModLogs.create({
                userID: interaction.targetUser.id,
                guildID: interaction.guild.id,
                moderatorID: interaction.user.id,
                reason: 'Softban',
                timestamp: Date.now(),
                type: `Softban ${newDuration}`
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
                                    AddReactions: false,
                                    ViewChannel: false,
                                    ReadMessageHistory: false,
                                });
                                scheduleJob(new Date(Date.now() + ms(newDuration)), async () => {
                                    channel.permissionOverwrites.delete(member);
                                });
                                break;
    
                            case 2:
                                channel.permissionOverwrites.edit(member, {
                                    Speak: false,
                                    SendMessages: false,
                                    Connect: false,
                                    ViewChannel: false,
                                });
                                scheduleJob(new Date(Date.now() + ms(newDuration)), async () => {
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

            member.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('9bd2d2')
                        .setTitle('Softban')
                        .setDescription(`Vous avez été softban du serveur **${interaction.guild.name}** jusqu'au <t:${Math.round((Date.now() + ms(newDuration))/1000)}:f>.`)
                        .setAuthor({
                            name: interaction.guild.name,
                            iconURL: interaction.guild.iconURL({ dynamic: true })
                        })
                ]
            })

            interaction.reply({ content: `:white_check_mark: ${interaction.targetUser.tag} a été softban du serveur jusqu'au <t:${Math.round((Date.now() + ms(newDuration))/1000)}:f>.`, flags: MessageFlags.Ephemeral });
        }
    }
}