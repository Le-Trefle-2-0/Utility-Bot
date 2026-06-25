const ms = require("ms");
const {Op} = require("sequelize");
const {MessageFlags, EmbedBuilder, ChannelType} = require("discord.js");
const {scheduleJob} = require("node-schedule");

module.exports = async (Client, member) => {
    // Determine inviter
    let inviterText = "Inconnu ou via vanité";
    try {
        const cachedInvites = Client.invites.get(member.guild.id);
        const newInvites = await member.guild.invites.fetch();
        
        const invite = newInvites.find(i => cachedInvites.get(i.code) < i.uses);
        if (invite) {
            inviterText = `<@${invite.inviter.id}> (Code: \`${invite.code}\`)`;
            cachedInvites.set(invite.code, invite.uses);
        } else if (member.guild.features.includes('VANITY_URL')) {
            // Check vanity URL if possible
            // Note: discord.js doesn't provide a direct way to track vanity uses easily without caching it too
        }
    } catch (err) {
        Client.log?.error('Error finding inviter:', err);
    }

    let previousSoftban = await Client.ModLogs.findAll({
        where: {
            userID: member.id,
            guildID: member.guild.id,
            type: {
                [Op.startsWith]: 'Softban'
            }
        }
    });
    let durations = ['7d', '30d', '365d', '36500d'];
    let sb = false;

    let newDuration = durations[previousSoftban.length-1];
    for (let softban of previousSoftban) {
        let softbanStartDate = new Date(softban.createdAt).getTime();
        let softbanEndDate = softbanStartDate + ms(softban.type.split(' ')[1]);

        if (softbanEndDate > Date.now()) {
            sb = true;
            for (let role of Object.keys(Client.settings.toClose.roles)) {
                for (let channelID of Client.settings.toClose.roles[role]) {
                    let channel = member.guild.channels.cache.get(channelID);
                    if (channel) {
                        switch (channel.type) {
                            case 0:
                                channel.permissionOverwrites.edit(member, {
                                    SendMessages: false,
                                    AddReactions: false,
                                    SendMessagesInThreads: false,
                                    AddReactions: false,
                                    ViewChannel: false,
                                    ReadMessageHistory: false,
                                });
                                scheduleJob(new Date(Date.now() + ms(newDuration)), async () => {
                                    channel.permissionOverwrites.delete(member);
                                });
                                break;

                            case 2:
                                channel.permissionOverwrites.edit(member, {
                                    Speak: false,
                                    SendMessages: false,
                                    Connect: false,
                                    ViewChannel: false,
                                });
                                scheduleJob(new Date(Date.now() + ms(newDuration)), async () => {
                                    channel.permissionOverwrites.delete(member);
                                });
                                channel.members.forEach(voiceMember => {
                                    if (member.id == voiceMember.id) voiceMember.voice.disconnect();
                                });
                                break;
                        }
                    }
                }
            }
        }
    }
    const embed = new EmbedBuilder()
        .setAuthor({
            name: member.user.displayName || member.user.username,
            iconURL: member.user.displayAvatarURL({ dynamic: true })
        })
        .setDescription(
            `👤 **Membre :** <@${member.id}> (\`${member.id}\`)\n` +
            `✉️ **Invité par :** ${inviterText}\n` +
            `📅 **Compte créé le :** <t:${Math.floor(member.user.createdTimestamp / 1000)}:f> (<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>)\n` +
            `📊 **Âge du compte :** ${ms(Date.now()-member.user.createdTimestamp)}${sb ? '\n⚠️ **Soft-ban réactivé automatiquement**' : ''}`
        )
        .setFooter({ text: `ID de l'utilisateur : ${member.id}` });

    Client.emit('logs', 'member', embed);

    if (!sb) {
        try {
            await sendWelcomeThread(Client, member);
        } catch (err) {
            console.error('Erreur lors de la création du fil de bienvenue :', err);
        }
    }
};

async function sendWelcomeThread(Client, member) {
    const welcomeChannelID = Client.settings.welcomeChannelID;
    const channel = member.guild.channels.cache.get(welcomeChannelID);
    if (!channel) return;

    const thread = await channel.threads.create({
        name: `Bienvenue ${member.user.displayName}`,
        type: ChannelType.PrivateThread,
        invitable: false,
        reason: `Fil d'accueil pour ${member.user.tag}`
    });

    const embed = new EmbedBuilder()
        .setTitle('<:letrefle:881678451608788993> Bienvenue sur Le Trèfle 2.0 !')
        .setDescription(
            "Notre association propose un espace de soutien moral et d'écoute gratuit, anonyme et bienveillant. Voici un petit tour des salons à connaître pour bien démarrer :\n\n" +
            "<#1352036568621121658> : à lire en priorité, les règles de vie sur le serveur\n\n" +
            "<#718250345951658064> : des numéros et ressources utiles en cas de besoin\n\n" +
            "<#720266206560387163> : pour solliciter une écoute lors des permanences\n\n" +
            "<#718248830428119121> : le salon principal pour discuter et se présenter\n\n" +
            "<#960639230818807909> & <#838467546440794212> : pour trouver ou poser vos questions\n\n" +
            "<#952243476748193862> : pour contacter nos équipes communautaires directement\n\n" +
            "<#1083868987798061158> : proposez vos idées pour faire évoluer l'association"
        )
        .setColor(0x9BD2D2)
        .setImage('https://cdn.discordapp.com/attachments/838438842649673829/1515045531334737930/Logotype_2_sombre.png?ex=6a2d939a&is=6a2c421a&hm=d7f20a7f868731a7d8e7e76bbd7c5d20163515273bd939d7e749a20fdc6d68ca&');

    await thread.members.add(member.id);

    await thread.send({
        embeds: [embed]
    });

    let llmMessages = await getWelcomeMessages(member);

    for (const msg of llmMessages) {
        await thread.sendTyping();
        await new Promise(r => setTimeout(r, 4000 + Math.random() * 4000));
        await thread.send(msg);
    }
}

async function getWelcomeMessages(member) {
    const pseudo = member.displayName;
    const bio = member.user.bio || '';
    const avatarURL = member.user.displayAvatarURL({ extension: 'png', size: 256 });

    const fallback = [
        `Bienvenue parmi nous !`,
        `On est ravis de t'avoir avec nous sur Le Trèfle 2.0.`,
        `Bon, je t'embête pas plus longtemps, je te laisse explorer le serveur. N'hésite pas à faire signe à notre équipe de Guides si tu as besoin d'un coup de main !`
    ];

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'qwen/qwen3.6-27b',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: `Pseudo : ${pseudo}\nBio : ${bio || '(aucune)'}` },
                            { type: 'image_url', image_url: { url: avatarURL } }
                        ]
                    }
                ],
                temperature: 0.7,
                max_tokens: 300,
                reasoning_effort: "none"
            })
        });

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content;

        content = content.trim();
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            content = jsonMatch[0];
        }

        const parsed = JSON.parse(content);

        if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) {
            return fallback;
        }

        const EMOJI_MAP = {
            '[trefle]': '<:letrefle:881678451608788993>',
            '[hehe]': '<a:hehe:913716370640867350>',
            '[bravo]': '<a:bravo:982050507898126356>',
            '[pika]': '<a:pika:965676819674173440>',
            '[ouou]': '<a:ouou:865571968727384085>'
        };

        return parsed.messages.map(msg => {
            let processed = msg.replace(/\bguides?\b/gi, '<:helper:1207378732625567824> Guides');
            for (const [tag, emoji] of Object.entries(EMOJI_MAP)) {
                processed = processed.split(tag).join(emoji);
            }
            return processed;
        });

    } catch (err) {
        console.error('Erreur API Groq / parsing :', err);
        return fallback;
    }
}

const SYSTEM_PROMPT = `Tu es l'hôte d'accueil chaleureux et un peu taquin du serveur Discord Le Trèfle 2.0, une association d'écoute et de soutien moral. Génère un message de bienvenue en 4 à 5 messages courts pour un nouveau membre, en français exclusivement, en le tutoyant. 

Le pseudo fourni peut être complet ou composé (ex : "Paul de Théorie Vermillon", "juliette_2025", "xX_DarkWolf_Xx"). Déduis-en un prénom ou surnom court et naturel à utiliser dans le message (ex : "Paul", "Juliette", "DarkWolf"). N'utilise jamais le pseudo complet ou un identifiant avec underscores/chiffres tel quel.

Sois chaleureux, bienveillant, avec une touche d'humour léger si pertinent (jeu de mots sur le prénom déduit ou la bio, clin d'œil sympa). Varie ton phrasé et tes tournures d'un message à l'autre, évite les formulations toutes faites et répétitives. Reste toujours respectueux, jamais moqueur ni intrusif. N'écris pas le nom du serveur entre guillemets. Ce message est envoyé dans un salon en lecture seule : ne pose pas de question et n'invite pas la personne à répondre ou à se présenter.

Profite de ces 4-5 messages pour développer un peu plus l'accueil : un mot de bienvenue, une petite touche personnelle ou d'humour, éventuellement un mot sur l'esprit de l'association ou ce qu'on peut y trouver, avant la conclusion. Chaque message doit rester court (1-2 phrases), comme une personne qui écrit plusieurs messages successifs sur Discord plutôt qu'un seul pavé.

Le dernier message du tableau doit toujours suivre cet esprit, en variant la formulation : informer la personne qu'on la laisse explorer le serveur tranquillement, et lui rappeler qu'elle peut solliciter l'équipe de Guides en cas de besoin (sans poser de question). Voici quelques exemples de ton pour t'inspirer SANS LES COPIER : "Bon, je t'embête pas plus longtemps, je te laisse explorer le serveur. N'hésite pas à faire signe à notre équipe de Guides si tu as besoin d'un coup de main !" / "Allez, place à l'exploration ! Si jamais tu cherches ton chemin, notre équipe de Guides est là pour toi." / "Je te laisse te balader tranquillement par ici, et si besoin l'équipe de Guides répond toujours présente."

Réponds UNIQUEMENT avec un objet JSON de la forme {"messages": ["premier message", "deuxième message", "troisième message", "quatrième message", "cinquième message optionnel"]}.

Tu reçois également l'avatar (photo de profil) de la personne. Si l'avatar représente quelque chose de notable (animal, personnage, objet, paysage, couleur dominante, style...), tu peux glisser un commentaire bref et léger à ce sujet dans UN SEUL des messages, par exemple "PS : sympa le cygne sur ton avatar !" ou "j'aime bien les couleurs de ta photo de profil". Ce commentaire doit porter UNIQUEMENT sur l'élément visuel en lui-même, jamais sur la personne (n'utilise jamais des mots comme "tu es", "tu as l'air", "tu sembles" en lien avec l'avatar). Ce n'est pas obligatoire à chaque fois — ne le fais que si l'avatar t'inspire vraiment quelque chose de gentil à dire sur l'image elle-même, sinon n'en parle pas. Ne décris jamais l'avatar de façon détaillée, reste sur une remarque brève.

Le fil étant en lecture seule pour la personne, profite d'un des messages (pas nécessairement le dernier) pour l'inviter à aller se présenter et échanger dans le salon général si elle le souhaite. Mentionne ce salon avec la syntaxe <#818807139295297549>.

Tu peux également utiliser, avec modération (pas plus de 2-3 sur l'ensemble des messages), les emojis personnalisés suivants en les insérant tels quels sous cette forme exacte : [trefle], [hehe], [bravo], [pika], [ouou]. Voici leur signification pour t'aider à les utiliser à bon escient :
- [trefle] : le logo de l'association
- [hehe] : clin d'œil malicieux/complice
- [bravo] : panda qui applaudit, pour féliciter/encourager
- [pika] : Pikachu qui fait coucou, pour saluer
- [ouou] : un blob qui fait coucou, salutation mignonne

Utilise-les naturellement dans le texte, ne les liste pas tous, choisis ceux qui correspondent au ton du moment.`;
