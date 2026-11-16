const { escapeMarkdown } = require('discord.js');

const MAX_CELLS = 4_000_000; // limite de la table LCS (mots de l'ancien × mots du nouveau)

/** Découpe en mots et séparateurs, en gardant les séparateurs (espaces, retours à la ligne). */
const tokenize = (text) => String(text ?? '').split(/(\s+)/).filter(token => token !== '');

/** Opérations [type, token] avec type : '=' conservé, '-' supprimé, '+' ajouté. */
const diffTokens = (a, b) => {
    let start = 0;
    while (start < a.length && start < b.length && a[start] === b[start]) start++;
    let endA = a.length;
    let endB = b.length;
    while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) { endA--; endB--; }

    const ops = a.slice(0, start).map(token => ['=', token]);
    const midA = a.slice(start, endA);
    const midB = b.slice(start, endB);

    if (midA.length * midB.length > MAX_CELLS) {
        // Trop gros pour un diff fin : une seule zone modifiée
        midA.forEach(token => ops.push(['-', token]));
        midB.forEach(token => ops.push(['+', token]));
    } else {
        const n = midA.length;
        const m = midB.length;
        const table = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
        for (let i = n - 1; i >= 0; i--) {
            for (let j = m - 1; j >= 0; j--) {
                table[i][j] = midA[i] === midB[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
            }
        }
        let i = 0;
        let j = 0;
        while (i < n && j < m) {
            if (midA[i] === midB[j]) { ops.push(['=', midA[i]]); i++; j++; }
            else if (table[i + 1][j] >= table[i][j + 1]) ops.push(['-', midA[i++]]);
            else ops.push(['+', midB[j++]]);
        }
        while (i < n) ops.push(['-', midA[i++]]);
        while (j < m) ops.push(['+', midB[j++]]);
    }
    b.slice(endB).forEach(token => ops.push(['=', token]));
    return ops;
};

/** Entoure un passage de `mark` ligne par ligne, sans inclure les espaces de bord. */
const wrap = (text, mark) => text.split('\n').map(line => {
    const core = line.trim();
    if (!core) return line;
    const lead = line.slice(0, line.indexOf(core));
    const trail = line.slice(lead.length + core.length);
    return `${lead}${mark}${escapeMarkdown(core)}${mark}${trail}`;
}).join('\n');

/**
 * Rend un côté du diff. `side` = '-' (ancien texte, passages supprimés barrés) ou '+' (nouveau, passages ajoutés en gras).
 * Les segments sont calculés sur l'ensemble des opérations : la position d'une insertion pure reste donc visible
 * du côté « ancien ». Les longues zones inchangées sont réduites à « … » en gardant `context` mots autour des modifications.
 */
const render = (ops, side, context) => {
    const mark = side === '-' ? '~~' : '**';

    const segments = [];
    for (const [type, token] of ops) {
        const kind = type === '=' ? 'same' : 'diff';
        if (segments.length && segments[segments.length - 1].kind === kind) segments[segments.length - 1].ops.push([type, token]);
        else segments.push({ kind, ops: [[type, token]] });
    }

    const out = segments.map((segment, index) => {
        if (segment.kind === 'diff') {
            const own = segment.ops.filter(([type]) => type === side).map(([, token]) => token).join('');
            return own.trim() ? wrap(own, mark) : '';
        }

        const tokens = segment.ops.map(([, token]) => token);
        const first = index === 0;
        const last = index === segments.length - 1;
        const wordIdx = tokens.map((token, i) => (/^\s+$/.test(token) ? -1 : i)).filter(i => i >= 0);
        const needed = (first ? 0 : context) + (last ? 0 : context);
        if (first && last) return escapeMarkdown(tokens.join(''));
        if (wordIdx.length <= needed + 1) return escapeMarkdown(tokens.join(''));

        const head = first || context === 0 ? '' : tokens.slice(0, wordIdx[context - 1] + 1).join('');
        const tail = last || context === 0 ? '' : tokens.slice(wordIdx[wordIdx.length - context]).join('');
        if (first) return `… ${escapeMarkdown(tail)} `.replace(/^… $/, '… ');
        if (last) return ` ${escapeMarkdown(head)} …`.replace(/^ $/, '');
        return `${escapeMarkdown(head)} … ${escapeMarkdown(tail)}`;
    }).join('');

    return out.trim();
};

/**
 * Compare deux textes et retourne { old, new, changed } prêts à être affichés dans un embed (≤ `limit` caractères) :
 * l'ancien texte avec les passages supprimés ~~barrés~~, le nouveau avec les passages ajoutés en **gras**,
 * chacun dans son contexte.
 */
const inlineDiff = (oldText, newText, { limit = 1000 } = {}) => {
    const ops = diffTokens(tokenize(oldText), tokenize(newText));
    const changed = ops.some(([type]) => type !== '=');
    if (!changed) return { old: '', new: '', changed: false };

    for (const context of [8, 5, 3, 2, 1, 0]) {
        const rendered = { old: render(ops, '-', context), new: render(ops, '+', context) };
        if (rendered.old.length <= limit && rendered.new.length <= limit) return { ...rendered, changed };
    }
    // Dernier recours : coupe brutalement
    return { old: render(ops, '-', 0).slice(0, limit - 1) + '…', new: render(ops, '+', 0).slice(0, limit - 1) + '…', changed };
};

module.exports = { inlineDiff, diffTokens, tokenize };
