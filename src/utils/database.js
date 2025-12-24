import SQLite from 'react-native-sqlite-storage';
import { addDays } from 'date-fns';
import { defaultIncomeCategories, defaultExpenseCategories } from '../constants/formOptions';

const db = SQLite.openDatabase(
  {
    name: 'MyExpenseManager.db',
    location: 'default',
  },
  () => console.log('Database opened'),
  (err) => console.error('Error opening database:', err)
);

export const createTables = () => {
  db.transaction((tx) => {
    // Drop existing tables if needed
    tx.executeSql('DROP TABLE IF EXISTS CustomAccounts;');

    // Create new Accounts table
    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS Accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        icon TEXT,
        openingBalance REAL DEFAULT 0,
        isDefault INTEGER DEFAULT 0,
        isSystem INTEGER DEFAULT 0,
        isPermanent INTEGER DEFAULT 0
      );
    `);

    // Insert default accounts
    const defaultAccounts = [
      ['Cash', 'cash', 0, 1, 1, 1], // Added isPermanent flag
      ['Bank', 'bank', 0, 0, 1, 0],
      ['Card', 'card', 0, 0, 1, 0],
      ['UPI', 'phone-portrait', 0, 0, 1, 0],
      ['Savings', 'wallet', 0, 0, 1, 0]
    ];

    defaultAccounts.forEach(account => {
      tx.executeSql(
        'INSERT OR IGNORE INTO Accounts (name, icon, openingBalance, isDefault, isSystem, isPermanent) VALUES (?, ?, ?, ?, ?, ?);',
        account
      );
    });

    tx.executeSql(
      `CREATE TABLE IF NOT EXISTS Transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        description TEXT,
        amount REAL,
        account TEXT,
        category TEXT,
        type TEXT,
        date TIMESTAMP 
      );`
    );

    tx.executeSql(`
      CREATE TABLE IF NOT EXISTS Categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        icon TEXT,
        type TEXT,
        isSystem INTEGER DEFAULT 0,
        isPermanent INTEGER DEFAULT 0,
        UNIQUE(name, type)
      );
    `);

    // Insert all default categories
    [...defaultIncomeCategories, ...defaultExpenseCategories].forEach(category => {
      tx.executeSql(
        'INSERT OR IGNORE INTO Categories (name, icon, type, isSystem, isPermanent) VALUES (?, ?, ?, ?, ?);',
        category
      );
    });
  });
};

export const insertTransaction = (transaction, dateCounter) => {
  const { title, description, amount, account, category, type } = transaction;
  const date = addDays(new Date(), dateCounter).toISOString().split('T')[0];
  db.transaction((tx) => {
    tx.executeSql(
      `INSERT INTO Transactions (title, description, amount, account, category, type, date) VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [title, description, amount, account, category, type, date]
    );
  });
};

export const fetchTransactions = (type, date, callback) => {
  db.transaction((tx) => {
    tx.executeSql(
      `SELECT * FROM Transactions WHERE type = ? AND date(date) = date(?);`, // Fixed column name
      [type, date],
      (_, results) => {
        const rows = results.rows;
        let transactions = [];
        for (let i = 0; i < rows.length; i++) {
          transactions.push(rows.item(i));
        }
        callback(transactions);
      },
      (error) => {
        console.error('Error fetching transactions:', error); // Log errors if any
      }
    );
  });
};

export const fetchMonthlyTransactions = (type, date) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM Transactions 
         WHERE type = ? 
         AND strftime('%Y-%m', date) = strftime('%Y-%m', ?);`,
        [type, date],
        (_, results) => {
          const transactions = [];
          for (let i = 0; i < results.rows.length; i++) {
            transactions.push(results.rows.item(i));
          }
          resolve(transactions);
        },
        (_, error) => reject(error)
      );
    });
  });
};

// Add new function for yearly transactions
export const fetchYearlyTransactions = (type, year) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        `SELECT * FROM Transactions 
         WHERE type = ? 
         AND strftime('%Y', date) = ?;`,
        [type, year.toString()],
        (_, results) => {
          const transactions = [];
          for (let i = 0; i < results.rows.length; i++) {
            transactions.push(results.rows.item(i));
          }
          resolve(transactions);
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const getAccounts = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM Accounts ORDER BY isSystem DESC, name ASC;',
        [],
        (_, results) => {
          const accounts = [];
          for (let i = 0; i < results.rows.length; i++) {
            accounts.push(results.rows.item(i));
          }
          resolve(accounts);
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const addAccount = (name, icon, openingBalance) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO Accounts (name, icon, openingBalance) VALUES (?, ?, ?);',
        [name, icon, openingBalance || 0],
        (_, results) => {
          // Fetch the added account to return
          tx.executeSql(
            'SELECT * FROM Accounts WHERE id = ?',
            [results.insertId],
            (_, { rows }) => resolve(rows.item(0)),
            (_, error) => reject(error)
          );
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const updateAccount = (id, name, icon, openingBalance) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT name FROM Accounts WHERE id = ?',
        [id],
        (_, results) => {
          if (results.rows.length === 0) {
            reject(new Error('Account not found'));
            return;
          }

          // Allow all updates, including for permanent accounts
          tx.executeSql(
            'UPDATE Accounts SET name = ?, icon = ?, openingBalance = ? WHERE id = ?',
            [name, icon, openingBalance, id],
            (_, updateResults) => resolve(updateResults),
            (_, error) => reject(error)
          );
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const deleteAccount = (id) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      // First check if account is permanent
      tx.executeSql(
        'SELECT name, isPermanent FROM Accounts WHERE id = ?',
        [id],
        (_, results) => {
          if (results.rows.length === 0) {
            reject(new Error('Account not found'));
            return;
          }

          const account = results.rows.item(0);
          if (account.isPermanent === 1) {  // Check for numeric value
            reject(new Error('Cannot delete permanent account'));
            return;
          }

          // Transfer all transactions to Cash account
          tx.executeSql(
            'UPDATE Transactions SET account = "Cash" WHERE account = ?',
            [account.name],
            () => {
              // Then delete the account
              tx.executeSql(
                'DELETE FROM Accounts WHERE id = ? AND isPermanent = 0',  // Add isPermanent check
                [id],
                (_, deleteResults) => resolve(deleteResults),
                (_, error) => reject(error)
              );
            },
            (_, error) => reject(error)
          );
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const updateDefaultAccount = (id) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT name, isPermanent FROM Accounts WHERE id = ?',
        [id],
        (_, results) => {
          const targetAccount = results.rows.item(0);
          // Allow any account to become default
          tx.executeSql(
            'UPDATE Accounts SET isDefault = CASE id WHEN ? THEN 1 ELSE 0 END',
            [id],
            (_, updateResults) => resolve(updateResults),
            (_, error) => reject(error)
          );
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const getCategories = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT * FROM Categories ORDER BY type, isSystem DESC, name ASC;',
        [],
        (_, results) => {
          const categories = {
            income: [],
            expense: []
          };
          for (let i = 0; i < results.rows.length; i++) {
            const category = results.rows.item(i);
            categories[category.type].push(category);
          }
          // Sort both arrays by name
          categories.income.sort((a, b) => a.name.localeCompare(b.name));
          categories.expense.sort((a, b) => a.name.localeCompare(b.name));
          resolve(categories);
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const addCategory = (name, icon, type) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO Categories (name, icon, type) VALUES (?, ?, ?);',
        [name, icon, type],
        (_, results) => {
          tx.executeSql(
            'SELECT * FROM Categories WHERE id = ?',
            [results.insertId],
            (_, { rows }) => resolve(rows.item(0)),
            (_, error) => reject(error)
          );
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const updateCategory = (id, name, icon) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT isPermanent FROM Categories WHERE id = ?',
        [id],
        (_, results) => {
          if (results.rows.length === 0) {
            reject(new Error('Category not found'));
            return;
          }

          const category = results.rows.item(0);
          if (category.isPermanent === 1) {
            reject(new Error('Cannot modify permanent category'));
            return;
          }

          tx.executeSql(
            'UPDATE Categories SET name = ?, icon = ? WHERE id = ?',
            [name, icon, id],
            (_, updateResults) => resolve(updateResults),
            (_, error) => reject(error)
          );
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const deleteCategory = (id) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT name, type, isPermanent FROM Categories WHERE id = ?',
        [id],
        (_, results) => {
          if (results.rows.length === 0) {
            reject(new Error('Category not found'));
            return;
          }

          const category = results.rows.item(0);
          if (category.isPermanent === 1) {
            reject(new Error('Cannot delete permanent category'));
            return;
          }

          // Transfer transactions to 'Others' category of same type
          tx.executeSql(
            'UPDATE Transactions SET category = "Others" WHERE category = ?',
            [category.name],
            () => {
              tx.executeSql(
                'DELETE FROM Categories WHERE id = ? AND isPermanent = 0',
                [id],
                (_, deleteResults) => resolve(deleteResults),
                (_, error) => reject(error)
              );
            },
            (_, error) => reject(error)
          );
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const addCustomCategory = (name, type) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'INSERT INTO CustomCategories (name, type) VALUES (?, ?);',
        [name, type],
        (_, results) => resolve(results),
        (_, error) => reject(error)
      );
    });
  });
};

export const getAccountBalance = (accountName) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT 
          (SELECT openingBalance FROM Accounts WHERE name = ?) +
          COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END), 0) as balance
         FROM Transactions 
         WHERE account = ?;`,
        [accountName, accountName],
        (_, results) => resolve(results.rows.item(0).balance),
        (_, error) => reject(error)
      );
    });
  });
};

export const getAllAccountBalances = () => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT a.*, 
          (a.openingBalance + COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE -t.amount END), 0)) as balance
         FROM Accounts a
         LEFT JOIN Transactions t ON a.name = t.account
         GROUP BY a.id
         ORDER BY a.isSystem DESC, a.name ASC;`,
        [],
        (_, results) => {
          const accounts = [];
          for (let i = 0; i < results.rows.length; i++) {
            accounts.push(results.rows.item(i));
          }
          resolve(accounts);
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const isCustomAccount = (accountName) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'SELECT 1 FROM Accounts WHERE name = ?;',
        [accountName],
        (_, results) => resolve(results.rows.length > 0),
        (_, error) => reject(error)
      );
    });
  });
};

export const updateTransaction = (transaction) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'UPDATE transactions SET title = ?, description = ?, amount = ?, category = ?, account = ?, date = ? WHERE id = ?',
        [
          transaction.title,
          transaction.description,
          transaction.amount,
          transaction.category,
          transaction.account,
          transaction.date,
          transaction.id
        ],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};

export const deleteTransaction = (id) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        'DELETE FROM transactions WHERE id = ?',
        [id],
        (_, result) => resolve(result),
        (_, error) => reject(error)
      );
    });
  });
};

export const fetchTransactionsByCategory = (type, category, date, isMonthly = true) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      const dateFilter = isMonthly ? 
        "strftime('%Y-%m', date) = strftime('%Y-%m', ?)" :
        "strftime('%Y', date) = ?";
      
      tx.executeSql(
        `SELECT * FROM Transactions 
         WHERE type = ? 
         AND category = ?
         AND ${dateFilter}
         ORDER BY date DESC;`,
        [type, category, date],
        (_, results) => {
          const transactions = [];
          for (let i = 0; i < results.rows.length; i++) {
            transactions.push(results.rows.item(i));
          }
          resolve(transactions);
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const fetchTransactionsByFilters = (query, filters) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      let conditions = [];
      let params = [];

      // Text search
      if (query) {
        conditions.push('(title LIKE ? OR description LIKE ? OR category LIKE ? OR account LIKE ?)');
        const searchTerm = `%${query}%`;
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
      }

      // Type filter
      if (filters.type !== 'all') {
        conditions.push('type = ?');
        params.push(filters.type);
      }

      // Date range filter (use only date part, local time)
      const toLocalDateString = (d) => {
        if (!d) return '';
        // Get local date in YYYY-MM-DD
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      if (filters.startDate) {
        conditions.push('date(date) >= date(?)');
        params.push(toLocalDateString(filters.startDate));
      }
      if (filters.endDate) {
        conditions.push('date(date) <= date(?)');
        params.push(toLocalDateString(filters.endDate));
      }

      // Account filter - updated to handle multiple accounts
      if (filters.accounts && filters.accounts.length > 0) {
        const accountPlaceholders = filters.accounts.map(() => '?').join(',');
        conditions.push(`account IN (${accountPlaceholders})`);
        params.push(...filters.accounts);
      }

      // Category filter - updated to handle multiple categories
      if (filters.categories && filters.categories.length > 0) {
        const categoryPlaceholders = filters.categories.map(() => '?').join(',');
        conditions.push(`category IN (${categoryPlaceholders})`);
        params.push(...filters.categories);
      }

      // Amount range filter
      if (filters.minAmount) {
        conditions.push('amount >= ?');
        params.push(parseFloat(filters.minAmount));
      }
      if (filters.maxAmount) {
        conditions.push('amount <= ?');
        params.push(parseFloat(filters.maxAmount));
      }

      const whereClause = conditions.length > 0 
        ? `WHERE ${conditions.join(' AND ')}` 
        : '';


      tx.executeSql(
        `SELECT * FROM Transactions ${whereClause} ORDER BY date DESC;`,
        params,
        (_, results) => {
          const transactions = [];
          for (let i = 0; i < results.rows.length; i++) {
            transactions.push(results.rows.item(i));
          }
          resolve(transactions);
        },
        (_, error) => reject(error)
      );
    });
  });
};

export const getMostFrequentCategory = (type) => {
  return new Promise((resolve, reject) => {
    db.transaction(tx => {
      tx.executeSql(
        `SELECT category, COUNT(*) as count 
         FROM Transactions 
         WHERE type = ? 
         GROUP BY category 
         ORDER BY count DESC 
         LIMIT 1;`,
        [type],
        (_, results) => {
          if (results.rows.length > 0) {
            resolve(results.rows.item(0).category);
          } else {
            resolve('Others'); // Default to Others if no transactions exist
          }
        },
        (_, error) => reject(error)
      );
    });
  });
};