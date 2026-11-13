import {Client} from 'pg';
import {runPipeline,type Phase} from '../src/pipeline.js';
if(!process.argv.includes('--live')||process.env.VERCEL_ENV==='production'||!process.env.DATABASE_URL_UNPOOLED)throw new Error('Explicit configured preview --live required');
const phase=process.argv[process.argv.indexOf('--phase')+1] as Phase;if(!['collect','assess','stage','maintain','resume'].includes(phase))throw new Error('Choose --phase collect|assess|stage|maintain|resume');
const c=new Client({connectionString:process.env.DATABASE_URL_UNPOOLED});await c.connect();try{console.log(JSON.stringify(await runPipeline(c,{phase,actor:'manual-cli',limit:3},{model:process.env.BOARD_CLASSIFIER_MODEL,apiKey:process.env.OPENAI_API_KEY})));}finally{await c.end();}
