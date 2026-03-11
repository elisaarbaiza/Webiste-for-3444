const express = require('express');
const router = express.Router();
const pool = require('../database');

// Get cart items for a user (joined with product details)
router.get('/:user_id', async (req, res) => {
  try {
    const { user_id } = req.params;
    const result = await pool.query(
      `SELECT ci.id, ci.quantity, ci.product_id,
              p.title, p.image_url, p.price
       FROM cart_items ci
       JOIN products p ON ci.product_id = p.id
       WHERE ci.user_id = $1
       ORDER BY ci.created_at DESC`,
      [user_id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add item to cart (or increment quantity if already exists)
router.post('/', async (req, res) => {
  try {
    const { user_id, product_id, quantity = 1 } = req.body;

    const existing = await pool.query(
      `SELECT * FROM cart_items WHERE user_id = $1 AND product_id = $2`,
      [user_id, product_id]
    );

    if (existing.rows.length > 0) {
      const updated = await pool.query(
        `UPDATE cart_items SET quantity = quantity + $1
         WHERE user_id = $2 AND product_id = $3
         RETURNING *`,
        [quantity, user_id, product_id]
      );
      return res.json(updated.rows[0]);
    }

    const result = await pool.query(
      `INSERT INTO cart_items (user_id, product_id, quantity)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [user_id, product_id, quantity]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update quantity of a cart item
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity } = req.body;

    const result = await pool.query(
      `UPDATE cart_items SET quantity = $1 WHERE id = $2 RETURNING *`,
      [quantity, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove item from cart
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query(`DELETE FROM cart_items WHERE id = $1`, [id]);
    res.json({ message: 'Item removed from cart' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
