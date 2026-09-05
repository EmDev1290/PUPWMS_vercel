const express = require('express');
const router = express.Router();
const apiController = require('../controllers/api.controller');
const verifyToken = require('../middleware/auth');

// Note: getInitialState might need to be accessible before full login in some apps, 
// but since this is an admin dashboard it should probably be protected.
router.get('/initial-state', apiController.getInitialState);

router.post('/rooms', verifyToken, apiController.createRoom);
router.delete('/rooms', verifyToken, apiController.deleteRoom);

router.post('/faculty', verifyToken, apiController.createFaculty);
router.delete('/faculty/:id', verifyToken, apiController.deleteFaculty);

router.post('/loads', verifyToken, apiController.createLoad);
router.delete('/loads/:id', verifyToken, apiController.deleteLoad);

router.post('/programs', verifyToken, apiController.createProgram);
router.post('/sections', verifyToken, apiController.createSection);
router.post('/subjects', verifyToken, apiController.createSubject);

module.exports = router;
