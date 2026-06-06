import Database from "better-sqlite3";
import { join, dirname } from "path";
import { mkdirSync, existsSync } from "fs";

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const dbPath = process.env.DATABASE_URL?.replace("sqlite+aiosqlite:///", "").replace("sqlite:///", "") || "data/sales_agent.db";
    const fullPath = join(process.cwd(), dbPath);
    
    // Ensure data directory exists
    const dir = dirname(fullPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    db = new Database(fullPath);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    
    // Initialize schema if tables don't exist
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(db: Database.Database) {
  // Create customers table
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      phone TEXT UNIQUE NOT NULL,
      name TEXT,
      company TEXT,
      gst_number TEXT,
      email TEXT,
      city TEXT,
      state TEXT,
      language TEXT DEFAULT 'en',
      stage TEXT DEFAULT 'new',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
    CREATE INDEX IF NOT EXISTS idx_customers_stage ON customers(stage);
  `);

  // Create chat_messages table
  db.exec(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      channel TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    CREATE INDEX IF NOT EXISTS idx_chat_messages_customer ON chat_messages(customer_id);
    CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at);
  `);

  // Create enquiries table
  db.exec(`
    CREATE TABLE IF NOT EXISTS enquiries (
      id TEXT PRIMARY KEY,
      customer_id TEXT NOT NULL,
      size_inches INTEGER,
      grammage REAL,
      quality TEXT,
      color TEXT,
      lamination TEXT,
      quantity_kg REAL,
      delivery_city TEXT,
      seasonal_months TEXT,
      status TEXT DEFAULT 'enquiry',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    CREATE INDEX IF NOT EXISTS idx_enquiries_customer ON enquiries(customer_id);
    CREATE INDEX IF NOT EXISTS idx_enquiries_status ON enquiries(status);
  `);

  // Create quotes table
  db.exec(`
    CREATE TABLE IF NOT EXISTS quotes (
      id TEXT PRIMARY KEY,
      enquiry_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      base_price REAL NOT NULL,
      size_premium REAL DEFAULT 0,
      color_premium REAL DEFAULT 0,
      lamination_premium REAL DEFAULT 0,
      grammage_adjustment REAL DEFAULT 0,
      unit_price REAL NOT NULL,
      total_amount REAL NOT NULL,
      validity_days INTEGER DEFAULT 7,
      owner_approved INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      approved_at TEXT,
      FOREIGN KEY (enquiry_id) REFERENCES enquiries(id),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    CREATE INDEX IF NOT EXISTS idx_quotes_enquiry ON quotes(enquiry_id);
    CREATE INDEX IF NOT EXISTS idx_quotes_approved ON quotes(owner_approved);
  `);

  // Create price_config table
  db.exec(`
    CREATE TABLE IF NOT EXISTS price_config (
      id TEXT PRIMARY KEY,
      base_price_3g REAL NOT NULL,
      effective_date TEXT DEFAULT (datetime('now')),
      created_by TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_price_config_effective ON price_config(effective_date DESC);
  `);

  // Create knowledge_base table
  db.exec(`
    CREATE TABLE IF NOT EXISTS knowledge_base (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      value TEXT NOT NULL,
      type TEXT NOT NULL,
      scope TEXT NOT NULL DEFAULT 'internal_only',
      source TEXT DEFAULT 'system',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_knowledge_key ON knowledge_base(key);
    CREATE INDEX IF NOT EXISTS idx_knowledge_scope ON knowledge_base(scope);
    CREATE INDEX IF NOT EXISTS idx_knowledge_type ON knowledge_base(type);
  `);

  // Create production_capacity table
  db.exec(`
    CREATE TABLE IF NOT EXISTS production_capacity (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      size_inches INTEGER NOT NULL,
      grammage REAL NOT NULL,
      planned_kg REAL NOT NULL,
      booked_kg REAL DEFAULT 0,
      available_kg REAL NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(date, size_inches, grammage)
    );
    CREATE INDEX IF NOT EXISTS idx_capacity_date ON production_capacity(date);
    CREATE INDEX IF NOT EXISTS idx_capacity_size_gram ON production_capacity(size_inches, grammage);
  `);

  // Create activity_log table
  db.exec(`
    CREATE TABLE IF NOT EXISTS activity_log (
      id TEXT PRIMARY KEY,
      event_type TEXT NOT NULL,
      actor TEXT,
      customer_id TEXT,
      payload TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (customer_id) REFERENCES customers(id)
    );
    CREATE INDEX IF NOT EXISTS idx_activity_type ON activity_log(event_type);
    CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_log(created_at DESC);
  `);

  // Create pending_escalations table — tracks questions sent to owner awaiting reply
  db.exec(`
    CREATE TABLE IF NOT EXISTS pending_escalations (
      id TEXT PRIMARY KEY,
      customer_phone TEXT NOT NULL,
      customer_name TEXT,
      customer_id TEXT,
      question TEXT NOT NULL,
      holding_message TEXT,
      status TEXT DEFAULT 'pending',
      owner_reply TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      resolved_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_escalations_status ON pending_escalations(status);
    CREATE INDEX IF NOT EXISTS idx_escalations_created ON pending_escalations(created_at DESC);
  `);

  // Insert default price config if none exists
  const priceCount = db.prepare("SELECT COUNT(*) as count FROM price_config").get() as { count: number };
  if (priceCount.count === 0) {
    db.prepare(`
      INSERT INTO price_config (id, base_price_3g, created_by, notes)
      VALUES (?, ?, ?, ?)
    `).run(
      crypto.randomUUID(),
      80,
      "system",
      "Initial base price"
    );
  }
}

export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
  }
}

export function checkDatabaseHealth(): {
  healthy: boolean;
  tables: string[];
  issues: string[];
  counts: Record<string, number>;
} {
  try {
    const db = getDatabase();
    const tables: string[] = [];
    const issues: string[] = [];
    const counts: Record<string, number> = {};

    // Get all tables
    const tableQuery = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `).all() as Array<{ name: string }>;

    for (const { name } of tableQuery) {
      tables.push(name);
      try {
        const countResult = db.prepare(`SELECT COUNT(*) as count FROM ${name}`).get() as { count: number };
        counts[name] = countResult.count;
      } catch (error) {
        issues.push(`Failed to count rows in ${name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Check for required tables
    const requiredTables = [
      'customers',
      'chat_messages',
      'enquiries',
      'quotes',
      'price_config',
      'knowledge_base',
      'production_capacity',
      'activity_log'
    ];

    for (const table of requiredTables) {
      if (!tables.includes(table)) {
        issues.push(`Missing required table: ${table}`);
      }
    }

    // Check for base price
    if (counts.price_config === 0) {
      issues.push('No base price configured in price_config table');
    }

    return {
      healthy: issues.length === 0,
      tables,
      issues,
      counts
    };
  } catch (error) {
    return {
      healthy: false,
      tables: [],
      issues: [`Database health check failed: ${error instanceof Error ? error.message : String(error)}`],
      counts: {}
    };
  }
}

export function seedTestData(): {
  success: boolean;
  message: string;
  seeded: Record<string, number>;
} {
  try {
    const db = getDatabase();
    const seeded: Record<string, number> = {};

    // Seed knowledge base with sample facts
    const knowledgeEntries = [
      {
        key: 'meter_weight:36:3.0:unlam',
        value: '180 g/m',
        type: 'fact',
        scope: 'customer_visible'
      },
      {
        key: 'meter_weight:34:3.5:unlam',
        value: '195 g/m',
        type: 'fact',
        scope: 'customer_visible'
      },
      {
        key: 'quality:silver:strength',
        value: '1600 N',
        type: 'fact',
        scope: 'customer_visible'
      },
      {
        key: 'quality:gold:strength',
        value: '1800 N',
        type: 'fact',
        scope: 'customer_visible'
      },
      {
        key: 'company:name',
        value: 'Anjani Interweave',
        type: 'fact',
        scope: 'customer_visible'
      },
      {
        key: 'company:location',
        value: 'Surat, Gujarat',
        type: 'fact',
        scope: 'customer_visible'
      },
      {
        key: 'rule:minimum_order',
        value: 'Minimum order quantity is 500 kg',
        type: 'rule',
        scope: 'internal_only'
      }
    ];

    let knowledgeCount = 0;
    for (const entry of knowledgeEntries) {
      try {
        db.prepare(`
          INSERT OR REPLACE INTO knowledge_base (id, key, value, type, scope, source)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(
          crypto.randomUUID(),
          entry.key,
          entry.value,
          entry.type,
          entry.scope,
          'seed'
        );
        knowledgeCount++;
      } catch (error) {
        // Skip if already exists
      }
    }
    seeded.knowledge_base = knowledgeCount;

    // Seed production capacity for next 30 days
    const today = new Date();
    const sizes = [24, 26, 28, 30, 32, 34, 36];
    const grammages = [3.0, 3.5, 4.0, 4.5, 5.0];
    let capacityCount = 0;

    for (let dayOffset = 0; dayOffset < 30; dayOffset++) {
      const date = new Date(today);
      date.setDate(date.getDate() + dayOffset);
      const dateStr = date.toISOString().split('T')[0];

      for (const size of sizes) {
        for (const grammage of grammages) {
          // Calculate planned capacity (larger sizes have more capacity)
          const plannedKg = (size >= 32 ? 2000 : 1500) + Math.random() * 500;
          const bookedKg = Math.random() * plannedKg * 0.5; // 0-50% booked
          const availableKg = plannedKg - bookedKg;

          try {
            db.prepare(`
              INSERT OR REPLACE INTO production_capacity 
              (id, date, size_inches, grammage, planned_kg, booked_kg, available_kg)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `).run(
              crypto.randomUUID(),
              dateStr,
              size,
              grammage,
              Math.round(plannedKg),
              Math.round(bookedKg),
              Math.round(availableKg)
            );
            capacityCount++;
          } catch (error) {
            // Skip if already exists
          }
        }
      }
    }
    seeded.production_capacity = capacityCount;

    return {
      success: true,
      message: 'Test data seeded successfully',
      seeded
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to seed test data: ${error instanceof Error ? error.message : String(error)}`,
      seeded: {}
    };
  }
}
