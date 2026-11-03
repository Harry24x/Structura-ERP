import {readdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

// Explicit paths work on PowerShell as well as shells that expand globs.
const directory=new URL('../tests/',import.meta.url);
const files=readdirSync(directory).filter(name=>name.endsWith('.test.mjs')).sort().map(name=>fileURLToPath(new URL(name,directory)));
const result=spawnSync(process.execPath,['--test',...process.argv.slice(2),...files],{stdio:'inherit'});
if(result.error)throw result.error;
process.exit(result.status??1);
