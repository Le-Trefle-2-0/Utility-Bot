const { EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } = require("discord.js");

module.exports = async (Client, interaction) => {
    let question = interaction.fields.getTextInputValue('question');

    if (!question) {
        return interaction.reply({
            content: 'Veuillez entrer une question',
            ephemeral: true
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
        .setPlaceholder('Sélectionnez une option');

    let options = [];
    for (let role of Client.settings.tickets.roles) {
        options.push(
            new StringSelectMenuOptionBuilder()
                .setLabel(role.name)
                .setValue(role.roleID)
                .setDescription(`Contacter l'équipe de ${role.name}`)
                .setEmoji(role.emojiID)
        )
    }

    selector.addOptions(options);
    
    let row = new ActionRowBuilder().addComponents(selector)
    let hits = search.results[0].hits;
    if (hits.length < 1) {
        return interaction.reply({
            content: 'Quelle équipe souhaitez-vous contacter ?\nEn cas de doute, merci de contacter notre équipe de guides.',
            components: [row],
            ephemeral: true
        })
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
            ], components: [row], ephemeral: true
        });
    }
}