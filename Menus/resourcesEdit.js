const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder, MessageFlags } = require('discord.js');
const resources = require('../Utility/resources');

// Choix de la section à modifier (voir Commands/ressourcesmodifier.js) : ouvre un formulaire prérempli
module.exports = async (Client, interaction) => {
    if (!resources.canManage(interaction)) return interaction.reply({ content: ':x: | Permission « Gérer le serveur » requise.', flags: MessageFlags.Ephemeral });

    try {
        await Client.dbReady;
        const section = await resources.getSection(Client, interaction.values[0]);
        if (!section) return await interaction.deferUpdate();

        await interaction.showModal(
            new ModalBuilder()
                .setCustomId(`resourcesModal_${section.key}`)
                .setTitle(section.title.slice(0, 45))
                .addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder()
                        .setCustomId('content')
                        .setLabel('Contenu (mise en forme Discord)')
                        .setStyle(TextInputStyle.Paragraph)
                        .setMaxLength(resources.maxLength(section.key))
                        .setValue(section.content)
                        .setRequired(true)
                ))
        );
    } catch (err) {
        Client.log?.error?.(`[Ressources] ouverture du formulaire : ${err.stack || err.message}`);
    }
};
