const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_TEST);
const bodyParser = require('body-parser');

const prisma = new PrismaClient();
const app = express();

// Middleware global (excluyendo el webhook)
app.use(cors());

// Ruta del webhook (debe ir antes de `express.json`)
app.use(
  '/webhook',
  bodyParser.raw({ type: 'application/json' }),
  require('./src/routes/webhookroute')
);

// Middleware para las demás rutas
app.use(express.json());

// Otras rutas
app.use('/', require('./src/routes/userRoutes'));
app.use('/', require('./src/routes/suscriptionRoutes'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
