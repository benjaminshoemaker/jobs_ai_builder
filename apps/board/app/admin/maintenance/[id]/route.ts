import {auth,isAdmin} from '../../../../src/auth';
import {adminPage} from '../../../../src/admin-page';
import {database} from '../../../../src/store';
import {sameOrigin} from '../../../../src/request';
import {escapeHtml as esc} from '../../../../src/web';
import {loadReview,commitReview,saveDraftForm} from '../../../../src/editorial-store';
import {prepareListing} from '../../../../src/listing-preparation';
import {recheckListing} from '../../../../src/editorial-actions';
import {editorialPage} from '../../../../src/editorial-page';
import {ReviewActionSchema,ReviewError} from '../../../../src/editorial-review';
export const dynamic='force-dynamic';
export const maxDuration=60;
type Context={params:Promise<{id:string}>};
export async function GET(request:Request,context:Context){
  try{
    const {data}=await auth().getSession();
    if(!data?.user)return Response.redirect(new URL('/admin/login',request.url),303);
    if(!isAdmin(data.user))return adminPage('<h1>Editorial access is restricted</h1>',403);
    const {id}=await context.params,row=await loadReview(database(),id);
    if(!row)return adminPage('<h1>Listing not found</h1>',404);
    if(row.record.status!=='draft'||row.decision!=='approved')return adminPage('<h1>This listing is not awaiting reconciliation</h1><p><a href="/admin/maintenance">Return to listing issues</a></p>',409);
    return editorialPage(row,Date.now(),new URL(request.url).searchParams.get('auto')==='failed');
  }catch{return adminPage('<h1>Review temporarily unavailable</h1>',503);}
}
export async function POST(request:Request,context:Context){
  if(!sameOrigin(request))return adminPage('<h1>Request rejected</h1>',403);
  try{
    const {data}=await auth().getSession();
    if(!data?.user||!isAdmin(data.user))return adminPage('<h1>Editorial access is restricted</h1>',403);
    const {id}=await context.params,form=Object.fromEntries(await request.formData());
    if(form.action==='prepare'||form.action==='recheck'){
      const client=await database().connect();
      try{if(form.action==='recheck')await recheckListing(client,id);else await prepareListing(client,id,data.user.id,{model:process.env.BOARD_CLASSIFIER_MODEL,apiKey:process.env.OPENAI_API_KEY});}finally{client.release();}
      return Response.redirect(new URL('/admin/maintenance/'+id+'?saved='+form.action,request.url),303);
    }
    const saveOnly=form.action==='save';
    const action=ReviewActionSchema.safeParse(saveOnly?{...form,action:'approve',note:form.note||'Saved draft fields without publication'}:form);
    if(!action.success)return adminPage('<h1>Review not saved</h1><p>A decision, review note, and valid source version are required.</p><p>Use your browser’s back button to keep your edits.</p>',422);
    const client=await database().connect();
    try{
      await client.query('begin');
      if(saveOnly)await saveDraftForm(client,id,action.data,form,data.user.id);else await commitReview(client,id,action.data,form,data.user.id);
      await client.query('commit');
    }catch(error){await client.query('rollback');throw error;}finally{client.release();}
    return Response.redirect(new URL(saveOnly?'/admin/maintenance/'+id+'?saved=draft':'/admin/maintenance?saved='+action.data.action,request.url),303);
  }catch(error){
    if(error instanceof ReviewError)return adminPage(`<h1>Review not saved</h1><p>${esc(error.message)}</p><p>Use your browser’s back button to keep your edits, or <a href="/admin/maintenance">return to listing issues</a> to reload current evidence.</p>`,error.status);
    return adminPage('<h1>Review could not be saved</h1><p>No partial decision was applied. Please try again.</p>',503);
  }
}
