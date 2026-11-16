const { snapshot, guildCache } = require('../Utility/logging/invites');

// Maintient le cache des invitations (voir Utility/logging/invites.js)
module.exports = async (Client, invite) => {
    if (invite.guild.id !== Client.settings.mainGuildID) return;
    guildCache(Client, invite.guild.id).set(invite.code, snapshot(invite));
};
