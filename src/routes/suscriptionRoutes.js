const express = require('express');

const { createSubscription, getAllSubscriptions, UpdatedSubscription, getAllPlans } = require('../controllers/suscriptionController');

const router = express.Router();


router.get('/subscription/all', getAllSubscriptions); // Obtener todos los usuarios

router.get('/plans/all', getAllPlans); // Obtener todos los planes

// create subs
router.post('/subscription/create',[

],createSubscription);

// create subs
router.put('/subscription/update',[

],UpdatedSubscription);

module.exports = router;
