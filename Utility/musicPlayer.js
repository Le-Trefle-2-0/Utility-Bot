const ytdl = require('ytdl-core');
const {EmbedBuilder} = require('discord.js');
const {createAudioPlayer, createAudioResource} = require('@discordjs/voice');
const play = require('../Commands/play');
let client;

module.exports = {
    init: (Client) => {
        client = Client;
        client.queue = new Map();
    },

    play: (Client, guild) => {
        let queue = Client.queue.get(guild.id);
        if (!queue) return;

        async function playQueue() {
            let song = queue.songs[0];

            let youtubeStream = ytdl(song.url, { 
                filter: 'audioonly',
                quality: 'lowestaudio'
            });
            let audioRessource = createAudioResource(youtubeStream);
            // audioRessource.volume.setVolume(0.5);

            let audioPlayer = createAudioPlayer();
            audioPlayer.play(audioRessource);

            queue.player = audioPlayer;
            queue.connection.subscribe(audioPlayer);

            if (queue.playInterval) clearInterval(queue.playInterval);

            queue.startTime = Date.now();

            queue.playInterval = setInterval(() => {
                if (audioRessource.silenceRemaining == 0) {
                    clearInterval(queue.playInterval);
                    // if (queue.loop) {
                    //     queue.songs.push(queue.songs[0]);
                    // }
                    queue.songs.shift();

                    let newSond = queue.songs[0];
                    if (!newSond) {
                        queue.player.stop();
                        queue.connection.destroy();
                        console.log(Client.queue.delete(guild.id));
                        queue.dashboard.edit({
                            embeds: [
                                new EmbedBuilder()
                                    .setColor('1a356f')
                                    .setDescription('🎶 | La file d\'attente est vide !')
                            ]
                        });

                        return;
                    } else {
                        playQueue();
                    }
                }

                let progress = Date.now() - queue.startTime;
                let progressPercent = Math.round((progress / song.duration) * 10);
                let progressBar = '';
                for (let i = 0; i < 10; i++) {
                    if (i == progressPercent) {
                        progressBar += '🟠';
                    } else {
                        progressBar += '<:ligne:913706646864293908>';
                    }
                }
                let playTime = new Date(progress).toISOString();

                queue.dashboard.edit({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#0099ff')
                            .setDescription(`**En cours de lecture : \`${song.title}\` (${song.durationFormatted})**

                            Ajouté par : <@${song.addedBy.id}>
                            ${playTime} ${progressBar} ${song.durationFormatted}
                            
                            ${queue.songs.length - 1 > 0 ? `File d'attente :\n\n${toPlayTxt}` : '*Aucune musique dans la file d\'attente*'}`)
                            .setThumbnail(song.thumbnail.url)
                    ]
                });
            }, 1000);

            let toPlayTxt = '';
            for (let i = 0; i < queue.songs.length; i++) {
                if (i == 0) continue;
                toPlayTxt += `**${i}.** ${queue.songs[i].title} (${queue.songs[i].durationFormatted})\n`;
            }

            queue.dashboard.edit({
                embeds: [
                    new EmbedBuilder()
                        .setColor('#0099ff')
                        .setDescription(`**En cours de lecture : \`${song.title}\` (${song.durationFormatted})**

                        Ajouté par : <@${song.addedBy.id}>
                        00:00 🟠<:ligne:913706646864293908><:ligne:913706646864293908><:ligne:913706646864293908><:ligne:913706646864293908><:ligne:913706646864293908><:ligne:913706646864293908><:ligne:913706646864293908><:ligne:913706646864293908><:ligne:913706646864293908><:ligne:913706646864293908> ${song.durationFormatted}
                        
                        ${queue.songs.length - 1 > 0 ? `File d'attente :\n\n${toPlayTxt}` : '*Aucune musique dans la file d\'attente*'}`)
                        .setThumbnail(song.thumbnail.url)
                ]
            });
            
        }

        playQueue();
    }
}