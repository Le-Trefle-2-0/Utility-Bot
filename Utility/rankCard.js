const path = require('path');
const axios = require('axios');
const { createCanvas, loadImage, GlobalFonts } = require('@napi-rs/canvas');

// Police de la charte graphique
const FONT = 'Barlow Condensed';
for (const weight of ['Medium', 'SemiBold', 'Bold']) {
    GlobalFonts.registerFromPath(path.join(__dirname, '..', 'assets', 'fonts', `BarlowCondensed-${weight}.ttf`), FONT);
}

// Palette principale
const COLORS = {
    trefle: '#8cc088',
    bleu: '#9bd2d2',
    gris: '#72827e',
    track: 'rgba(114, 130, 126, 0.35)' // gris translucide : visible en thème clair comme sombre
};

const WIDTH = 1000;
const HEIGHT = 300;

/** 5000 -> "5 k", 10555 -> "10,6 k", 420 -> "420" */
function formatXp(n) {
    if (n < 1000) return String(Math.round(n));
    const k = Math.round((n / 1000) * 10) / 10;
    return `${String(k).replace('.', ',')} k`;
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
}

/**
 * Génère l'image de rang.
 * @returns {Promise<Buffer>} PNG
 */
async function renderRankCard({ displayName, avatarURL, level, current, needed, ratio, place }) {
    const canvas = createCanvas(WIDTH, HEIGHT);
    const ctx = canvas.getContext('2d');

    // Pas de fond : l'image est posée dans un embed et doit rester lisible en thème clair comme sombre
    // Avatar rond avec liseré bleu accent
    const cx = 150, cy = 150, r = 100;
    try {
        const { data } = await axios.get(avatarURL, { responseType: 'arraybuffer', timeout: 8000 });
        const avatar = await loadImage(Buffer.from(data));
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(avatar, cx - r, cy - r, r * 2, r * 2);
        ctx.restore();
    } catch {
        ctx.fillStyle = COLORS.gris;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.strokeStyle = COLORS.bleu;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
    ctx.stroke();

    const left = 300;
    const right = WIDTH - 40;
    const barW = right - left;

    // XP à droite du nom
    ctx.textBaseline = 'alphabetic';
    const xpNeeded = `/ ${formatXp(needed)}`;
    const xpCurrent = formatXp(current);
    ctx.font = `600 34px "${FONT}"`;
    const neededW = ctx.measureText(xpNeeded).width;
    const currentW = ctx.measureText(xpCurrent).width;
    ctx.textAlign = 'left';
    ctx.fillStyle = COLORS.gris;
    ctx.fillText(xpNeeded, right - neededW, 130);
    ctx.fillStyle = COLORS.trefle;
    ctx.fillText(xpCurrent, right - neededW - currentW - 8, 130);

    // Nom (réduit si trop long pour ne pas chevaucher l'XP)
    const maxNameW = barW - neededW - currentW - 40;
    let size = 60;
    ctx.font = `700 ${size}px "${FONT}"`;
    while (ctx.measureText(displayName).width > maxNameW && size > 28) {
        size -= 2;
        ctx.font = `700 ${size}px "${FONT}"`;
    }
    ctx.fillStyle = COLORS.gris;
    ctx.fillText(displayName, left, 130);

    // Barre de progression
    const barY = 155, barH = 38;
    ctx.fillStyle = COLORS.track;
    roundRect(ctx, left, barY, barW, barH, barH / 2);
    ctx.fill();
    const fillW = Math.max(barH, barW * Math.min(Math.max(ratio, 0), 1));
    ctx.fillStyle = COLORS.trefle;
    roundRect(ctx, left, barY, fillW, barH, barH / 2);
    ctx.fill();

    // Place et niveau
    ctx.font = `700 46px "${FONT}"`;
    ctx.fillStyle = COLORS.gris;
    ctx.textAlign = 'left';
    ctx.fillText(`Place ${place}`, left, 250);
    ctx.fillStyle = COLORS.trefle;
    ctx.textAlign = 'right';
    ctx.fillText(`Niveau ${level}`, right, 250);

    return canvas.toBuffer('image/png');
}

module.exports = { renderRankCard, formatXp };
