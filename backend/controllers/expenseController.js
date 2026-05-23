const { getPool } = require('../config/db');

// 1. Obtener todos los gastos registrados
async function getExpenses(req, res) {
  try {
    const db = getPool();
    const [rows] = await db.query('SELECT * FROM gastos ORDER BY fecha DESC');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 2. Registrar un nuevo gasto
async function createExpense(req, res) {
  try {
    const { descripcion, monto, categoria } = req.body;
    if (!descripcion || !monto) {
      return res.status(400).json({ error: 'Descripción e importe son campos requeridos.' });
    }

    const db = getPool();
    const [result] = await db.query(
      'INSERT INTO gastos (descripcion, monto, categoria) VALUES (?, ?, ?)',
      [descripcion, parseFloat(monto), categoria || 'Servicios']
    );

    res.status(201).json({
      success: true,
      message: 'Gasto registrado con éxito.',
      expense: { id: result.insertId, descripcion, monto: parseFloat(monto), categoria: categoria || 'Servicios' }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

// 3. Eliminar un gasto
async function deleteExpense(req, res) {
  try {
    const { id } = req.params;
    const db = getPool();
    await db.query('DELETE FROM gastos WHERE id = ?', [id]);
    res.json({ success: true, message: 'Gasto eliminado con éxito.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getExpenses,
  createExpense,
  deleteExpense
};
