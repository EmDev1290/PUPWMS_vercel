const express = require('express');
const router = express.Router();
const apiController = require('../controllers/api.controller');
const verifyToken = require('../middleware/auth');
const requireAcademicHead = verifyToken.requireAcademicHead;

// Note: getInitialState might need to be accessible before full login in some apps, 
// but since this is an admin dashboard it should probably be protected.
router.get('/initial-state', apiController.getInitialState);

router.post('/rooms', verifyToken, requireAcademicHead, apiController.createRoom);
router.delete('/rooms', verifyToken, requireAcademicHead, apiController.deleteRoom);

router.get('/school-years', apiController.getSchoolYears);
router.post('/school-years', verifyToken, apiController.createSchoolYear);
router.delete('/school-years/:name', verifyToken, requireAcademicHead, apiController.deleteSchoolYear);
router.delete('/school-years', verifyToken, requireAcademicHead, apiController.deleteSchoolYear);

router.post('/faculty', verifyToken, requireAcademicHead, apiController.createFaculty);
router.patch('/faculty/:id/status', verifyToken, requireAcademicHead, apiController.updateFacultyStatus);
router.delete('/faculty/:id', verifyToken, requireAcademicHead, apiController.deleteFaculty);

router.post('/loads', verifyToken, apiController.createLoad);
router.delete('/loads/:id', verifyToken, apiController.deleteLoad);

router.get('/request-history', verifyToken, apiController.getRequestHistory);
router.post('/request-history', verifyToken, apiController.createRequestHistory);
router.patch('/request-history/:id/status', verifyToken, apiController.updateRequestHistoryStatus);

router.post('/programs', verifyToken, apiController.createProgram);
router.post('/sections', verifyToken, requireAcademicHead, apiController.createSection);
router.delete('/sections', verifyToken, requireAcademicHead, apiController.deleteSection);
router.post('/subjects', verifyToken, requireAcademicHead, apiController.createSubject);
router.patch('/subjects', verifyToken, requireAcademicHead, apiController.updateSubject);
router.delete('/subjects', verifyToken, requireAcademicHead, apiController.deleteSubject);

router.get('/emails', verifyToken, requireAcademicHead, apiController.getEmails);
router.post('/emails', verifyToken, apiController.createEmail);
router.patch('/emails/:id/status', verifyToken, requireAcademicHead, apiController.updateEmailStatus);
router.delete('/emails/:id', verifyToken, requireAcademicHead, apiController.deleteEmail);

router.get('/users', verifyToken, requireAcademicHead, apiController.getUsers);
router.post('/users', verifyToken, requireAcademicHead, apiController.createUser);
router.patch('/users/me/credentials', verifyToken, apiController.updateMyCredentials);
router.patch('/users/:username', verifyToken, requireAcademicHead, apiController.updateUser);
router.delete('/users/:username', verifyToken, requireAcademicHead, apiController.deleteUser);

router.get('/settings', verifyToken, apiController.getSettings);
router.patch('/settings', verifyToken, requireAcademicHead, apiController.updateSettings);

module.exports = router;
