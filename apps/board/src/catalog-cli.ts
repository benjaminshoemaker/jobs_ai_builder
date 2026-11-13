import { readFile,writeFile,rename } from 'node:fs/promises';
import { resolve,dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readCatalog,CatalogSchema } from './catalog.js';
const file=resolve(dirname(fileURLToPath(import.meta.url)),'../catalog/jobs.json');
const [action='check',id,verifiedAt]=process.argv.slice(2);
try{
 const jobs=await readCatalog(file);
 if(action==='check')console.log(`Valid catalog: ${jobs.length} records; ${jobs.filter(j=>j.status==='published').length} published.`);
 else if(['publish','close','draft'].includes(action)){
  const job=jobs.find(job=>job.id===id);if(!job)throw new Error('Unknown job ID');
  if(action==='publish'){
   if(!verifiedAt||!Number.isFinite(Date.parse(verifiedAt))||Date.now()-Date.parse(verifiedAt)>7*86400000||Date.parse(verifiedAt)>Date.now())throw new Error('Publish requires a fresh employer verification timestamp (ISO, within seven days). Verify source status and content before recording it.');
   job.checkedAt=verifiedAt;job.status='published';
  }else job.status=action==='close'?'closed':'draft';
  CatalogSchema.parse(jobs);const temp=file+'.tmp';await writeFile(temp,JSON.stringify(jobs,null,2)+'\n');await rename(temp,file);console.log(`${job.id}: ${job.status}`);
 }else if(action==='feedback'){
  const feedback=resolve(dirname(file),'../../../data/board/feedback.jsonl');console.log(await readFile(feedback,'utf8'));
 }else throw new Error('Usage: catalog check | publish <id> <verified-at-ISO> | close <id> | draft <id> | feedback');
}catch(error){console.error(error instanceof Error?error.message:'Catalog operation failed');process.exitCode=1;}
