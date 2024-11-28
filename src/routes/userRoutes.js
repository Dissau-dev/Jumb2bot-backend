const express = require('express');
const { createUser, getAllUsers, updateUser, deleteUser, getUserById, login } = require('../controllers/userController');
const { validateField } = require('../middleware/validateFields');
const { check } = require('express-validator');

const router = express.Router();


router.get('/user/all', getAllUsers); // Obtener todos los usuarios
router.get('/user/:id',getUserById);


// register user
router.post('/user/register',[
    check('email','Invalid Email').isEmail(),
    check('name', 'Name is required').not().isEmpty(),
    check('password', 'password is required (Min 6 characters)').isLength({min:6}),
    check('role','invalid role').isIn(['ADMIN_ROLE','USER_ROLE']),
    validateField
],createUser);

// update user
router.put('/user/:id',[
   // check('id','is not a valid id in MongoDB').isMongoId(),
   // check('id').custom(isUserById),
    validateField
],updateUser,);

// delete user
router.delete('/user/:id',[
  //  validateJWT,
   // isAdminRole,
  // check('id').custom(isUserById),
    validateField
],deleteUser)

//login 
router.post('/user/login',[
   // check('email','Invalid Email').isEmail(),
    //check('password', 'password is required (Min 6 characters)').not().isEmpty(),
    validateField
],login);

module.exports = router;
