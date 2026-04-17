const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'jukofact',
  user: 'jukofact',
  password: 'jukofact_pass',
});

client.connect()
  .then(() => {
    console.log('Connected to database');
    return client.query("SELECT id, ruc, \"razonSocial\" FROM companies WHERE ruc LIKE '1104391774%' LIMIT 5;");
  })
  .then((result) => {
    console.log('\nQuery Results:');
    console.log('='.repeat(100));
    if (result.rows.length === 0) {
      console.log('No results found');
    } else {
      result.rows.forEach(row => {
        console.log(`ID: ${row.id} | RUC: ${row.ruc} (Length: ${row.ruc.length} digits) | Razón Social: ${row.razonSocial}`);
      });
    }
  })
  .catch((err) => {
    console.error('Error:', err.message);
  })
  .finally(() => {
    client.end();
  });
