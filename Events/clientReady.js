const { ContextMenuCommandBuilder, ApplicationCommandType, ApplicationCommandOptionType, EmbedBuilder, SlashCommandBuilder, REST, Routes, ActivityType, PresenceUpdateStatus, disableValidators } = require('discord.js');
const { scheduleJob } = require('node-schedule');
const { Moon } =require('lunarphase-js');
const { Op } = require('sequelize');
const ms = require('ms');
const { initializeLLMProvider } = require('../Utility/llmProvider');
const ticketsMaintenance = require('../Utility/ticketsMaintenance');
const closeExceptions = require('../Utility/closeExceptions');

module.exports = async (Client) => {
    disableValidators();
    Client.log.info('WebSocket connection to Discord has been established');
    await initializeLLMProvider(Client);

    Client.log.info('Starting commands publication');

    Client.user.setPresence({
        activities: [ { name: '🍀 Regarde les trèfles pousser', type: ActivityType.Custom } ],
        status: PresenceUpdateStatus.Online
    })

    // Avertissement avant fermeture des salons vocaux
    const WARNING_DELAY = 5 * 60 * 1000;
    Client.closeAt = null;
    Client.closeWarned = new Set();

    Client.getClosableVoiceChannels = () => {
        const guild = Client.guilds.cache.get(process.env.MAIN_GUILD_ID);
        if (!guild) return [];
        const ids = new Set(Object.values(Client.settings.toClose.roles).flat());
        return [...ids].map(id => guild.channels.cache.get(id)).filter(channel => channel?.type === 2);
    };

    Client.warnVoiceChannel = async (channel) => {
        if (!Client.closeAt || Client.closeWarned.has(channel.id) || channel.members.size === 0) return;
        Client.closeWarned.add(channel.id);
        const closeTimestamp = Math.floor(Client.closeAt / 1000);
        try {
            await channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setTitle('⚠️ Fermeture imminente des salons')
                        .setDescription(`Les salons vocaux et textuels vont fermer <t:${closeTimestamp}:R> (à <t:${closeTimestamp}:t>).\n\nÀ l'heure de la fermeture, **toutes les personnes encore connectées en vocal seront déconnectées automatiquement**. Pensez à finir votre conversation !`)
                        .setColor('f0a132')
                ]
            });
        } catch (err) {
            Client.closeWarned.delete(channel.id);
            Client.log.error(err);
        }
    };

    Client.startCloseWarning = async () => {
        const now = new Date();
        now.setSeconds(0, 0);
        Client.closeAt = now.getTime() + WARNING_DELAY;
        Client.closeWarned.clear();
        for (const channel of Client.getClosableVoiceChannels()) {
            await Client.warnVoiceChannel(channel);
        }
    };

    Client.closeChannels = async () => {
        Client.closeAt = null;
        Client.closeWarned.clear();
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
                                    await Promise.all(channel.members.map(member =>
                                        member.voice.disconnect('Fermeture programmée des salons').catch(err => Client.log.error(err))
                                    ));
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
                                            .setTitle('<:on:1543941282601111612> Bonjour à toutes et à tous, les canaux vocaux et textuels sont ouverts.')
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
        const days = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
        const defaults = Client.settings.toClose.schedule.default;
        for (let weekDay of Object.keys(days)) {
            const daySchedule = Client.settings.toClose.schedule[weekDay];
            let openTime = daySchedule?.[0] || defaults?.[0];
            let closeTime = daySchedule?.[1] || defaults?.[1];
            if (!openTime || !closeTime) continue;

            const [openH, openM] = openTime.split('h');
            const [closeH, closeM] = closeTime.split('h');
            const day = days[weekDay];
            scheduleJob(`${openM} ${openH} * * ${day}`, () => Client.openChannels());
            scheduleJob(`${closeM} ${closeH} * * ${day}`, async () => {
                if (await closeExceptions.getException(Client, new Date())) return; // fermeture reportée par une exception
                Client.closeChannels();
            });

            // Avertissement 5 minutes avant la fermeture (peut passer sur la veille)
            let warnMinutes = parseInt(closeH) * 60 + parseInt(closeM) - WARNING_DELAY / 60000;
            let warnDay = day;
            let daysAhead = 0; // la fermeture a lieu `daysAhead` jour(s) après l'avertissement
            if (warnMinutes < 0) {
                warnMinutes += 24 * 60;
                warnDay = (day + 6) % 7;
                daysAhead = 1;
            }
            scheduleJob(`${warnMinutes % 60} ${Math.floor(warnMinutes / 60)} * * ${warnDay}`, async () => {
                const closeDate = new Date();
                closeDate.setDate(closeDate.getDate() + daysAhead);
                if (await closeExceptions.getException(Client, closeDate)) return;
                Client.startCloseWarning();
            });
        }
    }

    closeExceptions.scheduleAll(Client);

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
                    case ApplicationCommandOptionType.String:
                        data.addStringOption(opt =>
                            opt.setName(option.name)
                                .setDescription(option.desc || 'Aucune description')
                                .setRequired(option.required)
                        );
                        break;

                    case 'int':
                    case ApplicationCommandOptionType.Integer:
                        data.addIntegerOption(opt =>
                            opt.setName(option.name)
                                .setDescription(option.desc || 'Aucune description')
                                .setRequired(option.required)
                        );
                        break;

                    case 'number':
                    case ApplicationCommandOptionType.Number:
                        data.addNumberOption(opt =>
                            opt.setName(option.name)
                                .setDescription(option.desc || 'Aucune description')
                                .setRequired(option.required)
                        );
                        break;

                    case 'boolean':
                    case ApplicationCommandOptionType.Boolean:
                        data.addBooleanOption(opt =>
                            opt.setName(option.name)
                                .setDescription(option.desc || 'Aucune description')
                                .setRequired(option.required)
                        );
                        break;

                    case 'user':
                    case ApplicationCommandOptionType.User:
                        data.addUserOption(opt =>
                            opt.setName(option.name)
                                .setDescription(option.desc || 'Aucune description')
                                .setRequired(option.required)
                        );
                        break;

                    case 'channel':
                    case ApplicationCommandOptionType.Channel:
                        data.addChannelOption(opt =>
                            opt.setName(option.name)
                                .setDescription(option.desc || 'Aucune description')
                                .setRequired(option.required)
                        );
                        break;

                    case 'role':
                    case ApplicationCommandOptionType.Role:
                        data.addRoleOption(opt =>
                            opt.setName(option.name)
                                .setDescription(option.desc || 'Aucune description')
                                .setRequired(option.required)
                        );
                        break;

                    default:
                        Client.log?.warn?.(`Unknown option type '${option.type}' for command '${command.name}', option '${option.name}'`);
                        break;
                }
            }
        }

        if (command.guilds) {
            command.guilds.forEach(guild => {
                const guildID = guild === 'mainGuildID' ? Client.settings.mainGuildID : guild;
                if (!guildCommands[guildID]) guildCommands[guildID] = [];
                guildCommands[guildID].push(data.toJSON());
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

    // Suivi des tickets : suppression différée, rappels, fermeture si le membre est parti
    ticketsMaintenance.start(Client);

    // Invite tracking
    Client.invites = new Map();
    const mainGuild = Client.guilds.cache.get(Client.settings.mainGuildID);
    if (mainGuild) {
        try {
            const guildInvites = await mainGuild.invites.fetch();
            Client.invites.set(mainGuild.id, new Map(guildInvites.map(invite => [invite.code, invite.uses])));
            Client.log.info(`Cached ${guildInvites.size} invites for guild ${mainGuild.id}`);
        } catch (err) {
            Client.log.error(`Failed to fetch invites for guild ${mainGuild.id}:`, err);
        }
    }
}