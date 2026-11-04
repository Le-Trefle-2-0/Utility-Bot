const sequelize = require('sequelize');
const {EmbedBuilder} = require("discord.js");
const {scheduleJob} = require("node-schedule");
const {Op} = require("sequelize");
const ms = require("ms");

module.exports = async (Client) => {
    Client.db = new sequelize({
        dialect: 'sqlite',
        storage: './database.sqlite',
        logging: false
    });

    Client.Questions = await Client.db.define('questions', {
        id: {
            type: sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        question: {
            type: sequelize.STRING,
            allowNull: false
        },
        answer: {
            type: sequelize.STRING,
            allowNull: false
        },
        threadLink: {
            type: sequelize.STRING,
            allowNull: true
        }
    }).sync({ alter: true });

    Client.Tickets = await Client.db.define('tickets', {
        id: {
            type: sequelize.UUID,
            primaryKey: true,
            defaultValue: sequelize.UUIDV4
        },
        userID: {
            type: sequelize.STRING,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        channelID: {
            type: sequelize.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true
            }
        },
        assignedTeam: {
            type: sequelize.STRING,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        createdAt: {
            type: sequelize.DATE,
            allowNull: false,
            defaultValue: sequelize.NOW
        },
        closedAt: {
            type: sequelize.DATE,
            allowNull: true
        },
        closedBy: {
            type: sequelize.STRING,
            allowNull: true
        },
        // Renseigné uniquement pour les tickets ouverts par un staff via /summon
        summonedBy: {
            type: sequelize.STRING,
            allowNull: true
        },
        // Staff qui a pris le ticket en charge (null tant qu'il attend l'équipe)
        takenBy: {
            type: sequelize.STRING,
            allowNull: true
        },
        // Depuis quand le ticket attend une prise en charge (ouverture ou dernier transfert)
        waitingSince: {
            type: sequelize.DATE,
            allowNull: true
        },
        lastTeamReminderAt: {
            type: sequelize.DATE,
            allowNull: true
        }
    }, {
        indexes: [
            { fields: ['userID'] },
            { fields: ['assignedTeam'] },
            { fields: ['createdAt'] }
        ]
    }).sync({ alter: true });

    // Salons de tickets clos : verrouillés, puis supprimés à l'échéance (survit aux redémarrages)
    Client.TicketDeletions = await Client.db.define('ticketdeletions', {
        channelID: {
            type: sequelize.STRING,
            primaryKey: true
        },
        deleteAt: {
            type: sequelize.DATE,
            allowNull: false
        }
    }).sync({ alter: true });

    // Exceptions à l'horaire de fermeture des salons (ex : réveillon du nouvel an)
    Client.CloseExceptions = await Client.db.define('closeexceptions', {
        date: {
            type: sequelize.STRING, // AAAA-MM-JJ : jour où la fermeture normale aurait lieu
            primaryKey: true
        },
        closeTime: {
            type: sequelize.STRING, // HHhMM
            allowNull: false
        },
        createdBy: {
            type: sequelize.STRING,
            allowNull: true
        }
    }).sync({ alter: true });

    // Migration : la première version de ces tables n'avait pas de colonne `id` (clé composite, qui
    // rendait chaque colonne UNIQUE sous SQLite). On les recrée en conservant les données.
    const legacyRows = {};
    for (const table of ['levels', 'levelrewards']) {
        try {
            const columns = await Client.db.getQueryInterface().describeTable(table);
            if (!columns.id) {
                legacyRows[table] = await Client.db.query(`SELECT * FROM \`${table}\``, { type: sequelize.QueryTypes.SELECT });
                await Client.db.getQueryInterface().dropTable(table);
            }
        } catch (e) {
            // la table n'existe pas encore : rien à migrer
        }
    }

    // Système de niveaux : XP cumulée par membre et par serveur
    // sync() sans `alter` : l'alter de Sequelize sous SQLite casse les index uniques composites
    Client.Levels = await Client.db.define('levels', {
        id: {
            type: sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userID: {
            type: sequelize.STRING,
            allowNull: false
        },
        guildID: {
            type: sequelize.STRING,
            allowNull: false
        },
        xp: {
            type: sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        level: {
            type: sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
        }
    }, {
        indexes: [
            // Clé composite : un seul enregistrement par membre et par serveur
            { unique: true, fields: ['userID', 'guildID'] },
            { fields: ['guildID', 'xp'] }
        ]
    }).sync();

    // Rôles offerts en récompense en atteignant un niveau (un rôle par niveau et par serveur)
    Client.LevelRewards = await Client.db.define('levelrewards', {
        id: {
            type: sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        guildID: {
            type: sequelize.STRING,
            allowNull: false
        },
        level: {
            type: sequelize.INTEGER,
            allowNull: false
        },
        roleID: {
            type: sequelize.STRING,
            allowNull: false
        }
    }, {
        indexes: [
            { unique: true, fields: ['guildID', 'level'] }
        ]
    }).sync();

    if (legacyRows.levels?.length) {
        await Client.Levels.bulkCreate(legacyRows.levels.map(({ userID, guildID, xp, level }) => ({ userID, guildID, xp, level })), { ignoreDuplicates: true });
    }
    if (legacyRows.levelrewards?.length) {
        await Client.LevelRewards.bulkCreate(legacyRows.levelrewards.map(({ guildID, level, roleID }) => ({ guildID, level, roleID })), { ignoreDuplicates: true });
    }

    // Évènements d'XP multipliée : channelID vaut '*' pour tout le serveur
    Client.XpEvents = await Client.db.define('xpevents', {
        id: {
            type: sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        guildID: {
            type: sequelize.STRING,
            allowNull: false
        },
        channelID: {
            type: sequelize.STRING,
            allowNull: false
        },
        multiplier: {
            type: sequelize.INTEGER,
            allowNull: false,
            defaultValue: 2
        },
        endsAt: {
            type: sequelize.DATE,
            allowNull: false
        },
        createdBy: {
            type: sequelize.STRING,
            allowNull: true
        }
    }, {
        indexes: [
            { unique: true, fields: ['guildID', 'channelID'] }
        ]
    }).sync();

    // Évènements de collecte (ex : cadeaux de Noël) : des émojis apparaissent en réaction, le premier à cliquer le gagne
    Client.CollectEvents = await Client.db.define('collectevents', {
        id: { type: sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        guildID: { type: sequelize.STRING, allowNull: false },
        name: { type: sequelize.STRING, allowNull: false },
        emoji: { type: sequelize.STRING, allowNull: false },       // tel que saisi : 🎁 ou <:nom:id>
        startsAt: { type: sequelize.DATE, allowNull: false },
        endsAt: { type: sequelize.DATE, allowNull: false },
        spawnEvery: { type: sequelize.INTEGER, allowNull: false, defaultValue: 30 }, // ~1 émoji tous les N messages
        channelID: { type: sequelize.STRING, allowNull: true },    // null = tous les salons
        announceChannelID: { type: sequelize.STRING, allowNull: true },
        startAnnounced: { type: sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        endAnnounced: { type: sequelize.BOOLEAN, allowNull: false, defaultValue: false },
        createdBy: { type: sequelize.STRING, allowNull: true }
    }, {
        indexes: [{ fields: ['guildID', 'startsAt', 'endsAt'] }]
    }).sync();

    Client.CollectScores = await Client.db.define('collectscores', {
        id: { type: sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        eventID: { type: sequelize.INTEGER, allowNull: false },
        userID: { type: sequelize.STRING, allowNull: false },
        count: { type: sequelize.INTEGER, allowNull: false, defaultValue: 0 }
    }, {
        indexes: [
            { unique: true, fields: ['eventID', 'userID'] },
            { fields: ['eventID', 'count'] }
        ]
    }).sync();

    // Émojis posés par le bot, en attente d'un premier clic
    Client.CollectDrops = await Client.db.define('collectdrops', {
        id: { type: sequelize.INTEGER, primaryKey: true, autoIncrement: true },
        eventID: { type: sequelize.INTEGER, allowNull: false },
        messageID: { type: sequelize.STRING, allowNull: false },
        channelID: { type: sequelize.STRING, allowNull: false },
        expiresAt: { type: sequelize.DATE, allowNull: false },
        claimedBy: { type: sequelize.STRING, allowNull: true }
    }, {
        indexes: [{ unique: true, fields: ['messageID'] }]
    }).sync();

    Client.Timeouts = await Client.db.define('timeouts', {
        id: {
            type: sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userID: {
            type: sequelize.STRING,
            allowNull: false
        },
        guildID: {
            type: sequelize.STRING,
            allowNull: false
        },
        reason: {
            type: sequelize.STRING,
            allowNull: false
        },
        startTimestamp: {
            type: sequelize.INTEGER,
            allowNull: false
        },
        endTimestamp: {
            type: sequelize.INTEGER,
            allowNull: false
        }
    }).sync({ alter: true });

    Client.ModLogs = await Client.db.define('modlogs', {
        id: {
            type: sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userID: {
            type: sequelize.STRING,
            allowNull: false
        },
        guildID: {
            type: sequelize.STRING,
            allowNull: false
        },
        moderatorID: {
            type: sequelize.STRING,
            allowNull: false
        },
        reason: {
            type: sequelize.STRING,
            allowNull: false
        },
        timestamp: {
            type: sequelize.INTEGER,
            allowNull: false
        },
        type: {
            type: sequelize.STRING,
            allowNull: false
        }
    }).sync({ alter: true });

    
    // Cleanup: ensure any legacy DM Lock table is removed from the database
    try {
        const qi = Client.db.getQueryInterface();
        await qi.dropTable('security_settings');
    } catch (e) {
        // ignore if it does not exist or cannot be dropped
    }



    let timeouts = await Client.Timeouts.findAll();
    for (let timeout of timeouts) {
        let member = await Client.guilds.cache.get(timeout.guildID).members.fetch(timeout.userID);
        if (member) {
            if (timeout.endTimestamp < Date.now()) {
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
                continue;
            }
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

    // Note: DM Lock feature has been fully removed. Any legacy scheduled jobs or helpers were deleted.

    let softbans = await Client.ModLogs.findAll({
        where: {
            type: {
                [Op.startsWith]: 'Softban'
            }
        }
    });

    for (let softban of softbans) {
        let member = await Client.guilds.cache.get(softban.guildID).members.fetch(softban.userID);
        if (member) {
            let memberSoftbans = await Client.ModLogs.findAll({
                where: {
                    userID: softban.userID,
                    guildID: softban.guildID,
                    type: {
                        [Op.startsWith]: 'Softban'
                    }
                }
            });

            let softbanCount = memberSoftbans.length;
            let isLatest = true;
            // check if the softban is the latests
            for (let memberSoftban of memberSoftbans) {
                if (memberSoftban.timestamp > softban.timestamp) {
                    isLatest = false;
                }
            }

            if (isLatest) {
                let durations = ['7d', '30d', '365d', '36500d'];
                let newDuration = durations[softbanCount];
                for (let role of Object.keys(Client.settings.toClose.roles)) {
                    for (let channelID of Client.settings.toClose.roles[role]) {
                        let channel = member.guild.channels.cache.get(channelID);
                        if (channel) {
                            switch (channel.type) {
                                case 0:
                                    scheduleJob(new Date(Date.now() + ms(newDuration)), async () => {
                                        channel.permissionOverwrites.delete(member);
                                    });
                                    break;

                                case 2:
                                    scheduleJob(new Date(Date.now() + ms(newDuration)), async () => {
                                        channel.permissionOverwrites.delete(member);
                                    });
                                    break;
                            }
                        }
                    }
                }
                scheduleJob(new Date(Date.now() + ms(newDuration)), async () => {
                    member.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor('9bd2d2')
                                .setTitle('Softban')
                                .setDescription(`Votre softban du serveur **${member.guild.name}** s'est terminé.`)
                                .setAuthor({
                                    name: member.guild.name,
                                    iconURL: member.guild.iconURL({ dynamic: true })
                                })
                        ]
                    });
                });
            }
        }
    }
}