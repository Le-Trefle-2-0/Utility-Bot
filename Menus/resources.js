const { MessageFlags } = require('discord.js');
const resources = require('../Utility/resources');

// Menu public du message des ressources : la section choisie n'est visible que par la personne
module.exports = async (Client, interaction) => {
    try {
        await Client.dbReady;
        const section = await resources.getSection(Client, interaction.values[0]);
        if (!section) return await interaction.deferUpdate();

        // Réenvoyer le menu le remet à zéro, pour pouvoir rouvrir ensuite la même section
        await interaction.update({ components: [resources.publicMenu()] });
        await interaction.followUp({ embeds: [resources.sectionEmbed(section)], flags: MessageFlags.Ephemeral });
    } catch (err) {
        Client.log?.error?.(`[Ressources] menu : ${err.stack || err.message}`);
    }
};
