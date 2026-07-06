module.exports = async (Client, invite) => {
    if (invite.guild.id !== Client.settings.mainGuildID) return;

    const guildInvites = Client.invites.get(invite.guild.id);
    if (guildInvites) {
        guildInvites.delete(invite.code);
    }
};
