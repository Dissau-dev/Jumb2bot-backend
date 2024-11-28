const jwt = require('jsonwebtoken');

const generateJWT = (user) => {
    return new Promise((resolve, reject) => {
        const payload = { 
            id: user.id,
            email: user.email,
            role: user.role // Incluye más campos si es necesario
        };

        jwt.sign(
            payload,
            process.env.PUBLICKEY, // Asegúrate de que esta clave esté configurada correctamente
            { expiresIn: '4h' },
            (err, token) => {
                if (err) {
                    console.log(err);
                    reject('Failed to generate token');
                } else {
                    resolve(token);
                }
            }
        );
    });
};

module.exports = { generateJWT }; // Exportación nombrada
