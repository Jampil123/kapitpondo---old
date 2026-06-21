const express = require('express');
const cors = require('cors');
const healthRoute = require('./routes/health');
const errorHandler = require('./middleware/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('KapitPondo API is running'));
app.use('/health', healthRoute);

// Error handler stays last.
app.use(errorHandler);

module.exports = app;