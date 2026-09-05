const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

const verifyToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
        return res.status(403).json({ error: 'A token is required for authentication' });
    }
    
    // Expecting 'Bearer <token>'
    const token = authHeader.split(' ')[1];
    if (!token) {
        return res.status(403).json({ error: 'Token format is invalid' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
    } catch (err) {
        return res.status(401).json({ error: 'Invalid Token' });
    }
    return next();
};

module.exports = verifyToken;
