import {Client} from 'pg';
import {readFile,writeFile,mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {resolve,join} from 'node:path';
import {createHash} from 'node:crypto';
import {builderRequestV8,buildBuilderPromptV8} from '../src/builder-prompt.js';
const root=resolve(import.meta.dirname,'../../..');
if(process.env.VERCEL_ENV==='production'||!process.env.DATABASE_URL_UNPOOLED)throw new Error('Preview database required');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const prior=JSON.parse(await readFile(resolve(root,'research/luna-reviewed-regression-2026-10-29-v3.json'),'utf8'));
const output=await mkdtemp(join(tmpdir(),'builder-in-thread-v8-'));
const c=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await c.connect();
try{
  await c.query('begin read only');
  const cases=[];
  for(const [i,item] of prior.cases.entries()){
    const row=item.expected==='yes'?(await c.query('select snapshot from board_review_checks where id=$1 and content_hash=$2',[item.sourceId,item.sourceHash])).rows[0]:(await c.query('select snapshot from board_discovery_versions where candidate_id=$1 and content_hash=$2',[item.key,item.sourceHash])).rows[0];
    const description=row?.snapshot.descriptionHtml??row?.snapshot.text;
    if(typeof description!=='string'||hash(description)!==item.inputHash)throw new Error('Frozen source mismatch: '+item.key);
    const request=builderRequestV8('gpt-6.1-sol',{title:item.title,company:item.company,location:item.location??'',description});
    const input=JSON.parse(request.input),file=String(i+1).padStart(2,'0')+'.json';
    await writeFile(join(output,file),JSON.stringify({case:item.key,...input},null,2)+'\n');
    cases.push({key:item.key,title:item.title,company:item.company,expected:item.expected,sourceHash:item.sourceHash,inputHash:item.inputHash,normalizedInputHash:hash(request.input),comparison:item.comparison,exampleIds:buildBuilderPromptV8({company:item.company}).exampleIds,file});
  }
  await c.query('commit');
  const manifest={status:'prepared',version:'builder-fit-v8',mode:'in-thread-regression-review',model:'User-selected GPT-6.1 Sol in current desktop thread; not independently resolved through CLI',policyHash:hash(buildBuilderPromptV8().instructions),source:'Frozen 33-case v3 development set',caveat:'Conversation includes prior labels and results; not a blind or isolated model benchmark. Historical source-pairing caveats remain.',cases,missing:prior.missing};
  await writeFile(resolve(root,'research/builder-v8-in-thread-regression-2026-10-29.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify({directory:output,cases:cases.length,characters:(await Promise.all(cases.map(x=>readFile(join(output,x.file),'utf8')))).reduce((n,x)=>n+x.length,0)}));
}finally{await c.end();}
