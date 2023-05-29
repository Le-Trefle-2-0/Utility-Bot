const { EmbedBuilder } = require('discord.js');
const ytdl = require('ytdl-core');
const {joinVoiceChannel, VoiceConnection} = require('@discordjs/voice');
const ytsearch = require('youtube-sr').default;

module.exports = {
    description: 'Joue une musique',
    options: [
        {
            name: 'recherche',
            desc: 'Titre ou artiste a rechercher',
            type: 'string',
            required: true
        }
    ],
    run: async (Client, interaction) => {
        let userVoice = interaction.member.voice.channel;
        if (!userVoice) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#0099ff')
                        .setDescription('🚫 | Vous devez être dans un salon vocal pour utiliser cette commande !')
                ]
            });
        }

        if (!userVoice.joinable) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#0099ff')
                        .setDescription('🚫 | Je n\'ai pas la permission de rejoindre ce salon vocal !')
                ]
            });
        }

        if (interaction.guild.members.cache.get(Client.user.id).voice.channnel && interaction.guild.members.cache.get(Client.user.id).voice.channnel.id !== userVoice.id) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#0099ff')
                        .setDescription('🚫 | Je suis déja utilisé dans un salon, rejoignez le ou patientez un peu !')
                ]
            });
        }

        if (!userVoice.speakable) {
            return interaction.reply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#0099ff')
                        .setDescription('🚫 | Je n\'ai pas la permission de parler dans ce salon vocal !')
                ]
            });
        }

        await interaction.deferReply({ ephemeral: true });
        let search = await ytsearch.search(interaction.options.getString('recherche'), { limit: 1 });
        
        let serverQueue = Client.queue.get(interaction.guild.id);
        let song = search[0];
        song.addedBy = interaction.user;

        if (!serverQueue) {
            let dashboard = await interaction.channel.send({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#0099ff')
                        .setDescription(`En cours de lecture : ... (00:00)
                        Ajouté par : ...
                        00:00 🟠<:ligne:913706646864293908><:ligne:913706646864293908><:ligne:913706646864293908><:ligne:913706646864293908><:ligne:913706646864293908><:ligne:913706646864293908><:ligne:913706646864293908><:ligne:913706646864293908><:ligne:913706646864293908><:ligne:913706646864293908> 00:00
                        
                        File d'attente : 0`)
                ]
            });

            let queueBase = {
                channel: interaction.member.voice.channel,
                updateChannel: interaction.channel,
                dashboard: dashboard,
                songs: [song],
                volume: 1,
                playing: true,
                connection: null,
                loop: false,
                player: null,
                playInterval: null,
                startTime: null,
            }

            queueBase.connection = await joinVoiceChannel({
                channelId: interaction.member.voice.channel.id,
                guildId: interaction.guild.id,
                adapterCreator: interaction.guild.voiceAdapterCreator
            });

            Client.queue.set(interaction.guild.id, queueBase);
            // serverQueue.connection = new VoiceConnection({
            //     channelId: interaction.member.voice.channel.id,
            //     guildId: interaction.guild.id,
            //     adapterCreator: interaction.guild.voiceAdapterCreator
            // })

            Client.musicPlayer.play(Client, interaction.guild);

            interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#0099ff')
                        .setDescription(`✅ | Démarrage du lecteur audio.`)
                ]
            });
        } else {
            Client.queue.get(interaction.guild.id).songs.push(search[0]);
            return interaction.editReply({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#0099ff')
                        .setDescription(`✅ | **${search[0].title}** a été ajouté a la file d'attente !`)
                ]
            });
        }
    }
}