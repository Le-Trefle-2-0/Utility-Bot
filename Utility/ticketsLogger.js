/**
 * Système de logging pour les tickets
 */

const logTypes = {
    CREATE: 'CREATE',
    TAKE: 'TAKE',
    TRANSFER: 'TRANSFER',
    CLOSE: 'CLOSE',
    ERROR: 'ERROR'
};

const log = (type, data) => {
    const timestamp = new Date().toISOString();
    const color = getColorForType(type);
    const message = `[${color}${type}${color}] ${timestamp} - ${JSON.stringify(data)}`;
    console.log(message);
};

const getColorForType = (type) => {
    const colors = {
        CREATE: '\x1b[32m',   // Green
        TAKE: '\x1b[36m',     // Cyan
        TRANSFER: '\x1b[35m', // Magenta
        CLOSE: '\x1b[33m',    // Yellow
        ERROR: '\x1b[31m'     // Red
    };
    return colors[type] || '\x1b[0m';
};

const logTicketCreate = (ticketId, userId, roleID, channelID) => {
    log(logTypes.CREATE, {
        ticketId,
        userId,
        roleID,
        channelID,
        action: 'Ticket created'
    });
};

const logTicketTake = (ticketId, userId, roleID) => {
    log(logTypes.TAKE, {
        ticketId,
        userId,
        roleID,
        action: 'Ticket taken by staff'
    });
};

const logTicketTransfer = (ticketId, fromRoleID, toRoleID, transferredBy) => {
    log(logTypes.TRANSFER, {
        ticketId,
        fromRoleID,
        toRoleID,
        transferredBy,
        action: 'Ticket transferred'
    });
};

const logTicketClose = (ticketId, closedBy, reason) => {
    log(logTypes.CLOSE, {
        ticketId,
        closedBy,
        reason,
        action: 'Ticket closed'
    });
};

const logError = (context, error) => {
    log(logTypes.ERROR, {
        context,
        error: error.message,
        stack: error.stack
    });
};

module.exports = {
    logTicketCreate,
    logTicketTake,
    logTicketTransfer,
    logTicketClose,
    logError,
    logTypes
};
