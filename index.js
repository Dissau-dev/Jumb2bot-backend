const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(express.json());

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

app.post('/webhook', async (req, res) => {
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

const PORT =  3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
