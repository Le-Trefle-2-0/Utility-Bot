module.exports = async (Client, interaction) => {
    if (interaction.guildId !== Client.settings.mainGuildID) return;

    if (interaction.isButton()) {
        let button = Client.buttons.get(interaction.customId);

        // Si le bouton n'est pas trouvé par ID exact, on cherche par préfixe (pour les IDs dynamiques)
        if (!button) {
            // On teste des préfixes de plus en plus courts (ex: spam_delete_messages_123 -> spam_delete_messages, spam_delete)
            const parts = interaction.customId.split('_');
            for (let i = parts.length - 1; i > 0; i--) {
                const prefix = parts.slice(0, i).join('_');
                button = Client.buttons.get(prefix);
                if (button) break;
            }
        }

        if (button) {
            try {
                button(Client, interaction);
            } catch (e) {
                if (e) Client.log.error(e);
            }
        }
    }

    if (interaction.isStringSelectMenu()) {
        let menu = Client.menus.get(interaction.customId);

        if (menu) {
            try {
                menu(Client, interaction);
            } catch (e) {
                if (e) Client.log.error(e);
            }
        }
    }

    if (interaction.isCommand()) {
        let command = Client.commands.get(interaction.commandName)

        if (command) {
            try {
                command.run(Client, interaction)
            } catch (e) {
                if (e) Client.log.error(e);
            }
        }
    }

    if (interaction.isContextMenuCommand()) {
        let contextMenu = Client.contextMenus.get(interaction.commandName);

        if (contextMenu) {
            try {
                contextMenu.run(Client, interaction);
            } catch (e) {
                if (e) Client.log.error(e);
            }
        }
    }

    if (interaction.isModalSubmit()) {
        let modal = Client.modals.get(interaction.customId);

        if (modal) {
            try {
                modal(Client, interaction);
            } catch (e) {
                if (e) Client.log.error(e);
            }
        }
    }
}