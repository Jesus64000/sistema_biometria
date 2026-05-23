const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');

// Rutas de gastos
router.get('/', expenseController.getExpenses);
router.post('/', expenseController.createExpense);
router.delete('/:id', expenseController.deleteExpense);

module.exports = router;
