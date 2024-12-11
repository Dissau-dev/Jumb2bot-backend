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

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  console.log('Payment succeeded for subscription:', subscription);

  try {
    await prisma.subscription.update({
      where: {
        stripeSubscriptionId: "sub_1QUaWuDrtegwEnl30ZSxuAdC",
      },
      data: {
        status: "active",
      },
    });
  } catch (error) {
    console.error("Error actualizando la suscripción:", error);
    // Opcionalmente, puedes agregar lógica para manejar el error
  }
  
};

const handlePaymentFailure = async (invoice) => {
  try {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) {
      console.error('Subscription ID not found in invoice object.');
      return;
    }

    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    console.log('Payment failed for subscription:', subscription);

    const updatedSubscription = await prisma.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: 'payment_failed' },
    });
    console.log('Updated subscription status to payment_failed in DB:', updatedSubscription);
  } catch (error) {
    console.error('Error handling payment failure:', error);
  }
};
// Webhook
router.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  console.log('Headers:', req.headers);
  console.log('Raw Body:', req.body.toString());
  console.log('Raw Body as buffer:', Buffer.isBuffer(req.body));
  try {
    event = stripe.webhooks.constructEvent(req.body, sig,"whsec_4rvxFFKq5KmdsxxowoGmvv5boSJ5rQPo");
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message, req.body);
    return res.status(400).send('Webhook Error');
  }

  console.log('Webhook received event type:', event.type);

  switch (event.type) {
    case 'invoice.payment_succeeded':
      try {
        await handlePaymentSuccess(event.data.object);
      } catch (error) {
        console.error('Error handling payment success:', error);
      }
      break;
    case 'invoice.payment_failed':
      try {
        await handlePaymentFailure(event.data.object);
      } catch (error) {
        console.error('Error handling payment failure:', error);
      }
      break;
  }

  res.status(200).send();
});
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
  module.exports = router;