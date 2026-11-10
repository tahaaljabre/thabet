function initializeAccountingSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS AccountingPeriods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_id INTEGER NOT NULL,
      period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
      status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
      closed_at TEXT,
      closed_by TEXT,
      close_note TEXT,
      trial_debit_minor INTEGER,
      trial_credit_minor INTEGER,
      reopened_at TEXT,
      reopened_by TEXT,
      reopen_reason TEXT,
      UNIQUE (year_id, period_month),
      FOREIGN KEY (year_id) REFERENCES FinancialYears(YearID)
    );

    CREATE TABLE IF NOT EXISTS AccountingPeriodAudit (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      period_id INTEGER NOT NULL,
      action TEXT NOT NULL CHECK (action IN ('close', 'reopen')),
      action_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      action_by TEXT NOT NULL,
      reason TEXT,
      debit_minor INTEGER,
      credit_minor INTEGER,
      FOREIGN KEY (period_id) REFERENCES AccountingPeriods(id)
    );

    CREATE TABLE IF NOT EXISTS FinancialIntegrityChecks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_id INTEGER NOT NULL,
      check_date TEXT NOT NULL,
      status TEXT NOT NULL CHECK (status IN ('healthy', 'warning', 'critical')),
      critical_count INTEGER NOT NULL DEFAULT 0,
      warning_count INTEGER NOT NULL DEFAULT 0,
      checked_accounts INTEGER NOT NULL DEFAULT 0,
      findings_json TEXT NOT NULL DEFAULT '[]',
      trigger_type TEXT NOT NULL CHECK (trigger_type IN ('automatic', 'manual', 'period_close')),
      checked_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      checked_by TEXT,
      FOREIGN KEY (year_id) REFERENCES FinancialYears(YearID)
    );
    CREATE INDEX IF NOT EXISTS idx_integrity_checks_year_date
      ON FinancialIntegrityChecks(year_id, check_date, checked_at);

    CREATE TABLE IF NOT EXISTS BankReconciliations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bank_account_id INTEGER NOT NULL,
      year_id INTEGER NOT NULL,
      period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      statement_closing_minor INTEGER NOT NULL,
      book_balance_minor INTEGER,
      difference_minor INTEGER,
      status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'review', 'approved', 'cancelled')),
      source_file_name TEXT,
      column_mapping TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT NOT NULL,
      approved_at TEXT,
      approved_by TEXT,
      cancelled_at TEXT,
      cancel_reason TEXT,
      UNIQUE (bank_account_id, year_id, period_month),
      FOREIGN KEY (bank_account_id) REFERENCES BankAccounts(id),
      FOREIGN KEY (year_id) REFERENCES FinancialYears(YearID)
    );

    CREATE TABLE IF NOT EXISTS BankStatementLines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reconciliation_id INTEGER NOT NULL,
      bank_account_id INTEGER NOT NULL,
      tx_date TEXT NOT NULL,
      description TEXT,
      reference TEXT,
      amount_minor INTEGER NOT NULL CHECK (amount_minor <> 0),
      balance_minor INTEGER,
      fingerprint TEXT NOT NULL,
      raw_data TEXT,
      match_status TEXT NOT NULL DEFAULT 'unmatched'
        CHECK (match_status IN ('unmatched', 'suggested', 'matched', 'adjusted', 'ignored')),
      suggested_transaction_id INTEGER,
      resolution_note TEXT,
      UNIQUE (bank_account_id, fingerprint),
      FOREIGN KEY (reconciliation_id) REFERENCES BankReconciliations(id),
      FOREIGN KEY (bank_account_id) REFERENCES BankAccounts(id),
      FOREIGN KEY (suggested_transaction_id) REFERENCES BankTransactions(id)
    );

    CREATE TABLE IF NOT EXISTS BankReconciliationMatches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      statement_line_id INTEGER NOT NULL,
      bank_transaction_id INTEGER,
      journal_line_id INTEGER,
      matched_minor INTEGER NOT NULL CHECK (matched_minor > 0),
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT NOT NULL,
      CHECK (
        (bank_transaction_id IS NOT NULL AND journal_line_id IS NULL) OR
        (bank_transaction_id IS NULL AND journal_line_id IS NOT NULL)
      ),
      UNIQUE (statement_line_id, bank_transaction_id),
      UNIQUE (statement_line_id, journal_line_id),
      FOREIGN KEY (statement_line_id) REFERENCES BankStatementLines(id),
      FOREIGN KEY (bank_transaction_id) REFERENCES BankTransactions(id),
      FOREIGN KEY (journal_line_id) REFERENCES JournalLines(id)
    );

    CREATE TABLE IF NOT EXISTS LedgerAccounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_id INTEGER NOT NULL,
      account_code TEXT NOT NULL,
      name_ar TEXT NOT NULL,
      name_en TEXT NOT NULL,
      account_type TEXT NOT NULL
        CHECK (account_type IN ('asset', 'liability', 'equity', 'revenue', 'expense')),
      parent_id INTEGER,
      bank_account_id INTEGER,
      is_system INTEGER NOT NULL DEFAULT 0 CHECK (is_system IN (0, 1)),
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      UNIQUE (year_id, account_code),
      UNIQUE (year_id, bank_account_id),
      FOREIGN KEY (year_id) REFERENCES FinancialYears(YearID),
      FOREIGN KEY (parent_id) REFERENCES LedgerAccounts(id),
      FOREIGN KEY (bank_account_id) REFERENCES BankAccounts(id)
    );

    CREATE TABLE IF NOT EXISTS JournalSequences (
      year_id INTEGER PRIMARY KEY,
      last_number INTEGER NOT NULL DEFAULT 0 CHECK (last_number >= 0),
      FOREIGN KEY (year_id) REFERENCES FinancialYears(YearID)
    );

    CREATE TABLE IF NOT EXISTS JournalEntries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      year_id INTEGER NOT NULL,
      entry_number INTEGER NOT NULL CHECK (entry_number > 0),
      entry_date TEXT NOT NULL,
      description TEXT NOT NULL,
      source_type TEXT NOT NULL,
      source_key TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'posted')),
      reverses_entry_id INTEGER,
      reversed_by_entry_id INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT NOT NULL DEFAULT 'System',
      posted_at TEXT,
      UNIQUE (year_id, entry_number),
      FOREIGN KEY (year_id) REFERENCES FinancialYears(YearID),
      FOREIGN KEY (reverses_entry_id) REFERENCES JournalEntries(id),
      FOREIGN KEY (reversed_by_entry_id) REFERENCES JournalEntries(id)
    );

    CREATE TABLE IF NOT EXISTS JournalLines (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entry_id INTEGER NOT NULL,
      account_id INTEGER NOT NULL,
      description TEXT,
      debit_minor INTEGER NOT NULL DEFAULT 0 CHECK (debit_minor >= 0),
      credit_minor INTEGER NOT NULL DEFAULT 0 CHECK (credit_minor >= 0),
      CHECK (
        (debit_minor > 0 AND credit_minor = 0) OR
        (credit_minor > 0 AND debit_minor = 0)
      ),
      FOREIGN KEY (entry_id) REFERENCES JournalEntries(id) ON DELETE CASCADE,
      FOREIGN KEY (account_id) REFERENCES LedgerAccounts(id)
    );

    CREATE INDEX IF NOT EXISTS idx_journal_entries_year_date
      ON JournalEntries(year_id, entry_date);
    CREATE INDEX IF NOT EXISTS idx_journal_entries_source
      ON JournalEntries(year_id, source_type, source_key, status);
    CREATE INDEX IF NOT EXISTS idx_journal_lines_entry
      ON JournalLines(entry_id);
    CREATE INDEX IF NOT EXISTS idx_journal_lines_account
      ON JournalLines(account_id);

    CREATE TRIGGER IF NOT EXISTS trg_journal_line_same_year_insert
    BEFORE INSERT ON JournalLines
    BEGIN
      SELECT CASE WHEN (
        SELECT je.year_id FROM JournalEntries je WHERE je.id = NEW.entry_id
      ) <> (
        SELECT la.year_id FROM LedgerAccounts la WHERE la.id = NEW.account_id
      ) THEN RAISE(ABORT, 'FIN_JOURNAL_ACCOUNT_YEAR_MISMATCH') END;
      SELECT CASE WHEN (
        SELECT status FROM JournalEntries WHERE id = NEW.entry_id
      ) = 'posted' THEN RAISE(ABORT, 'FIN_POSTED_ENTRY_IMMUTABLE') END;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_journal_line_immutable_update
    BEFORE UPDATE ON JournalLines
    WHEN (SELECT status FROM JournalEntries WHERE id = OLD.entry_id) = 'posted'
    BEGIN
      SELECT RAISE(ABORT, 'FIN_POSTED_ENTRY_IMMUTABLE');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_journal_line_immutable_delete
    BEFORE DELETE ON JournalLines
    WHEN (SELECT status FROM JournalEntries WHERE id = OLD.entry_id) = 'posted'
    BEGIN
      SELECT RAISE(ABORT, 'FIN_POSTED_ENTRY_IMMUTABLE');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_journal_entry_validate_post
    BEFORE UPDATE OF status ON JournalEntries
    WHEN OLD.status = 'draft' AND NEW.status = 'posted'
    BEGIN
      SELECT CASE WHEN (
        SELECT COUNT(*) FROM JournalLines WHERE entry_id = NEW.id
      ) < 2 THEN RAISE(ABORT, 'FIN_JOURNAL_MINIMUM_TWO_LINES') END;
      SELECT CASE WHEN (
        SELECT COALESCE(SUM(debit_minor), 0) FROM JournalLines WHERE entry_id = NEW.id
      ) <= 0 THEN RAISE(ABORT, 'FIN_JOURNAL_ZERO_TOTAL') END;
      SELECT CASE WHEN (
        SELECT COALESCE(SUM(debit_minor), 0) FROM JournalLines WHERE entry_id = NEW.id
      ) <> (
        SELECT COALESCE(SUM(credit_minor), 0) FROM JournalLines WHERE entry_id = NEW.id
      ) THEN RAISE(ABORT, 'FIN_JOURNAL_UNBALANCED') END;
    END;

    CREATE TRIGGER IF NOT EXISTS trg_journal_entry_posted_immutable
    BEFORE UPDATE ON JournalEntries
    WHEN OLD.status = 'posted' AND (
      NEW.year_id <> OLD.year_id OR
      NEW.entry_number <> OLD.entry_number OR
      NEW.entry_date <> OLD.entry_date OR
      NEW.description <> OLD.description OR
      NEW.source_type <> OLD.source_type OR
      NEW.source_key <> OLD.source_key OR
      NEW.status <> OLD.status OR
      COALESCE(NEW.reverses_entry_id, 0) <> COALESCE(OLD.reverses_entry_id, 0)
    )
    BEGIN
      SELECT RAISE(ABORT, 'FIN_POSTED_ENTRY_IMMUTABLE');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_journal_entry_no_delete_posted
    BEFORE DELETE ON JournalEntries
    WHEN OLD.status = 'posted'
    BEGIN
      SELECT RAISE(ABORT, 'FIN_POSTED_ENTRY_IMMUTABLE');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_journal_entry_closed_period_insert
    BEFORE INSERT ON JournalEntries
    WHEN EXISTS (
      SELECT 1 FROM AccountingPeriods p
      WHERE p.year_id = NEW.year_id
        AND p.period_month = CAST(strftime('%m', NEW.entry_date) AS INTEGER)
        AND p.status = 'closed'
    )
    BEGIN
      SELECT RAISE(ABORT, 'FIN_ACCOUNTING_PERIOD_CLOSED');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_journal_entry_closed_period_update
    BEFORE UPDATE ON JournalEntries
    WHEN EXISTS (
      SELECT 1 FROM AccountingPeriods p
      WHERE p.year_id IN (OLD.year_id, NEW.year_id)
        AND p.period_month IN (
          CAST(strftime('%m', OLD.entry_date) AS INTEGER),
          CAST(strftime('%m', NEW.entry_date) AS INTEGER)
        )
        AND p.status = 'closed'
    )
    BEGIN
      SELECT RAISE(ABORT, 'FIN_ACCOUNTING_PERIOD_CLOSED');
    END;
  `, error => {
    if (error) console.error('Failed to initialize accounting schema:', error);
  });
}

module.exports = { initializeAccountingSchema };
