import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';

const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const alias='jobs-ai-builder-editorial-preview.vercel.app';
function run(args,stdout='inherit'){
  const result=spawnSync('vercel',args,{cwd:root,encoding:'utf8',stdio:['inherit',stdout,'inherit']});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(`vercel ${args[0]} failed with exit code ${result.status}`);
  return result.stdout?.trim()??'';
}

const deployed=JSON.parse(run(['deploy','--yes','--json'],'pipe'));
const deployment=deployed.deployment;
if(deployed.status!=='ok'||deployment?.readyState!=='READY'||deployment?.target==='production'||!deployment?.deploymentProtection?.includes('vercel_authentication')){
  throw new Error('Preview deployment is not ready and protected; stable alias was not moved');
}
const url=new URL(deployment.url);
if(url.protocol!=='https:'||!url.hostname.endsWith('.vercel.app'))throw new Error('Unexpected Preview URL; stable alias was not moved');
for(const path of ['/api/jobs','/admin/login']){
  const code=run(['curl',path,'--deployment',url.href,'--','--silent','--show-error','--output','/dev/null','--write-out','%{http_code}'],'pipe');
  if(code!=='200')throw new Error(`${path} smoke check returned ${code}; stable alias was not moved`);
}
run(['alias','set',url.hostname,alias]);
console.log(`Protected Preview ready: https://${alias}`);
