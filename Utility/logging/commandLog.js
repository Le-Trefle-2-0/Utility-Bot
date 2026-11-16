const { EmbedBuilder } = require('discord.js');
const { emitLog, clip, channelRef, isEnabled } = require('./helpers');

// Commandes grand public, non journalisées
const IGNORED = new Set(['ping', 'play', 'rank', 'top', 'list', 'listrole', 'roleinfo', 'replyquestion', 'collectetop', 'levelrewardlist', 'doublexplist']);
// Commandes de configuration / d'administration du bot
const ADMIN = new Set(['setupticket', 'importdraftbot', 'closeexception', 'closeexceptionremove', 'closechannels', 'openchannels',
    'setxp', 'givexp', 'doublexp', 'doublexpstop', 'levelreward', 'levelrewardremove', 'collectecreate', 'collecteend', 'collectegive']);

const FAILURE = /^:x:|permission|erreur|impossible|introuvable|je ne peux pas|déjà/i;
// Dans un embed, seul un message d'erreur explicite (« :x: | … ») compte comme échec : un message de succès
// peut contenir « déjà », « impossible »… sans être une erreur.
const EMBED_FAILURE = /^\s*(:x:|❌|⛔)/;
const DENIED = /permission|supérieur|droit|réservée/i;

/** Texte de la première réponse : contenu, sinon description (ou titre) du premier embed. */
const replyText = (options) => {
    if (typeof options === 'string') return { text: options, embed: false };
    if (options?.content) return { text: options.content, embed: false };
    const first = options?.embeds?.[0];
    const data = first?.data ?? first;
    const text = data?.description ?? data?.title;
    return text ? { text, embed: true } : { text: null, embed: false };
};

const describeOptions = (interaction) => {
    const data = interaction.options?.data ?? [];
    if (interaction.isContextMenuCommand?.()) {
        return interaction.targetUser ? `cible : <@${interaction.targetUser.id}>` : (interaction.targetMessage ? `message : ${interaction.targetMessage.url}` : '');
    }
    return data.map(option => {
        const value = option.user ? `<@${option.user.id}>` : option.channel ? `<#${option.channel.id}>` : option.role ? `<@&${option.role.id}>` : clip(option.value, 150);
        return `${option.name}: ${value}`;
    }).join(', ');
};

/**
 * Exécute une commande / un menu contextuel en journalisant son usage, son résultat,
 * ses échecs et les refus de permission (lecture du texte de la première réponse).
 */
const runLogged = async (Client, interaction, run) => {
    const name = (interaction.commandName || '').toLowerCase();
    if (!isEnabled(Client, 'commands') || IGNORED.has(name)) return run();

    const captured = { text: null, embed: false };
    for (const method of ['reply', 'editReply', 'followUp']) {
        const original = interaction[method]?.bind(interaction);
        if (!original) continue;
        interaction[method] = (options, ...rest) => {
            if (captured.text === null) {
                const { text, embed } = replyText(options);
                if (text) Object.assign(captured, { text, embed });
            }
            return original(options, ...rest);
        };
    }

    let error = null;
    try {
        await run();
    } catch (e) {
        error = e;
        throw e;
    } finally {
        const failed = Boolean(error) || (captured.text && (captured.embed ? EMBED_FAILURE : FAILURE).test(captured.text));
        const denied = !error && captured.text && (!captured.embed || failed) && DENIED.test(captured.text);
        const kind = ADMIN.has(name) ? 'Commande d\'administration du bot' : 'Commande de modération / staff';
        const options = describeOptions(interaction);

        const embed = new EmbedBuilder()
            .setTitle(denied ? '⛔ Tentative refusée (permission manquante)' : failed ? `❌ Action ${ADMIN.has(name) ? 'd\'administration' : 'de modération'} échouée` : `⌨️ ${kind}`)
            .setDescription(
                `**Commande :** \`${interaction.isContextMenuCommand?.() ? interaction.commandName : `/${interaction.commandName}`}\`\n` +
                `**Utilisateur :** <@${interaction.user.id}> (\`${interaction.user.id}\`)\n` +
                `**Salon :** ${interaction.channel ? channelRef(interaction.channel) : '*inconnu*'}\n` +
                (options ? `**Paramètres :** ${clip(options, 600)}\n` : '') +
                `**Résultat :** ${error ? `❌ erreur — ${clip(error.message, 300)}` : failed ? `❌ ${clip(captured.text.replace(/^\s*(:x:|❌|⛔)\s*\|?\s*/, ''), 300)}` : '✅ exécutée'}`
            )
            .setColor(denied || failed ? 'c1121f' : '8B0000');
        emitLog(Client, 'bot', embed);
    }
};

module.exports = { runLogged };
