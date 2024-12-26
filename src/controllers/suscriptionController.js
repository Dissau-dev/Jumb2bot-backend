const stripe = require('stripe')(process.env.STRIPE_SECRET_TEST);
const { PrismaClient } = require('@prisma/client');
const PRICES = require('../helper/prices');
const prisma = new PrismaClient();

const createSubscription = async (req, res) => {
  const { userId, priceId } = req.body;

  // Validaciones iniciales
  if (!userId || !priceId) {
    return res.status(400).json({ error: 'userId y priceId son requeridos.' });
  }

  try {
    // Verificar si el usuario existe
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    // Verificar si ya existe una suscripción asociada al usuario
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        OR: [
          { status: 'active' }, // Activa
          { status: 'trialing' }, // En periodo de prueba
          { status: 'incomplete' }, // Incompleta
          {status: 'cancel_at_period_end'}
        ],
      },
    });

    if (existingSubscription) {
      if (existingSubscription.status === 'active' || existingSubscription.status === 'trialing') {
        return res.status(400).json({
          error: 'Ya tienes una suscripción activa.',
        });
      }
      if (existingSubscription.status === 'cancel_at_period_end') {
        return res.status(400).json({
          error: `Ya tienes una suscripción activa que se cancelará ${existingSubscription.endDate}`,
        });
      }
      if (existingSubscription.status === 'incomplete') {
        const stripeCustomerId =
      user.stripeCustomerId || (await createStripeCustomer(user));

        const subscription = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: priceId }],
    
          payment_behavior: 'default_incomplete',
          expand: ['latest_invoice.payment_intent'],
          payment_settings: {
            payment_method_types: ['card'], // Solo tarjetas
          },
          metadata: { userId },
        });
        const paymentIntent = subscription.latest_invoice.payment_intent;
        return res.status(200).json({
          message: 'Tu suscripción está incompleta. Intenta completar el pago.',
          clientSecret: paymentIntent.client_secret,
          createdSub: existingSubscription
        });
      }
    }

    // Si no hay suscripciones activas, crear una nueva en Stripe
    const stripeCustomerId =
      user.stripeCustomerId || (await createStripeCustomer(user));

    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],

      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      payment_settings: {
        payment_method_types: ['card'], // Solo tarjetas
      },
      metadata: { userId },
    });

     
    
    // Guardar la suscripción en la base de datos
    
    const trialEndsAt = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : new Date(); // Usar fecha actual como predeterminado


  const plan = PRICES.find((p) => p.price_id === priceId);
  if (!plan) {
    return res.status(400).json({

      error: `Plan no encontrado. Contacta con soporte.${priceId}`,
    });
  }
  console.log("este es el price " + plan.price + "este es el priceid" + plan.price_id +
     "este es el priceId que recibo en el req.body" +priceId );
  const createdSub = await prisma.subscription.create({
      data: {
        plan: plan.product_name, // Cambiar según tu lógica
        startDate: new Date(subscription.start_date * 1000), // Convertir a Date
        endDate: new Date(subscription.current_period_end * 1000),
        stripeSubscriptionId: subscription.id,
        status: subscription.status,
        trialEndsAt,
        user: {
          connect: { id: userId },
        },
      },
    });

    // Responder con el cliente secreto del payment intent
    const paymentIntent = subscription.latest_invoice.payment_intent;

    res.status(200).json({
      message: 'Suscripción creada exitosamente. Confirme el pago',
      clientSecret: paymentIntent.client_secret,
      createdSub: createdSub
    });
  } catch (error) {
    console.error('Error creando la suscripción:', error);
    res.status(500).json({ error: 'Error creando la suscripción.' });
  }
};

// Función auxiliar para crear un cliente en Stripe
const createStripeCustomer = async (user) => {
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId: user.id },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { stripeCustomerId: customer.id },
  });

  return customer.id;
};
  
  // Endpoint para actualizar una suscripción
const UpdatedSubscription = async (req, res) => {
  const { stripeSubscriptionId} = req.body;

  if (!stripeSubscriptionId ) {
    return res.status(400).json({ error: "stripeSubscriptionId y newStatus son requeridos." });
  }

  try {
    // Buscar la suscripción en tu base de datos usando Prisma
    const subscription = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId },
    });

    if (!subscription) {
      return res.status(404).json({ error: "Suscripción no encontrada." });
    }
  
    // Actualizar el estado en tu base de datos
    const updatedSubscription = await prisma.subscription.update({
      where: { stripeSubscriptionId },
      data: { status: "active" },
    });

    res.status(200).json({
      message: "Suscripción actualizada con éxito.",
      subscription: updatedSubscription,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error actualizando la suscripción." });
  }
};

 const cancelSubscription = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({ error: 'user ID is required.' });
  }

  // Buscar la suscripción en tu base de datos usando Prisma
  const {stripeSubscriptionId} = await prisma.subscription.findUnique({
    where: { userId },
  });
  if (!stripeSubscriptionId) {
    return res.status(400).json({ error: 'No se encontró la subscripción' });
  }
  try {
    // Cancela la suscripción en Stripe al final del período
    const canceledSubscription = await stripe.subscriptions.update(stripeSubscriptionId, {
      cancel_at_period_end: true,
    });

    // Actualiza la base de datos para reflejar la cancelación
   const createdSub = await prisma.subscription.update({
      where: { userId },
      data: {
        status: 'cancel_at_period_end', // Puedes definir este estado como desees
        endDate: new Date(canceledSubscription.current_period_end * 1000), // Actualizar la fecha de fin
      },
    });
  console.log(createdSub)
    res.status(200).json({
      message: 'Subscription successfully canceled at period end.',
      subscription: createdSub,
    });
  } catch (error) {
    console.error('Error canceling subscription:', error);
    res.status(500).json({ error: 'Failed to cancel subscription. Please try again later.' });
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
  const getSubscriptionsByUserId = async (req, res) => {
    try {
      const { userId } = req.params;
   const id = parseInt(userId);
      if (!userId) {
        return res.status(400).json({ error: 'El userId es obligatorio' });
      }
  
      const stripeSubscription = await prisma.subscription.findUnique({
        where: {  userId:id },
      });
  
      if (!stripeSubscription) {
        return res.status(404).json({ error: 'No se encontró la subscripción' });
      }
  
      return res.status(200).json({ subscription: stripeSubscription });
    } catch (error) {
      console.error('Error en getSubscriptionsByUserId:', error.message);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  };

  const verifySubscription = async (req, res) => {
    try {
      const { userId, deviceId } = req.body;
  
      if (!userId || !deviceId) {
        return res.status(400).json({ error: 'El userId y deviceId son obligatorios' });
      }

   
      const id = parseInt(userId);

      const user = await prisma.user.findUnique({ where: { id } });
  
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      
    const deviceMatch =  user.deviceId === deviceId; 

     if(!deviceMatch){
      return res.status(401).json({ error: 'Este dispositivo no coincide con el registró su cuenta, contacte con soporte para cambiarlo' });
     }
   
      // Buscar la suscripción del usuario
      const subscription = await prisma.subscription.findUnique({
        where: { userId: id },
      });
  
      if (!subscription) {
        // Si no hay suscripción, verificar el tiempo de prueba
       
  
        const userCreatedAt = new Date(user.createdAt);
        const diferenciaDias = Math.floor((new Date() - userCreatedAt) / (1000 * 60 * 60 * 24)); // Días desde que se creó el usuario
  
        if (diferenciaDias >= 3) {
          return res.status(403).json({ error: 'El tiempo de prueba ha culminado. Por favor, adquiera un plan.' });
        }
  
        return res.status(200).json({
          status: 'trial',
          message: 'Conectado con el tiempo de prueba',
        });
      }
  
      // Verificar el estado y la fecha de la suscripción
      const { status, endDate } = subscription;
      const now = new Date();
  
      if ( status === 'cancel_at_period_end') {
        if (new Date(endDate) < now) {
          return res.status(403).json({
            error: 'La suscripción ha vencido. Por favor, adquiera una nueva.',
          });
        }
  
        return res.status(200).json({
          status: 'active',
          message: 'Suscripción válida',
          subscription: subscription
        });
      } else {
        return res.status(403).json({
          error: 'Por favor, verifique que su plan esté completo.',
        });
      }
    } catch (error) {
      console.error('Error en verifySubscription:', error.message);
      return res.status(500).json({ error: 'Error interno del servidor' });
    }
  };
  
  const getAllPlans = async (req, res) => {
    try {
      const plans = PRICES
      res.status(200).json(plans);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  };

module.exports = {createSubscription,getAllSubscriptions,UpdatedSubscription,cancelSubscription,verifySubscription, getAllPlans , getSubscriptionsByUserId};