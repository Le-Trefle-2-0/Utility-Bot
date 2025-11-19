const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, MessageFlags } = require("discord.js");
const ticketsConfig = require('../config/ticketsConfig');

module.exports = async (Client, interaction) => {
    try {
        let question = interaction.fields.getTextInputValue('question');

        if (!question) {
            return interaction.reply({
                content: 'Veuillez entrer une question',
                flags: MessageFlags.Ephemeral
            });
        }

        let search = await Client.algolia.search({
            requests: [{
                indexName: 'questions',
                query: question,
                hitsPerPage: 5
            }]
        });

        let selector = new StringSelectMenuBuilder()
            .setCustomId('openTicket')
            .setPlaceholder('Sélectionnez une équipe');

        let options = [];
        const teams = ticketsConfig.getAllTeams();

        for (let team of teams) {
            const option = new StringSelectMenuOptionBuilder()
                .setLabel(team.name)
                .setValue(team.name)
                .setDescription(`Contacter l'équipe de ${team.name}`);

            // Ajouter l'emoji s'il existe
            if (team.emojiID) {
                option.setEmoji(team.emojiID);
            }

            options.push(option);
        }

        selector.addOptions(options);

        let row = new ActionRowBuilder().addComponents(selector);
        let hits = search.results[0].hits;

        if (hits.length < 1) {
            return interaction.reply({
                content: 'Quelle équipe souhaitez-vous contacter ?\nEn cas de doute, merci de contacter notre équipe de guides.',
                components: [row],
                flags: MessageFlags.Ephemeral
            });
        } else {
            let string = '';
            for (let hit of hits) {
                if (!string.includes(hit.threadLink)) string += `${hit.threadLink}\n`;
            }

            interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('9bd2d2')
                        .setDescription(`Il semblerait que votre question ait déjà été posée. Voici les résultats trouvés :\n\n${string}\nSi aucun de ces résultats ne répond à votre question, veuillez sélectionner une équipe ci-dessous. En cas de doute, merci de contacter notre équipe de guides.\nEn ouvrant un ticket, vous certifiez avoir consulté les résultats proposés ci-dessus ainsi que la <#960639230818807909>.`)
                ], components: [row], flags: MessageFlags.Ephemeral
            });
        }
    } catch (error) {
        console.error('Error in openTicket modal:', error);
        interaction.reply({
            content: ':x: | Une erreur est survenue',
            flags: MessageFlags.Ephemeral
        });
    }
}