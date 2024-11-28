const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();



const isUserById = async(id) => {
    //Verificar si el usuario existe 
    const existingUser = await (id);
   
    if ( !existingUser){
    throw new Error (`el id no existe :${id}`);
    }
   }

   module.exports ={
    isUserById,
   }