const express = require('express');
require('dotenv').config();
const fileUpload = require('express-fileupload');
const path = require('path');
const webhookRouter = require('./routes/webhook');
const mechanicRouter = require('./routes/mechanic');
const imageDetectionRouter = require('./routes/imageDetection');

const app = express();
const port = 3000;

app.use(express.json());
app.use(fileUpload({
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    useTempFiles: false,
    debug: false
}));

// Serve static files from public directory
app.use('/public', express.static(path.join(__dirname, 'public')));

app.use(webhookRouter);
app.use(mechanicRouter);
app.use(imageDetectionRouter);

app.listen(port, () => {
    console.log(`Mechanic Bot Server is running on port ${port}`);
    console.log(`Main menu: Send any message to start`);
});