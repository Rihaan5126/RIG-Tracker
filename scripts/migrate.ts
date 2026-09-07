import { database } from '../src/server/db';
const db = await database();
console.log('Database migrations applied.');
await db.close();
