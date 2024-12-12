const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_TEST);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const router = express.Router();
const bodyParser = require('body-parser');



const handlePaymentSuccess = async (invoice) => {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) {
    console.error('Subscription ID not found in invoice object.');
    
    return;
  }

  try {
    const subscriptionPrisma = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscriptionPrisma) {
      console.log("Error: Subscription not found.");
      return; // Salir si no se encuentra la suscripción
    }

    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: "active" },
    });
    console.log('Updated subscription status to active in DB.');
  } catch (error) {
    console.error("Error updating the subscription:", error);
  }
};

const handlePaymentFailure = async (invoice) => {
  const subscriptionId = invoice.subscription;
  if (!subscriptionId) {
    console.error('Subscription ID not found in invoice object.');
    return;
  }

  try {
    const subscriptionPrisma = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!subscriptionPrisma) {
      console.log("Error: Subscription not found.");
      return; // Salir si no se encuentra la suscripción
    }

    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: 'payment_failed' },
    });
    console.log('Updated subscription status to payment_failed in DB.');
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
};
// Webhook
router.post('/', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, "whsec_4rvxFFKq5KmdsxxowoGmvv5boSJ5rQPo");
  } catch (err) { console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send('Webhook Error');
  }

  console.log('Webhook received event type:', event.type);

  switch (event.type) {
    case 'invoice.payment_succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
    case 'invoice.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).send();
});

  module.exports = router;

  /*
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
  });*/