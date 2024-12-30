const {SlashCommandBuilder} = require('@discordjs/builders');
const {REST} = require('@discordjs/rest');
const {Routes} = require('discord-api-types/v9');
const { ContextMenuCommandBuilder, ApplicationCommandType } = require('discord.js');
const { scheduleJob } = require('node-schedule');

module.exports = async (Client) => {
    Client.log.info('WebSocket connection to Discord has been established');

    Client.log.info('Starting commands publication');

    function closeChannels() {
        console.log('CLOSING CHANNELS')
        for (let role of Object.keys(Client.settings.toClose.roles)) {
            console.log(role)
            let guild = Client.guilds.cache.get(process.env.MAIN_GUILD_ID);
            if (guild) {
                let discordRole = guild.roles.cache.get(role);
                if (discordRole) {
                    console.log(Client.settings.toClose.roles[role])
                    for (let channelID of Client.settings.toClose.roles[role]) {
                        let channel = guild.channels.cache.get(channelID);
                        if (channel) {
                            switch (channel.type) {
                                case 'GuildText':
                                    channel.permissionOverwrites.edit(role, {
                                        SendMessages: false,
                                        AddReactions: false,
                                        SendMessagesInThreads: false
                                    });
                                    break;

                                case 'GuildVoice':
                                    channel.permissionOverwrites.edit(role, {
                                        Speak: false,
                                        Stream: false,
                                        Join: false
                                    });
                                    break;
                            }
                        }
                    }
                }
            }
        }
    }

    if (Client.settings.toClose.schedule) {
        for (let weekDay of Object.keys(Client.settings.toClose.schedule)) {
            let openTime = Client.settings.toClose.schedule[weekDay][0] || Client.settings.toClose.schedule.default[0];
            let closeTime = Client.settings.toClose.schedule[weekDay][1] || Client.settings.toClose.schedule.default[1];
            switch (weekDay) {
                case 'monday':
                    scheduleJob(`${openTime.split('h')[1]} ${openTime.split('h')[0]} * * 1`, closeChannels());
                    console.log('Scheduled close for monday')
                    break;

                case 'tuesday':
                    scheduleJob(`${openTime.split('h')[1]} ${openTime.split('h')[0]} * * 2`, closeChannels());
                    console.log('Scheduled close for tuesday')
                    break;

                case 'wednesday':
                    scheduleJob(`${openTime.split('h')[1]} ${openTime.split('h')[0]} * * 3`, closeChannels());
                    console.log('Scheduled close for wednesday')
                    break;

                case 'thursday':
                    scheduleJob(`${openTime.split('h')[1]} ${openTime.split('h')[0]} * * 4`, closeChannels());
                    console.log('Scheduled close for thursday')
                    break;

                case 'friday':
                    scheduleJob(`${openTime.split('h')[1]} ${openTime.split('h')[0]} * * 5`, closeChannels());
                    console.log('Scheduled close for friday')
                    break;
                
                case 'saturday':
                    scheduleJob(`${openTime.split('h')[1]} ${openTime.split('h')[0]} * * 6`, closeChannels());
                    break;

                case 'sunday':
                    scheduleJob(`${openTime.split('h')[1]} ${openTime.split('h')[0]} * * 0`, closeChannels());
                    console.log('Scheduled close for sun')
                    break;
            }
        }
    }

    // Client.musicPlayer.init(Client);

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