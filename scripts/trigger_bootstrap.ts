import fs from 'fs';

async function run() {
  const data = JSON.parse(fs.readFileSync('bootstrap_data.json', 'utf8'));
  const res = await fetch('http://localhost:3000/api/dev/bootstrap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data: data.data })
  });
  console.log(await res.json());
}

run();
