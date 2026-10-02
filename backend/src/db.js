const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/fraudbank'
});

pool.on('error', (err) => {
  console.error('[PostgreSQL Pool Error]', err);
});

class HttpError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'HttpError';
  }
}

/**
 * Validates and parses monetary amounts.
 * Amount must be positive with at most two decimal places.
 */
function parseAmount(amount) {
  if (amount === undefined || amount === null || amount === '') {
    throw new HttpError(400, 'Amount is required');
  }

  const str = String(amount).trim();
  const num = Number(str);

  if (isNaN(num) || !isFinite(num) || num <= 0) {
    throw new HttpError(400, 'Amount must be greater than zero');
  }

  // Ensure maximum two decimal places
  const decimalParts = str.split('.');
  if (decimalParts.length > 1 && decimalParts[1].length > 2) {
    throw new HttpError(400, 'Amount cannot have more than two decimal places');
  }

  return num.toFixed(2);
}

/**
 * Executes a callback within a managed PostgreSQL transaction.
 * Automatically performs BEGIN, COMMIT, and ROLLBACK on failure.
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  query: (text, params) => pool.query(text, params),
  withTransaction,
  HttpError,
  parseAmount
};
