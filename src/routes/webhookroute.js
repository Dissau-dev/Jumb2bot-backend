const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_TEST);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();


router.post('/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
  
    let event;
  
    try {
      event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  
    switch (event.type) {
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
  
        // Actualizar la suscripción en tu base de datos
        await prisma.subscription.update({
          where: { stripeSubscriptionId: invoice.subscription },
          data: { status: 'active' },
        });
        console.log(`Pago exitoso para suscripción ${invoice.subscription}`);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
  
        // Actualizar la suscripción como fallida
        await prisma.subscription.update({
          where: { stripeSubscriptionId: invoice.subscription },
          data: { status: 'past_due' },
        });
        console.log(`Pago fallido para suscripción ${invoice.subscription}`);
        break;
      }
      default:
        console.log(`Evento no manejado: ${event.type}`);
    }
  
    res.status(200).send('Evento recibido');
  });