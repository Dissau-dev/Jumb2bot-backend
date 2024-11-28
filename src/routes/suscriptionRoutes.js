const express = require('express');

const { createSubscription, getAllSubscriptions } = require('../controllers/suscriptionController');

const router = express.Router();


router.get('/subscription/all', getAllSubscriptions); // Obtener todos los usuarios

// create subs
router.post('/subscription/create',[

],createSubscription);

/*
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
],login);*/

module.exports = router;
