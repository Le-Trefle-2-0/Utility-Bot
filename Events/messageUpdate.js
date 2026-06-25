const { EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { truncateMessage, getDiffWindow } = require("../Utility/textUtils");

module.exports = async (Client, oldMessage, newMessage) => {
    if (!oldMessage.guild || oldMessage.author?.bot) return;
    if (oldMessage.guild.id !== Client.settings.mainGuildID) return;
    if (oldMessage.content === newMessage.content) return;

    const channel = oldMessage.channel;
    const publicRoleID = Client.settings.publicRoleID;

    // Check if the channel is accessible to the public role
    const isPublic = channel.permissionsFor(publicRoleID)?.has(PermissionFlagsBits.ViewChannel);

    if (!isPublic) return;

    let oldContent, newContent;
    
    if (oldMessage.content?.length > 1000 || newMessage.content?.length > 1000) {
        const diff = getDiffWindow(oldMessage.content || "", newMessage.content || "", 800);
        oldContent = diff.oldWindow;
        newContent = diff.newWindow;
    } else {
        oldContent = oldMessage.content || "*Pas de contenu texte*";
        newContent = newMessage.content || "*Pas de contenu texte*";
    }

    const embed = new EmbedBuilder()
        .setAuthor({
            name: oldMessage.author.displayName || oldMessage.author.username,
            iconURL: oldMessage.author.displayAvatarURL({ dynamic: true })
        })
        .setDescription(
            `📝 **Un message a été modifié.**\n\n` +
            `📍 **Salon :** <#${channel.id}> (\`${channel.id}\`)\n\n` +
            `❌ **Ancien contenu :**\n${oldContent}\n\n` +
            `✅ **Nouveau contenu :**\n${newContent}`
        )
        .setFooter({ text: `ID de l'utilisateur : ${oldMessage.author.id}` });

    Client.emit('logs', 'textual', embed);
};
