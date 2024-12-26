const { PrismaClient } = require('@prisma/client');
const userService = require('../services/userService');
const bcryptjs = require('bcryptjs');
const stripe = require('stripe')(process.env.STRIPE_SECRET_TEST);
const short = require('short-uuid');
const {generateJWT} = require('../middleware/generateJWT')
const prisma = new PrismaClient();


// Genera un código de referencia de longitud personalizada
function generateReferralCode() {

    let result = `REF:${short.generate()}`;
    
    return result;
  }

  const createUser = async (req, res) => {
    const { email, password, referredBy, role, name, devices } = req.body;
  
    // Verifica que los dispositivos sean un JSON válido
    let parsedDevices;
    try {
      parsedDevices = typeof devices === 'string' ? JSON.parse(devices) : devices;
    } catch (error) {
      return res.status(400).json({
        msg: 'Invalid JSON format for devices.',
      });
    }
  
    // Validación de la estructura de los dispositivos
    if (
      !Array.isArray(parsedDevices) ||
      parsedDevices.some(
        (d) => typeof d.deviceId !== 'string' || !d.deviceId.trim() || 
               typeof d.model !== 'string' || !d.model.trim()
      )
    ) {
      return res.status(400).json({
        msg: 'Invalid devices format. Each device must have a non-empty deviceId and model.',
      });
    }
  
    const devicesAsJson = JSON.stringify(parsedDevices);
  
    // Verifica si el email ya está registrado
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ msg: 'This email is already registered.' });
    }
  
    // Genera el código de referido
    const referralCode = generateReferralCode();
  
    // Crea el cliente en Stripe
    let customer;
 /*   try {
      customer = await stripe.customers.create({
        email,
        name,
      });
    } catch (error) {
      console.error('Error creating Stripe customer:', error);
      return res.status(500).json({ error: 'Error creating Stripe customer.' });
    }*/
  
    // Encripta la contraseña
    const hashedPassword = await bcryptjs.hash(password, 6);
  
    // Crea el usuario en la base de datos
    try {
      const newUser = await prisma.user.create({
        data: {
          name,
          role,
          email,
          password: hashedPassword,
          referredBy,
          stripeCustomerId: "mx121",
          referralCode,
          devices: devicesAsJson,
        },
      });
  
      const token = await generateJWT({ id: newUser.id, email: newUser.email, role: newUser.role });
  
      return res.status(201).json({ user: newUser, token });
    } catch (err) {
      console.error('Error creating user in the database:', err);
      return res.status(500).json({ error: 'Error saving user in the database.' });
    }
  };

const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    next(error);
  }
};


// Obtener todos los usuarios
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

const updateUser = async (req, res, next) => {
    try {
      const user = await userService.updateUser(req.params.id, req.body);
      if (!user) return res.status(404).json({ message: 'User not found' });
      res.json(user);
    } catch (error) {
      next(error);
    }
  };
  
  const updatePassword = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;
  
    // Validar entrada
    if (!password) {
      return res.status(400).json({ message: "La nueva contraseña es requerida." });
    }
  
    try {
      // Asegúrate de que el ID sea un número
      const userId = parseInt(id);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "ID inválido." });
      }
  
      // Verificar si el usuario existe
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
  
      if (!user) {
        return res.status(404).json({ message: "Usuario no encontrado." });
      }
  
      // Hashear la contraseña
      const hashedPassword = await bcryptjs.hash(password, 6);
  
      // Actualizar la contraseña
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });
  
      res.status(200).json({ message: "Contraseña actualizada exitosamente." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Error del servidor." });
    }
  };
//--  
  const deleteUser = async (req, res, next) => {
    try {
      // Convertir el ID a un número entero
      const userId = parseInt(req.params.id, 10);
  
      // Verificar si la conversión fue exitosa
      if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID format' });
      }
  
      // Buscar el usuario por su ID
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
  
      // Si el usuario no existe, retorna un 404
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      const userSubscription = await prisma.subscription.findUnique({
        where: { userId: userId },
      });
      if (userSubscription) {
        return res.status(404).json({ message: 'Is not posible delete an usr with active subscription' });
      }
      // Si el usuario existe, procede a eliminarlo
      await userService.deleteUser(userId);
      
      // Retorna una respuesta de éxito
      res.json({ message: 'User deleted' });
    } catch (error) {
      // Manejo de errores
      next(error);
    }
  };
  const login = async(req ,res = response)=>{
    const { email, password } = req.body;
  
    try {
      const user = await userService.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Verificar contraseña
      const isPasswordValid = await bcryptjs.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }
  
      const token = await generateJWT(user);
  
      // Excluir la contraseña del objeto user
      const { password: _, ...userWithoutPassword } = user;
  
      res.status(201).json({
        user: userWithoutPassword,
        token: token
      });
  
    } catch (error) {
      console.log(error);
      res.status(500).json({
        ok: false,
        message: 'Consulta al administrador'
      });
    }

   }

module.exports = { createUser, getAllUsers,updateUser,deleteUser,  getUserById,login , updatePassword};
