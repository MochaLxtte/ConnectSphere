import { copyFile } from 'node:fs/promises';
import { constants } from 'node:fs';

try {
  await copyFile(
    new URL('../.env.example', import.meta.url),
    new URL('../.env', import.meta.url),
    constants.COPYFILE_EXCL,
  );
  console.log('Created .env. Replace the example DATABASE_URL with the team Supabase connection.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  console.log('Existing .env preserved.');
}
console.log('Configure Supabase and verified TLS using database/README.md before connecting.');
console.log('Then: npm run db:migrate, npm run db:seed (development only), npm run dev.');
