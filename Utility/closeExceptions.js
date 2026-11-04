const { scheduleJob } = require('node-schedule');

const WARNING_DELAY = 5 * 60 * 1000;
const jobs = new Map(); // date (AAAA-MM-JJ) -> [jobs node-schedule]

const pad = n => String(n).padStart(2, '0');
const dateKey = date => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const formatTime = (h, m) => `${pad(h)}h${pad(m)}`;

/** "1h", "1h30", "01:00" -> { hours, minutes } ou null */
function parseTime(input) {
    const match = /^(\d{1,2})\s*[h:]\s*(\d{2})?$/i.exec(input.trim());
    if (!match) return null;
    const hours = parseInt(match[1]);
    const minutes = match[2] ? parseInt(match[2]) : 0;
    if (hours > 23 || minutes > 59) return null;
    return { hours, minutes };
}

/** "31/12" ou "31/12/2026" -> clé AAAA-MM-JJ ou null. Sans année : prochaine occurrence. */
function parseDate(input) {
    const match = /^(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?$/.exec(input.trim());
    if (!match) return null;
    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    const now = new Date();
    let year = match[3] ? parseInt(match[3]) : now.getFullYear();

    const build = y => {
        const d = new Date(y, month - 1, day);
        return d.getMonth() === month - 1 && d.getDate() === day ? d : null;
    };
    let date = build(year);
    if (!date) return null;
    if (!match[3]) {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (date < today) date = build(year + 1);
        if (!date) return null;
    }
    return dateKey(date);
}

const getException = (Client, date) => Client.CloseExceptions.findByPk(dateKey(date));

/** Heure de fermeture exceptionnelle : si elle précède l'horaire normal du jour, elle tombe le lendemain (après minuit). */
function computeCloseDate(Client, key, closeTime) {
    const [y, mo, d] = key.split('-').map(Number);
    const [h, m] = closeTime.split('h').map(Number);
    const schedule = Client.settings.toClose.schedule || {};
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const normal = schedule[dayNames[new Date(y, mo - 1, d).getDay()]]?.[1] || schedule.default?.[1];

    const close = new Date(y, mo - 1, d, h, m, 0, 0);
    if (normal) {
        const [nh, nm] = normal.split('h').map(Number);
        if (h * 60 + m < nh * 60 + nm) close.setDate(close.getDate() + 1);
    }
    return close;
}

function unschedule(key) {
    for (const job of jobs.get(key) || []) job.cancel();
    jobs.delete(key);
}

function schedule(Client, exception) {
    unschedule(exception.date);
    const closeDate = computeCloseDate(Client, exception.date, exception.closeTime);
    const warnDate = new Date(closeDate.getTime() - WARNING_DELAY);
    const now = new Date();
    const list = [];

    if (warnDate > now) list.push(scheduleJob(warnDate, () => Client.startCloseWarning()));
    if (closeDate > now) list.push(scheduleJob(closeDate, () => Client.closeChannels()));
    jobs.set(exception.date, list);
    return closeDate;
}

async function scheduleAll(Client) {
    const rows = await Client.CloseExceptions.findAll();
    const today = dateKey(new Date());
    for (const row of rows) {
        if (row.date < today) await row.destroy(); // exception périmée
        else schedule(Client, row);
    }
}

async function setException(Client, key, closeTime, userID) {
    const [row] = await Client.CloseExceptions.upsert({ date: key, closeTime, createdBy: userID });
    return schedule(Client, row);
}

async function removeException(Client, key) {
    unschedule(key);
    return Client.CloseExceptions.destroy({ where: { date: key } });
}

module.exports = { parseTime, parseDate, formatTime, getException, setException, removeException, scheduleAll, computeCloseDate };
