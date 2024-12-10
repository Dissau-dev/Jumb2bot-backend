const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const stripe = require('stripe')(process.env.STRIPE_SECRET_TEST);
const bodyParser = require('body-parser');

const prisma = new PrismaClient();
const app = express();



const handlePaymentSuccess = async (invoice) => {
    const subscriptionId = invoice.subscription;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  
    console.log('Payment succeeded for subscription:', subscription);


  const prismasub =  await prisma.subscription.update({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: 'active' },
    });
    console.log('Updated subscription status to active in DB for user:', prismasub.userId);
    console.log('Updated subscription ', prismasub);
  };

  const handlePaymentFailure = async (invoice) => {
    try {
      const subscriptionId = invoice.subscription;
      const customerId = invoice.customer;
      const paymentIntent = invoice.payment_intent;
  
      console.log('Payment failed for subscription:', subscriptionId);
      console.log('Customer ID:', customerId);
      console.log('Payment Intent ID:', paymentIntent);
  
      // Obtener más detalles sobre la suscripción fallida
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      console.log('Retrieved subscription details:', subscription);
  
      // Obtener más detalles sobre el cliente
      const customer = await stripe.customers.retrieve(customerId);
      console.log('Customer details:', customer);
  
      // Actualizar el estado de la suscripción en la base de datos
      const updatedSubscription = await prisma.subscription.update({
        where: { stripeSubscriptionId: subscriptionId },
        data: { status: 'payment_failed' },
      });
      console.log('Updated subscription status to payment_failed in DB:', updatedSubscription);
  
      // Enviar una notificación al usuario (si es parte del flujo)
      console.log(`Notifying user ${updatedSubscription.userId} about payment failure.`);
    } catch (error) {
      console.error('Error handling payment failure:', error);
    }
  };

app.post('/webhook',bodyParser.raw({ type: 'application/json' }), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;
  // git add
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send('Webhook Error');
    }
  
    // Maneja los eventos relevantes
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await handlePaymentSuccess(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailure(event.data.object);
        break;
    }
  
    res.status(200).send();
  });

// Rutas
const userRoutes = require('./src/routes/userRoutes');
const subscriptionRoutes = require('./src/routes/suscriptionRoutes');

app.use('/', userRoutes);
app.use('/', subscriptionRoutes);
app.use(cors());
app.use(express.json());

const PORT =  3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
