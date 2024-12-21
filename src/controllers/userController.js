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

// Crear usuario
const createUser = async (req, res) => {
  console.log('Body recibido:', req.body);

    const { email, password, referredBy,role,name } = req.body;

    const referralCode = generateReferralCode(); 

    const areEmail = await prisma.user.findUnique({
        where: {email}
    })
  
    if (areEmail){
        return res.status(400).json({
         msg: 'This email is alredy register'
        })
       }
       let customer
       try {
         customer = await stripe.customers.create({
            email: email,
            name: name,
        });
    } catch (error) {
        console.error('Error creando cliente en Stripe:', error);
        return res.status(500).json({ error: 'Error creating Stripe customer' });
    }
       //Encriptar la contraseña
       const hashedPassword = await bcryptjs.hash(password, 6)

       try {  const newUser = await prisma.user.create({
      data: {
        name,
        role,
        email,
        password:hashedPassword,
        referredBy,
        stripeCustomerId: customer.id,
        referralCode
      },     
    });
    const token = await generateJWT(newUser);

    res.status(201).json({ user: newUser, token });
   
  } catch (err) {
    console.error('Error creando usuario en la base de datos:', err);
    return res.status(500).json({ error: 'Database error' });
  
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
    const { userId } = req.params;
    const { password } = req.body;
  
    const hashedPassword = await bcryptjs.hash(password, 6);

    if (!password) {
      return res.status(400).json({ message: "La nueva contraseña es requerida." });
    }
    try {

      const user = await prisma.user.findUnique({ where: { id: userId } });

      if (!user) return res.status(404).json({ message: 'User not found' });
      
       await prisma.user.update(user.id,{
        password: hashedPassword
      })
      res.json({ message: 'Password change' });
    } catch (error) {
      console.log(error);
      res.status(500).json({message: "Error server"})
    }
  }
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
        where: {id:userId}
    })
  
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
