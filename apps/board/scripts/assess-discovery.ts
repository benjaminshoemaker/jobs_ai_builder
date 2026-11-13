import {Client} from 'pg';
import {runPipeline} from '../src/pipeline.js';
if(!process.argv.includes('--live')||process.env.VERCEL_ENV==='production')throw new Error('Explicit preview --live required');
if(!process.env.DATABASE_URL_UNPOOLED||!process.env.OPENAI_API_KEY||!process.env.BOARD_CLASSIFIER_MODEL)throw new Error('Configure the existing model and preview credentials securely');
const i=process.argv.indexOf('--limit'),limit=i<0?5:Number(process.argv[i+1]);if(!Number.isInteger(limit)||limit<1||limit>20)throw new Error('Limit must be 1–20');
const c=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await c.connect();
try{for(let n=0;n<limit;n+=5){const r=await runPipeline(c,{phase:'assess',actor:'manual-cli',limit:Math.min(5,limit-n)},{model:process.env.BOARD_CLASSIFIER_MODEL,apiKey:process.env.OPENAI_API_KEY});console.log(JSON.stringify(r));if(!r.processed)break;}}finally{await c.end();}
