const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_TEST);
const bodyParser = require('body-parser');

const prisma = new PrismaClient();
const app = express();



// Middleware
app.use(cors());



app.use('/', require('./src/routes/webhookroute'));

app.use(express.json());

app.use('/', require('./src/routes/userRoutes'));
app.use('/', require('./src/routes/suscriptionRoutes'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
