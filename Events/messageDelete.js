const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { truncateMessage } = require("../Utility/textUtils");

module.exports = async (Client, message) => {
    if (!message.guild || message.author?.bot) return;
    if (message.guild.id !== Client.settings.mainGuildID) return;

    const channel = message.channel;
    const publicRoleID = Client.settings.publicRoleID;

    const isPublic = channel.permissionsFor(publicRoleID)?.has(PermissionFlagsBits.ViewChannel);

    if (!isPublic) return;

    const content = message.content ? truncateMessage(message.content, 1024) : "*Pas de contenu texte*";

    const embed = new EmbedBuilder()
        .setAuthor({
            name: message.author.displayName || message.author.username,
            iconURL: message.author.displayAvatarURL({ dynamic: true })
        })
        .setDescription(
            `🗑️ **Un message a été supprimé.**\n\n` +
            `📍 **Salon :** <#${channel.id}> (\`${channel.id}\`)\n\n` +
            `📄 **Contenu :**\n${content}`
        )
        .setFooter({ text: `ID de l'utilisateur : ${message.author.id}` });

    Client.emit('logs', 'textual', embed);
};
