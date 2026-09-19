const express = require('express');
const router = express.Router();
const companyController = require('../controllers/companyController');

// Publicly readable or accessible with auth
router.get('/', companyController.getAllCompanies);
router.get('/:slug', companyController.getCompanyBySlug);

module.exports = router;
