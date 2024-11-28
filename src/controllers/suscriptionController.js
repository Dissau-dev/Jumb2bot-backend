const stripe = require('stripe')(process.env.STRIPE_SECRET_TEST);
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createSubscription = async (req, res) => {
    const { userId, priceId } = req.body;
  
    if (!userId || !priceId) {
      return res.status(400).json({ error: 'userId y priceId son requeridos.' });
    }
  
    try {
      // Verificar si el usuario existe
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
      }
  
      // Obtener o crear Stripe Customer
      let stripeCustomerId = user.stripeCustomerId;
     /* if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email,
          name: user.name,
        });
  
        // Actualizar el usuario con el stripeCustomerId
        stripeCustomerId = customer.id;
        await prisma.user.update({
          where: { id: userId },
          data: { stripeCustomerId },
        });
      }*/
  
      // Crear la suscripción en Stripe
      const subscription = await stripe.subscriptions.create({
        customer: stripeCustomerId,
        items: [{ price: priceId }],
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
        metadata: { userId },
      });
  
      // Guardar la suscripción en la base de datos
      const startDate = new Date();
      const trialEndsAt = subscription.trial_end
  ? new Date(subscription.trial_end * 1000)
  : new Date(); // Fecha actual como predeterminado, puedes ajustarla según tu lógica
  
      const endDate = new Date(
        startDate.setMonth(startDate.getMonth() + 1) // Ajusta según el plan
      );
  
      await prisma.subscription.create({
        data: {
          plan: 'monthly', // Cambiar según tu lógica de planes
          startDate: new Date(),
          endDate,
          stripeSubscriptionId: subscription.id,
          status: subscription.status,
          trialEndsAt,
          user: {
            connect: { id: userId }, // Relaciona la suscripción con el usuario existente
          },
        },
      });
  
      // Responder con el cliente secreto del payment intent
      const paymentIntent = subscription.latest_invoice.payment_intent;
  
      res.status(200).json({
        message: 'Suscripción creada exitosamente.',
        clientSecret: paymentIntent.client_secret,
      });
    } catch (error) {
      console.error('Error creando la suscripción:', error);
      res.status(500).json({ error: 'Error creando la suscripción.' });
    }
  };
  

// Obtener todos los usuarios
const getAllSubscriptions = async (req, res) => {
    try {
      const subs = await prisma.subscription.findMany();
      res.status(200).json(subs);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

module.exports = {createSubscription,getAllSubscriptions };