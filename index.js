const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_TEST);
const bodyParser = require('body-parser');

const prisma = new PrismaClient();
const app = express();

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

// Middleware
app.use(cors());


// Webhook
app.post('/webhook', bodyParser.raw({ type: 'application/json' }), async (req, res) => {
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

app.use(express.json());
app.use('/', require('./src/routes/userRoutes'));
app.use('/', require('./src/routes/suscriptionRoutes'));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
