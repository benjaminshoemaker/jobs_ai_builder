import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {expect,it} from 'vitest';

const script=resolve(import.meta.dirname,'../scripts/migrate.ts');
function attempt(args:string[],env:Record<string,string>={}){
  return spawnSync(process.execPath,['--import','tsx',script,...args],{
    cwd:resolve(import.meta.dirname,'..'),encoding:'utf8',
    env:{...process.env,VERCEL_ENV:'production',NEON_PROJECT_ID:'expected-project',DATABASE_URL_UNPOOLED:'postgres://invalid:invalid@127.0.0.1:1/invalid',...env},
  });
}
it('requires an explicit matching project before a Production migration can connect',()=>{
  const without=attempt(['--apply']);
  const wrong=attempt(['--apply','--production-prepare','--expected-project-id=wrong-project']);
  expect(without.status).not.toBe(0);
  expect(wrong.status).not.toBe(0);
  expect(without.stderr).toContain('explicit matching Neon project ID');
  expect(wrong.stderr).toContain('explicit matching Neon project ID');
});
it('refuses Production preparation after public launch or daily runs are enabled',()=>{
  const args=['--apply','--production-prepare','--expected-project-id=expected-project'];
  for(const flag of ['BOARD_PUBLIC_LAUNCH_ENABLED','BOARD_DAILY_RUNS_ENABLED']){
    const result=attempt(args,{[flag]:'true'});
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('before public launch or daily schedules');
  }
});
