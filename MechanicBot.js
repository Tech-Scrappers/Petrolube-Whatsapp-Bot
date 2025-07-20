const express = require('express');
require('dotenv').config();
const webhookRouter = require('./routes/webhook');
const mechanicRouter = require('./routes/mechanic');

const app = express();
const port = 3000;

app.use(express.json());
app.use(webhookRouter);
app.use(mechanicRouter);

app.listen(port, () => {
    console.log(`Mechanic Bot Server is running on port ${port}`);
    console.log(`Main menu: Send any message to start`);
});