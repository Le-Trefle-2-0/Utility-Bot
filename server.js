const express = require('express');
const path = require('path');

const app = express();

app.listen(80, () => {
    console.log(`Listening on 80`);
});

app.get('/transcript/:id', async (req, res) => {
    res.sendFile(path.join(__dirname, `/Transcripts/${req.params.id}.html`));
})