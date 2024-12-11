const {validationResult} = require('express-validator')

const validateField = (req, res, next ) =>{
const errors = validationResult(req);
console.log('Errores de validación:', errors.array());
 if( !errors.isEmpty() ){
    return res.status(400).json(errors)
 }

 next();
}

module.exports = {
    validateField
}