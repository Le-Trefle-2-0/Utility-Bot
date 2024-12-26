const {SlashCommandBuilder} = require('@discordjs/builders');
const {REST} = require('@discordjs/rest');
const {Routes} = require('discord-api-types/v9');
const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');

module.exports = async (Client) => {
    Client.log.info('WebSocket connection to Discord has been established');

    Client.log.info('Starting commands publication');

    Client.musicPlayer.init(Client);

    let commands = [];

    Client.commands.forEach(command => {
        if (process.env.ENVIRONMENT !== "dev" && command.description?.startsWith("DEVMODE")) return;
        let data = new SlashCommandBuilder()
                .setName(command.name)
                .setDescription(command.description || 'Aucune description');

        if (command.options.length > 0) {
            for (let option of command.options) {
                switch (option.type) {
                    case 'string':
                        data.addStringOption(opt =>
                            opt.setName(option.name)
                                .setDescription(option.desc || 'Aucune description')
                                .setRequired(option.required)
                        );
                        break;

                    case 'int':
                        data.addIntegerOption(opt =>
                            opt.setName(option.name)
                                .setDescription(option.desc || 'Aucune description')
                                .setRequired(option.required)
                        );
                        break;

                    case 'number':
                        data.addNumberOption(opt =>
                            opt.setName(option.name)
                                .setDescription(option.desc || 'Aucune description')
                                .setRequired(option.required)
                        );
                        break;

                    case 'boolean':
                        data.addBooleanOption(opt =>
                            opt.setName(option.name)
                                .setDescription(option.desc || 'Aucune description')
                                .setRequired(option.required)
                        );
                        break;

                    case 'user':
                        data.addUserOption(opt =>
                            opt.setName(option.name)
                                .setDescription(option.desc || 'Aucune description')
                                .setRequired(option.required)
                        );
                        break;

                    case 'channel':
                        data.addChannelOption(opt =>
                            opt.setName(option.name)
                                .setDescription(option.desc || 'Aucune description')
                                .setRequired(option.required)
                        );
                        break;

                    case 'role':
                        data.addRoleOption(opt =>
                            opt.setName(option.name)
                                .setDescription(option.desc || 'Aucune description')
                                .setRequired(option.required)
                        );
                        break;
                }
            }
        }

        commands.push(data.toJSON());
    });

    Client.contextMenus.forEach(menu => {
        let data = new ContextMenuCommandBuilder()
            .setName(menu.name)

        switch (menu.type) {
            case 'user':
                data.setType(ApplicationCommandType.User);
                break;

            case 'message':
                data.setType(ApplicationCommandType.Message);
                break;
        }

        commands.push(data.toJSON());
    });

    const rest = new REST({ version: '9' }).setToken(Client.token);

    try {
        await rest.put(
            Routes.applicationCommands(Client.user.id),
            { body: commands }
        );
    } catch (e) {
        Client.log.error(e)
    }

    Client.log.info('Commands publication has been completed');
}