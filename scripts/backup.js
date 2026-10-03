// Manual backup: `npm run backup`
import '../server/env.js';
const { backupNow } = await import('../server/backup.js');
console.log('Backup written to', backupNow());
