const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const getAllUsers = () => prisma.user.findMany();

const getUserById = (id) => prisma.user.findUnique({ where: { id: Number(id) } });

const getUserByEmail = (email) => prisma.user.findUnique({ where: { email } });

const createUser = (data) => prisma.user.create({ data });

const updateUser = (id, data) =>
  prisma.user.update({
    where: { id: Number(id) },
    data,
  });

const deleteUser = (id) =>
  prisma.user.delete({
    where: { id: Number(id) },
  });

module.exports = {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getUserByEmail
};
