const fs = require('fs');
const http = require('http');

const swaggerPath = './docs/swagger.json';
const swaggerDoc = JSON.parse(fs.readFileSync(swaggerPath, 'utf-8'));

const paths = Object.keys(swaggerDoc.paths);
const port = 3000;

async function checkEndpoints() {
  console.log(`Found ${paths.length} endpoints in Swagger.`);
  let passed = 0;
  let failed = 0;
  let errors = [];

  for (const p of paths) {
    // Only test GET endpoints that don't have path parameters (e.g. without ':id' or '{id}')
    const methods = Object.keys(swaggerDoc.paths[p]);
    if (methods.includes('get') && !p.includes('{') && !p.includes(':')) {
      await new Promise((resolve) => {
        const req = http.get(`http://localhost:${port}${p}`, {
          headers: { 'x-user-role': 'admin' }
        }, (res) => {
          if (res.statusCode >= 500) {
            console.error(`[FAIL] GET ${p} returned ${res.statusCode}`);
            failed++;
            errors.push(p);
          } else {
            console.log(`[PASS] GET ${p} returned ${res.statusCode}`);
            passed++;
          }
          res.resume(); // consume response data to free up memory
          resolve();
        }).on('error', (e) => {
          console.error(`[ERROR] GET ${p} failed: ${e.message}`);
          failed++;
          errors.push(p);
          resolve();
        });
      });
    }
  }

  console.log(`\nVerification complete. Passed: ${passed}, Failed: ${failed}`);
  if (failed > 0) {
    console.log('Failed endpoints:', errors);
    process.exit(1);
  } else {
    process.exit(0);
  }
}

checkEndpoints();
