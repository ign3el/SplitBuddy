import 'dotenv/config';
import { pool } from './db.js';

async function init() {
  const conn = await pool.getConnection();
  try {
    const schemaStatements = [
      `CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        is_verified TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) ENGINE=InnoDB;`,
      `CREATE TABLE IF NOT EXISTS profiles (
        user_id VARCHAR(36) PRIMARY KEY,
        is_pro TINYINT(1) NOT NULL DEFAULT 0,
        scans_used_this_month INT NOT NULL DEFAULT 0,
        max_scans_per_month INT NOT NULL DEFAULT 5,
        month_reset_date DATETIME NOT NULL,
        CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;`,
      `CREATE TABLE IF NOT EXISTS password_resets (
        token VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) NOT NULL DEFAULT 0,
        INDEX idx_resets_user (user_id),
        CONSTRAINT fk_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;`,
      `CREATE TABLE IF NOT EXISTS email_verifications (
        token VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        expires_at DATETIME NOT NULL,
        used TINYINT(1) NOT NULL DEFAULT 0,
        INDEX idx_verifications_user (user_id),
        CONSTRAINT fk_verifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;`,
      `CREATE TABLE IF NOT EXISTS bills (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        title VARCHAR(255) NOT NULL,
        total DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_bills_user (user_id),
        CONSTRAINT fk_bills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;`,
      `CREATE TABLE IF NOT EXISTS splits (
        id VARCHAR(36) PRIMARY KEY,
        bill_id VARCHAR(36) NOT NULL,
        participant VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_splits_bill (bill_id),
        CONSTRAINT fk_splits_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;`,
      `CREATE TABLE IF NOT EXISTS split_history (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        split_date DATETIME NOT NULL,
        participant_name VARCHAR(255) NOT NULL,
        amount DECIMAL(10,2) NOT NULL,
        detailed_data JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_history_user (user_id),
        INDEX idx_history_date (split_date),
        CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      ) ENGINE=InnoDB;`
    ];

    for (const statement of schemaStatements) {
      await conn.query(statement);
    }

    console.log('✅ Database schema ensured (auth + billing + history)');
  } finally {
    conn.release();
  }
}

init()
  .catch(err => {
    console.error('Schema initialization failed:', err);
    process.exit(1);
  })
  .finally(() => pool.end());
