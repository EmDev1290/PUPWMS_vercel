const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const knex = require('../config/database');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

exports.login = async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        
        const user = await knex('users').where({ username }).first();
        if (!user) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }
        const passwordMatch = bcrypt.compareSync(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }
        
        const token = jwt.sign(
            { username: user.username, role: user.role, displayName: user.display_name },
            JWT_SECRET,
            { expiresIn: '8h' }
        );
        
        res.json({
            success: true,
            username: user.username,
            displayName: user.display_name,
            role: user.role,
            token
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { username, idNumber, fullName, newPassword } = req.body;
        
        if (!username || !idNumber || !fullName || !newPassword) {
            return res.status(400).json({ error: 'Username, ID Number, Full Name, and new password are required' });
        }

        // Updated password policy: at least 8 characters
        if (typeof newPassword !== 'string' || newPassword.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
        }

        const user = await knex('users').where({ username }).first();
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Verify ID Number and Full Name (display_name)
        if (user.id_number !== idNumber) {
            return res.status(400).json({ error: 'The provided ID Number does not match our records.' });
        }
        if (user.display_name.toLowerCase() !== fullName.toLowerCase()) {
            return res.status(400).json({ error: 'The provided Full Name does not match our records.' });
        }

        await knex('users').where({ username }).update({ password_hash: bcrypt.hashSync(newPassword, 10) });
        res.json({ success: true, message: 'Password has been reset successfully.' });
    } catch (err) {
        console.error('Forgot password error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

exports.changeCredentials = async (req, res) => {
    try {
        const { currentUsername, newUsername, currentPassword, newPassword } = req.body;
        if (!currentUsername || !currentPassword || !newUsername) {
            return res.status(400).json({ error: 'Missing required parameters' });
        }
        const user = await knex('users').where({ username: currentUsername }).first();
        if (!user) {
            return res.status(400).json({ error: 'User not found' });
        }
        const passwordMatch = bcrypt.compareSync(currentPassword, user.password_hash);
        if (!passwordMatch) {
            return res.status(400).json({ error: 'Incorrect current password' });
        }
        
        const updateData = {
            username: newUsername,
            display_name: newUsername
        };
        
        if (newPassword && newPassword.trim() !== '') {
            if (typeof newPassword !== 'string' || newPassword.length < 8) {
                return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
            }
            updateData.password_hash = bcrypt.hashSync(newPassword, 10);
        }
        
        await knex('users').where({ username: currentUsername }).update(updateData);
        res.json({
            success: true,
            username: newUsername,
            displayName: updateData.display_name
        });
    } catch (err) {
        console.error('Change credentials error:', err);
        res.status(500).json({ error: err.message || 'Internal server error' });
    }
};
