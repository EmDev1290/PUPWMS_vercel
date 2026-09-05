const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const verifyToken = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/change-credentials', verifyToken, authController.changeCredentials);

module.exports = router;
