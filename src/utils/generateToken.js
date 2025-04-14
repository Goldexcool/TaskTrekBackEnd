module.exports = function generateToken(user) {
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = process.env;

    const token = jwt.sign({ id: user._id, username: user.username }, JWT_SECRET, {
        expiresIn: '1h',
    });

    return token;
};