const { ContextMenuCommandBuilder, ApplicationCommandType, EmbedBuilder, SlashCommandBuilder, REST, Routes, ActivityType, PresenceUpdateStatus, disableValidators } = require('discord.js');
const { scheduleJob } = require('node-schedule');
const { Moon } =require('lunarphase-js');

module.exports = async (Client) => {
    disableValidators();
    Client.log.info('WebSocket connection to Discord has been established');

    Client.log.info('Starting commands publication');

    Client.user.setPresence({
        activities: [ { name: '🍀 Regarde les trèfles pousser', type: ActivityType.Custom } ],
        status: PresenceUpdateStatus.Online
    })

    let timeouts = await Client.Timeouts.findAll();
    for (let timeout of timeouts) {
        let member = await Client.guilds.cache.get(timeout.guildID).members.fetch(timeout.userID);
        if (member) {
            let duration = timeout.endTimestamp - Date.now();
            scheduleJob(new Date(Date.now() + duration), () => {
                for (let role of Object.keys(Client.settings.toClose.roles)) {
                    for (let channelID of Client.settings.toClose.roles[role]) {
                        let channel = member.guild.channels.cache.get(channelID);
                        if (channel) {
                            switch (channel.type) {
                                case 0:
                                    channel.permissionOverwrites.delete(member);
                                    break;
        
                                case 2:
                                    channel.permissionOverwrites.delete(member);
                                    break;
                            }
                        }
                    }
                }
                member.user.send({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('9bd2d2')
                            .setTitle('Exclusion temporaire')
                            .setDescription(`Votre exclusion temporaire du serveur **${member.guild.name}** a pris fin.`)
                            .setAuthor({
                                name: member.guild.name,
                                iconURL: member.guild.iconURL({ dynamic: true })
                            })
                    ]
                });
                Client.Timeouts.destroy({ where: { userId: timeout.userID, guildId: timeout.guildID } });
            });
        }
    }

    Client.closeChannels = async () => {
        for (let role of Object.keys(Client.settings.toClose.roles)) {
            let guild = Client.guilds.cache.get(process.env.MAIN_GUILD_ID);
            if (guild) {
                let discordRole = guild.roles.cache.get(role);
                if (discordRole) {
                    for (let channelID of Client.settings.toClose.roles[role]) {
                        let channel = guild.channels.cache.get(channelID);
                        if (channel) {
                            switch (channel.type) {
                                case 0:
                                    channel.permissionOverwrites.edit(role, {
                                        SendMessages: false,
                                        AddReactions: false,
                                        SendMessagesInThreads: false,
                                        AddReactions: false
                                    });
                                    break;

                                case 2:
                                    channel.permissionOverwrites.edit(role, {
                                        Speak: false,
                                        SendMessages: false,
                                        Connect: false
                                    });
                                    channel.members.forEach(member => {
                                        member.voice.disconnect();
                                    });
                                    break;
                            }
                            
                            if (channel.id == Client.settings.mainChannelID) {
                                let message = await channel.send({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle('<:off:895691615593705512> Fermeture des salons textuels et vocaux.')
                                            .setDescription('✨ *L\'équipe vous souhaite une très belle nuit, à demain...*\n\n:last_quarter_moon_with_face: __Pourquoi ferme-t-on les salons la nuit ?__\n\n*En tant qu\'association reconnue d\'action sociale, nous avons la responsabilité de ce qui se passe sur notre discord. Pour permettre le repos de nos équipes ainsi que préserver le sommeil de tous, nous fermons les salons vocaux et textuels la nuit.*\n\nPS: Si cette nuit tu ne vas pas bien n\'hésites pas à te rendre ici : <#718250345951658064>')
                                            .setImage('https://cdn.discordapp.com/attachments/847519151890366514/1297859871609196564/Capture_decran_2024-10-21_a_11.51.16.png?ex=677315f2&is=6771c472&hm=c719ae442af54b06745339f68f0a45b6e6e6ea99b68a942a5d21a4da25c67a9f&')
                                            .setColor('204051')
                                    ]
                                });
                                
                                let guildEmoji = await Client.guilds.fetch(Client.settings.toClose.emojisGuildID);
                                if (guildEmoji) {
                                    for (let i in Client.settings.toClose.emojis) {
                                        let emoji = await guildEmoji.emojis.fetch(Client.settings.toClose.emojis[i]);
                                        if (emoji) {
                                            await message.react(emoji);
                                        }
                                    }
                                    message.react(Moon.lunarPhaseEmoji());
                                }
                            }
                        }
                    }
                }
            }
        }

        Client.user.setPresence({
            activities: [ { name: 'le ciel étoilé ✨', type: ActivityType.Watching } ],
            status: PresenceUpdateStatus.Idle
        })
    }

    Client.openChannels = async () => {
        for (let role of Object.keys(Client.settings.toClose.roles)) {
            let guild = Client.guilds.cache.get(process.env.MAIN_GUILD_ID);
            if (guild) {
                let discordRole = guild.roles.cache.get(role);
                if (discordRole) {
                    for (let channelID of Client.settings.toClose.roles[role]) {
                        let channel = guild.channels.cache.get(channelID);
                        if (channel) {
                            switch (channel.type) {
                                case 0:
                                    channel.permissionOverwrites.edit(role, {
                                        SendMessages: true,
                                        AddReactions: true,
                                        SendMessagesInThreads: true,
                                        AddReactions: true
                                    });
                                    break;

                                case 2:
                                    channel.permissionOverwrites.edit(role, {
                                        Speak: true,
                                        SendMessages: true,
                                        Connect: true
                                    });
                                    break;
                            }
                            if (channel.id == Client.settings.mainChannelID) {
                                let message = await channel.send({
                                    embeds: [
                                        new EmbedBuilder()
                                            .setTitle('<:onn:895691557817180191> Bonjour à toutes et à tous, les canaux vocaux et textuels sont ouverts.')
                                            .setDescription('☀️ *Nous comptons sur vous pour avoir des échanges et des propos corrects.*')
                                            .setImage('https://cdn.discordapp.com/attachments/847519151890366514/1297634244733964288/BONJOUR-2.png?ex=67739550&is=677243d0&hm=5422be8cc7705b65887d79d0d6345eab2bfe5394c872bd525e8abb9e5f1cc952&')
                                            .setColor('9bd2d2')
                                    ]
                                });

                                message.react('👋');
                            }
                        }
                    }
                }
            }
        }
        Client.user.setPresence({
            activities: [ { name: '🍀 Regarde les trèfles pousser', type: ActivityType.Custom } ],
            status: PresenceUpdateStatus.Online
        })
    }

    if (Client.settings.toClose.schedule) {
        for (let weekDay of Object.keys(Client.settings.toClose.schedule)) {
            let openTime = Client.settings.toClose.schedule[weekDay][0] || Client.settings.toClose.schedule.default[0];
            let closeTime = Client.settings.toClose.schedule[weekDay][1] || Client.settings.toClose.schedule.default[1];
            switch (weekDay) {
                case 'monday':
                    scheduleJob(`${openTime.split('h')[1]} ${openTime.split('h')[0]} * * 1`, () => Client.openChannels());
                    scheduleJob(`${closeTime.split('h')[1]} ${closeTime.split('h')[0]} * * 1`, () => Client.closeChannels());
                    break;

                case 'tuesday':
                    scheduleJob(`${openTime.split('h')[1]} ${openTime.split('h')[0]} * * 2`, () => Client.openChannels());
                    scheduleJob(`${closeTime.split('h')[1]} ${closeTime.split('h')[0]} * * 2`, () => Client.closeChannels());
                    break;

                case 'wednesday':
                    scheduleJob(`${openTime.split('h')[1]} ${openTime.split('h')[0]} * * 3`, () => Client.openChannels());
                    scheduleJob(`${closeTime.split('h')[1]} ${closeTime.split('h')[0]} * * 3`, () => Client.closeChannels());
                    break;

                case 'thursday':
                    scheduleJob(`${openTime.split('h')[1]} ${openTime.split('h')[0]} * * 4`, () => Client.openChannels());
                    scheduleJob(`${closeTime.split('h')[1]} ${closeTime.split('h')[0]} * * 4`, () => Client.closeChannels());
                    break;

                case 'friday':
                    scheduleJob(`${openTime.split('h')[1]} ${openTime.split('h')[0]} * * 5`, () => Client.openChannels());
                    scheduleJob(`${closeTime.split('h')[1]} ${closeTime.split('h')[0]} * * 5`, () => Client.closeChannels());
                    break;
                
                case 'saturday':
                    scheduleJob(`${openTime.split('h')[1]} ${openTime.split('h')[0]} * * 6`, () => Client.openChannels());
                    scheduleJob(`${closeTime.split('h')[1]} ${closeTime.split('h')[0]} * * 6`, () => Client.closeChannels());
                    break;

                case 'sunday':
                    scheduleJob(`${openTime.split('h')[1]} ${openTime.split('h')[0]} * * 0`, () => Client.openChannels());
                    scheduleJob(`${closeTime.split('h')[1]} ${closeTime.split('h')[0]} * * 0`, () => Client.closeChannels());
                    break;
            }
        }
    }

    // Client.musicPlayer.init(Client);

    let commands = [];
    let guildCommands = {};

    Client.commands.forEach(command => {
        if (process.env.ENVIRONMENT !== "dev" && command.description?.startsWith("DEVMODE")) return;
        let data = new SlashCommandBuilder()
                .setName(command.name)
                .setDescription(command.description || 'Aucune description');

        if (command.options?.length > 0) {
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

        if (command.guilds) {
            command.guilds.forEach(guild => {
                if (!guildCommands[guild]) guildCommands[guild] = [];
                guildCommands[guild].push(data.toJSON());
            });
        } else {
            commands.push(data.toJSON());
        }
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

        for (let i in guildCommands) {
            await rest.put(
                Routes.applicationGuildCommands(Client.user.id, i),
                { body: guildCommands[i] }
            );
        }
    } catch (e) {
        Client.log.error(e)
    }

    Client.log.info('Commands publication has been completed');
}