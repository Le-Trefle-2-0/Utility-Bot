const { EmbedBuilder, MessageFlags } = require('discord.js');
const resources = require('../Utility/resources');

const embed = (color, text) => new EmbedBuilder().setColor(color).setDescription(text);

module.exports = async (Client, interaction) => {
    if (!resources.canManage(interaction)) return interaction.reply({ content: ':x: | Permission « Gérer le serveur » requise.', flags: MessageFlags.Ephemeral });

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
        await Client.dbReady;
        const section = resources.findSection(interaction.customId.split('_')[1]);
        const content = interaction.fields.getTextInputValue('content').trim();
        if (!section || !content) {
            return await interaction.editReply({ embeds: [embed('Red', ':x: | Section inconnue ou contenu vide, rien n\'a été modifié.')] });
        }

        await Client.ResourceSections.upsert({ key: section.key, content, updatedBy: interaction.user.id });

        // La section est enregistrée même si le message publié ne peut pas être actualisé
        let note = '';
        try {
            if (!await resources.refresh(Client, interaction.guild)) note = '\nAucun message publié pour l\'instant : utilisez `/ressources` dans le salon voulu.';
        } catch (err) {
            Client.log?.error?.(`[Ressources] actualisation : ${err.stack || err.message}`);
            note = '\n:warning: Le message publié n\'a pas pu être actualisé, relancez `/ressources` dans son salon.';
        }

        // Aperçu pour vérifier le rendu
        await interaction.editReply({
            embeds: [
                embed('8cc088', `:white_check_mark: | Section **${section.title}** enregistrée.${note}`),
                resources.sectionEmbed({ ...section, content })
            ]
        });
    } catch (err) {
        Client.log?.error?.(`[Ressources] enregistrement : ${err.stack || err.message}`);
        await interaction.editReply({ embeds: [embed('Red', ':x: | Une erreur est survenue lors de l\'enregistrement.')] });
    }
};
