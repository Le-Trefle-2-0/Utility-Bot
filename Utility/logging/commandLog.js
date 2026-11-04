const { EmbedBuilder } = require('discord.js');
const { emitLog, clip, channelRef, isEnabled } = require('./helpers');

// Commandes grand public, non journalisées
const IGNORED = new Set(['ping', 'play', 'rank', 'top', 'list', 'listrole', 'roleinfo', 'replyquestion']);
// Commandes de configuration / d'administration du bot
const ADMIN = new Set(['setupticket', 'importdraftbot', 'closeexception', 'closeexceptionremove', 'closechannels', 'openchannels']);

const FAILURE = /^:x:|permission|erreur|impossible|introuvable|je ne peux pas|déjà/i;
const DENIED = /permission|supérieur|droit/i;

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

    const captured = { text: null };
    for (const method of ['reply', 'editReply', 'followUp']) {
        const original = interaction[method]?.bind(interaction);
        if (!original) continue;
        interaction[method] = (options, ...rest) => {
            const content = typeof options === 'string' ? options : options?.content;
            if (content && captured.text === null) captured.text = content;
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
        const failed = Boolean(error) || (captured.text && FAILURE.test(captured.text));
        const denied = !error && captured.text && DENIED.test(captured.text);
        const kind = ADMIN.has(name) ? 'Commande d\'administration du bot' : 'Commande de modération / staff';
        const options = describeOptions(interaction);

        const embed = new EmbedBuilder()
            .setTitle(denied ? '⛔ Tentative refusée (permission manquante)' : failed ? '❌ Action de modération échouée' : `⌨️ ${kind}`)
            .setDescription(
                `**Commande :** \`${interaction.isContextMenuCommand?.() ? interaction.commandName : `/${interaction.commandName}`}\`\n` +
                `**Utilisateur :** <@${interaction.user.id}> (\`${interaction.user.id}\`)\n` +
                `**Salon :** ${interaction.channel ? channelRef(interaction.channel) : '*inconnu*'}\n` +
                (options ? `**Paramètres :** ${clip(options, 600)}\n` : '') +
                `**Résultat :** ${error ? `❌ erreur — ${clip(error.message, 300)}` : failed ? `❌ ${clip(captured.text, 300)}` : '✅ exécutée'}`
            )
            .setColor(denied || failed ? 'c1121f' : '8B0000');
        emitLog(Client, 'moderation', embed);
    }
};

module.exports = { runLogged };
