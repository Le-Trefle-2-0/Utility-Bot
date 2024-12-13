module.exports = async (Client, interaction) => {
    if (interaction.isButton()) {
        let button = Client.buttons.get(interaction.customId);

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
}