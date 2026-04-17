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
    console.log('\n--- RUNNING UPDATE QUERY ---');
    return client.query("UPDATE companies SET ruc = '1104391774001' WHERE ruc = '1104391774' RETURNING id, ruc, \"razonSocial\";");
  })
  .then((result) => {
    console.log('Rows updated: ' + result.rowCount);
    if (result.rows.length > 0) {
      console.log('Updated rows:');
      result.rows.forEach(row => {
        console.log('  ID: ' + row.id + ' | RUC: ' + row.ruc + ' (Length: ' + row.ruc.length + ' digits) | Razón Social: ' + row.razonSocial);
      });
    }
    
    console.log('\n--- RUNNING SELECT QUERY TO CONFIRM ---');
    return client.query("SELECT id, ruc, \"razonSocial\" FROM companies WHERE ruc = '1104391774001';");
  })
  .then((result) => {
    console.log('Records found: ' + result.rowCount);
    if (result.rows.length === 0) {
      console.log('No results found');
    } else {
      result.rows.forEach(row => {
        console.log('  ID: ' + row.id + ' | RUC: ' + row.ruc + ' (Length: ' + row.ruc.length + ' digits) | Razón Social: ' + row.razonSocial);
      });
    }
  })
  .catch((err) => {
    console.error('Error:', err.message);
  })
  .finally(() => {
    client.end();
  });
