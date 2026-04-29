const autocannon = require('autocannon');

async function run() {
  const url = 'http://localhost:3000';
  
  console.log(`Starting stress test on ${url}...`);

  const instance = autocannon({
    url: url,
    connections: 100, // number of concurrent connections
    pipelining: 1,
    duration: 10, // duration of the test in seconds
    requests: [
      {
        method: 'GET',
        path: '/health',
      },
      {
        method: 'GET',
        path: '/users',
        headers: {
          'x-user-role': 'admin'
        }
      }
    ]
  });

  autocannon.track(instance, { renderProgressBar: true });

  instance.on('done', (result) => {
    console.log('\n--- Stress Test Results ---');
    console.log(`Total Requests: ${result.requests.total}`);
    console.log(`Latency (ms) - Avg: ${result.latency.average}, p99: ${result.latency.p99}`);
    console.log(`Throughput (req/sec): ${result.requests.average}`);
    console.log(`Errors: ${result.errors}`);
    console.log(`Timeouts: ${result.timeouts}`);
    console.log('---------------------------');
    
    if (result.errors > 0 || result.timeouts > 0) {
      console.error('Stress test failed: There were errors or timeouts.');
      process.exit(1);
    } else {
      console.log('Stress test passed successfully.');
      process.exit(0);
    }
  });
}

run();
