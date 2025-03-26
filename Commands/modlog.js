const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, MessageFlags } = require('discord.js');

module.exports = {
    description: 'Afficher l\'historique de modération',
    options: [
        {
            name: 'utilisateur',
            description: 'Utilisateur',
            type: 'user',
            required: true
        }
    ],
    guilds: [process.env.MAIN_GUILD_ID],
    run: async (Client, interaction) => {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        let user = interaction.options.getMember('utilisateur');

        let historic = await Client.ModLogs.findAll({ where: { userId: user.id }});

        if (historic.length == 0) {
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('db3226')
                        .setDescription(':x: | Aucun historique de modération n\'a été trouvée.')
                ]
            });
        }

        historic = historic.sort((a, b) => b.timestamp - a.timestamp);

        let string = '';
        let array = [];
        for (let i = 0; i < historic.length; i++) {
            let newString = `\`${historic[i].id}\` - **${historic[i].type}** par <@${historic[i].moderatorID}> le <t:${Math.round(historic[i].timestamp/1000)}:f>\n`;
            if (string.length+newString.length > 512) {
                array.push(string);
                string = newString;
            } else {
                string += newString;
            }
        }

        if (array.length > 1) {
            let embeds = [];
            for (let i = 0; i < array.length; i++) {
                embeds.push(
                    new EmbedBuilder()
                        .setColor('9bd2d2')
                        .setTitle(`Historique de modération de ${user.displayName}`)
                        .setDescription(array[i])
                        .setFooter({text: `Page ${i+1}/${array.length}`})
                );
            }

            if (!Client.pages) Client.pages = {};
            let page = parseInt(interaction.options.getString('page'))-1 || 0;

            interaction.editReply({
                embeds: [embeds[page]],
                components: [
                    new ActionRowBuilder()
                        .addComponents(
                            new ButtonBuilder()
                                .setCustomId('previousPage')
                                .setLabel('Page précédente')
                                .setStyle('2'),
                            new ButtonBuilder()
                                .setCustomId('nextPage')
                                .setLabel('Page suivante')
                                .setStyle('2')
                        )
                ]
            });

            let message = await interaction.fetchReply();
            
            Client.pages[message.id] = { pages: embeds, pageNumber: page};

            setTimeout(() => {
                delete Client.pages[message.id];
            }, 300000);
        } else {
            let embeds = [
                new EmbedBuilder()
                    .setColor('9bd2d2')
                    .setTitle(`Historique de modération de ${user.displayName}`)
                    .setDescription(string)
            ];

            interaction.editReply({
                embeds
            });
        }
    }
}