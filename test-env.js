import fs from 'fs';
console.log(fs.readFileSync('.env', 'utf8').includes('DATABASE_URL'));
