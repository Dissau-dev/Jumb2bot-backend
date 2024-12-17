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
    console.error("Error updating the subscription in succes payment:", error);
  }
};

const handlePaymentFailure = async (invoice) => {
  const subscriptionId = invoice.subscription;
 
  try {
    if (!subscriptionId) {
      console.error('Subscription ID not found in invoice object.');
      return;
    } 
  
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
    console.error('Error handling payment failure in failure:', error);
  }
};

async function handleSubscriptionEnd(subscription) {
  const subscriptionId = subscription.id;

  try {
    // Actualiza la base de datos para reflejar que la suscripción ha terminado
    await prisma.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: {
        status: 'expired', // Estado para suscripciones expiradas
      },
    });

    console.log(`Subscription ${subscriptionId} marked as expired.`);
  } catch (error) {
    console.error('Error updating subscription after it ended:', error);
  }
}

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
      console.log(event.data.object);
      break;
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const attemptCount = invoice.attempt_count;
  
        if (attemptCount >= 3) {
          console.log('Payment has failed after multiple attempts:', invoice);
          await handleFinalPaymentFailure(invoice);
        } else {
          await handlePaymentFailure(invoice);
          console.log(event.data.object);
        }
        break;
      }
      case 'customer.subscription.deleted': {
        console.log('Subscription deleted:', event.data.object);
        const subscriptionDeleted = event.data.object;
        await handleSubscriptionEnd(subscriptionDeleted);
        break;
      }
      case 'customer.subscription.updated':
        console.log('Subscription updated:', event.data.object);
        const subscriptionUpdated = event.data.object;
        await updateSubscriptionInDB(subscriptionUpdated);
        break;
        case 'customer.subscription.deleted':
          await handleSubscriptionDeleted(event.data.object);
          break;
        case 'customer.subscription.created':
          console.log('Subscription created:', event.data.object);
          const subscriptionCreated = event.data.object;
          await updateSubscriptionInDB(subscriptionCreated);
          break;
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.status(200).send();
});

// Función para actualizar la suscripción en Prisma
async function updateSubscriptionInDB(subscription) {
  const prisma = require('@prisma/client');
  const { PrismaClient } = prisma;
  const prismaClient = new PrismaClient();

  try {
      await prismaClient.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
              status: subscription.status, // Ejemplo: active, incomplete, etc.
              startDate: subscription.start_date*1000,
              endDate: (subscription.current_period_end* 1000),
              trialEndsAt: subscription.trial_end *1000,
          },
      });
  
  } catch (error) {
      console.error('Error updating subscription in database en el webhook:', error);
  } finally {
      await prismaClient.$disconnect();
  }
}
// Manejar la eliminación de la suscripción
const handleSubscriptionDeleted = async (subscription) => {
  const stripeSubscriptionId = subscription.id;

  try {
    // Eliminar la suscripción de tu base de datos
    await prisma.subscription.delete({
      where: { stripeSubscriptionId },
    });
    console.log(`Suscripción ${stripeSubscriptionId} eliminada de la base de datos.`);
  } catch (error) {
    console.error('Error eliminando la suscripción de la base de datos:', error);
  }
};

  module.exports = router;
