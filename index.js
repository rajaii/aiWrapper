require('dotenv').config();
const express = require('express');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

app.use('/ai', require('./api/aiRoutes'));

app.listen(port, () => {
  console.log(`Server is running on port: ${port}`);
});
