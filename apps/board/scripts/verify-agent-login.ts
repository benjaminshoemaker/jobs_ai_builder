import {chromium} from '@playwright/test';

if (!process.argv.includes('--local') || process.env.VERCEL || process.env.NODE_ENV === 'production' ||
    !process.env.DATABASE_URL?.includes('ep-spring-waterfall-arjlg8fy') ||
    process.env.BOARD_ADMIN_EMAIL !== 'agent-login@jobs-ai-builder.test' ||
    !process.env.BOARD_AGENT_PASSWORD) {
  throw new Error('Local isolated agent login configuration required');
}

const browser = await chromium.launch({channel:'chrome',headless:true});
const origin = process.env.BOARD_TEST_ORIGIN ?? 'http://localhost:8780';
if (!/^http:\/\/(?:localhost|127\.0\.0\.1):\d+$/.test(origin)) throw new Error('Local test origin required');
try {
  const page = await browser.newPage();
  await page.goto(`${origin}/admin/login`);
  await page.getByLabel('Email').fill(process.env.BOARD_ADMIN_EMAIL);
  await page.getByLabel('Password').fill(process.env.BOARD_AGENT_PASSWORD);
  await page.getByRole('button',{name:'Sign in'}).click();
  await page.getByRole('heading',{name:'Admin home'}).waitFor({timeout:10000}).catch(async(error)=>{console.error(JSON.stringify({url:page.url(),body:(await page.locator('body').innerText()).slice(0,300)}));throw error;});
  await page.getByRole('navigation',{name:'Admin pages'}).getByRole('link',{name:'Review jobs'}).waitFor({timeout:10000});
  await page.goto(`${origin}/admin/daily`);
  await page.getByRole('heading',{name:'Today’s overview'}).waitFor({timeout:10000});
  await page.getByRole('navigation',{name:'Admin pages'}).getByRole('link',{name:'Today’s overview'}).getAttribute('aria-current').then(value=>{if(value!=='page')throw new Error('Today navigation is not active');});
  await page.goto(`${origin}/admin/discovery`);
  await page.getByRole('heading',{name:'Review jobs'}).waitFor({timeout:10000});
  for(const cue of ['Problem judgment','Personal building','AI used in that building','Delivery and learning'])await page.getByText(cue,{exact:false}).first().waitFor({timeout:10000});
  await page.getByText('Yes verifies the employer posting and listing fields').waitFor({timeout:10000});
  await page.goto(`${origin}/admin/maintenance/candidate-073d8abc5732031bfcc2d99892de5f74`);
  await page.getByRole('heading',{name:/OpenArt/}).waitFor({timeout:10000});
  await page.getByRole('heading',{name:'Why this role is still hidden'}).waitFor({timeout:10000});
  if(await page.getByLabel('Company name').isVisible())throw new Error('Manual fields should be collapsed until needed');
  if(process.argv.includes('--screenshot'))await page.screenshot({path:'/tmp/jobs-ai-builder-listing-exception.png',fullPage:true});
  await page.getByText('Manually resolve listing fields').click();
  await page.getByLabel('Company name').waitFor({timeout:10000});
  for (const name of ['company','focus','gate','payMin','payMax']) {
    if (await page.locator(`[name="${name}"]`).count()!==1) throw new Error(`Missing editable ${name} field`);
  }
  for (const action of ['prepare','recheck','save','approve','withdraw']) {
    if (await page.locator(`button[name="action"][value="${action}"]`).count()!==1) throw new Error(`Missing ${action} control`);
  }
  console.log(JSON.stringify({signedIn:true,dailyStatus:true,reviewQueue:true,editor:'OpenArt',editableFields:true,reviewControls:true,source:'isolated local Neon branch'}));
} finally {
  await browser.close();
}
