const ms = require("ms");
const {Op} = require("sequelize");
const {MessageFlags} = require("discord.js");
const {scheduleJob} = require("node-schedule");

module.exports = async (Client, member) => {
    let previousSoftban = await Client.ModLogs.findAll({
        where: {
            userID: member.id,
            guildID: member.guild.id,
            type: {
                [Op.startsWith]: 'Softban'
            }
        }
    });
    let durations = ['7d', '30d', '365d', '36500d'];

    let newDuration = durations[previousSoftban.length-1];
    for (let softban of previousSoftban) {
        let softbanStartDate = new Date(softban.createdAt).getTime();
        let softbanEndDate = softbanStartDate + ms(softban.type.split(' ')[1]);

        if (softbanEndDate > Date.now()) {
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
        }
    }
    Client.emit('logs',
        'member',
        'Arrivée sur le serveur',
        `<@${member.id}> à été invité par <@{{invitingMemberID}}>\nAge du compte : ${ms(Date.now()-member.user.createdTimestamp)}`,
        member.id,
        member.avatarURL()
    );
}