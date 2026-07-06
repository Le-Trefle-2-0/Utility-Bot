/**
 * Escapes markdown characters in a string to prevent it from being rendered differently.
 * @param {string} text 
 * @returns {string}
 */
function escapeMarkdown(text) {
    if (!text) return "";
    // Basic escape for common markdown characters
    return text.replace(/([*_`~|\\<>:!])/g, '\\$1');
}

/**
 * Truncates a message to a maximum length, ensuring it doesn't cut in the middle of a word if possible.
 * @param {string} text 
 * @param {number} maxLength 
 * @returns {string}
 */
function truncateMessage(text, maxLength = 1000) {
    if (!text) return "";
    if (text.length <= maxLength) return text;

    const truncated = text.substring(0, maxLength - 3);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
        return truncated.substring(0, lastSpace) + "...";
    }
    return truncated + "...";
}

/**
 * Gets a window around the changed part of a message for long messages.
 * @param {string} oldText 
 * @param {string} newText 
 * @param {number} windowSize 
 * @returns {{oldWindow: string, newWindow: string}}
 */
function getDiffWindow(oldText, newText, windowSize = 400) {
    if (!oldText || !newText) return { oldWindow: oldText, newWindow: newText };
    
    // Find the first and last difference
    let firstDiff = 0;
    while (firstDiff < oldText.length && firstDiff < newText.length && oldText[firstDiff] === newText[firstDiff]) {
        firstDiff++;
    }

    let lastDiffOld = oldText.length - 1;
    let lastDiffNew = newText.length - 1;
    while (lastDiffOld >= firstDiff && lastDiffNew >= firstDiff && oldText[lastDiffOld] === newText[lastDiffNew]) {
        lastDiffOld--;
        lastDiffNew--;
    }

    // Determine the window range
    const start = Math.max(0, firstDiff - windowSize / 2);
    const endOld = Math.min(oldText.length, lastDiffOld + windowSize / 2);
    const endNew = Math.min(newText.length, lastDiffNew + windowSize / 2);

    let oldWindow = oldText.substring(start, endOld);
    let newWindow = newText.substring(start, endNew);

    if (start > 0) {
        oldWindow = "..." + oldWindow;
        newWindow = "..." + newWindow;
    }
    if (endOld < oldText.length) {
        oldWindow = oldWindow + "...";
    }
    if (endNew < newText.length) {
        newWindow = newWindow + "...";
    }

    return { oldWindow, newWindow };
}

module.exports = {
    escapeMarkdown,
    truncateMessage,
    getDiffWindow
};
