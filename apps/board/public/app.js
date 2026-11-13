import {matchesJob,matchesBaseFilters,locationOptions} from '/filters.js';
async function start(){
 const response=await fetch('/api/jobs');if(!response.ok)throw new Error('Could not load roles');
 const {jobs,notice}=await response.json();document.getElementById('board-notice').textContent=notice;document.getElementById('board-notice').hidden=!notice;
 let initialFlags=[];try{const feedback=await fetch('/api/feedback');if(feedback.ok)initialFlags=(await feedback.json()).urls;}catch{document.getElementById('feedback-status').textContent='Saved feedback is temporarily unavailable.';}
    const cards = document.getElementById('cards');
    const count = document.getElementById('result-count');
    const flagged = new Set(initialFlags);
    const allLocations=locationOptions(jobs);
    let selectedCities=new Set(allLocations.map(option=>option.key));
    let availableLocations=allLocations;
    const esc = value => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
    function render() {
      const focus = document.getElementById('focus-filter').value;
      const gate = document.getElementById('gate-filter').value;
      const query = document.getElementById('job-search').value.trim().toLowerCase();
      const salary=Number(document.getElementById('salary-filter').value), unknownPay=document.getElementById('unknown-pay').checked, includeRemote=document.getElementById('include-remote').checked;
      const filters={focus,gate,query,salary,unknownPay,includeRemote,cities:[...selectedCities]};
      const eligible=jobs.filter(job=>matchesBaseFilters(job,filters));
      availableLocations=locationOptions(eligible);
      document.getElementById('location-options').innerHTML=availableLocations.length?availableLocations.map(option=>`<label><input type="checkbox" data-city="${esc(option.key)}" ${selectedCities.has(option.key)?'checked':''}><span>${esc(option.city)} <small>${option.arrangement==='Onsite'?'Onsite':'Hybrid'} · ${option.count}</small></span></label>`).join(''):'<p class="filter-help">No cities match the other filters.</p>';
      const selectedCount=availableLocations.filter(option=>selectedCities.has(option.key)).length;
      document.getElementById('location-summary').textContent=!availableLocations.length?'No cities available':selectedCount===availableLocations.length?'All cities':selectedCount?`${selectedCount} locations selected`:'No cities selected';
      const shown=eligible.filter(job=>matchesJob(job,filters));
      document.getElementById('reset-filters').hidden=focus==='all'&&gate==='all'&&selectedCities.size===allLocations.length&&!query&&!salary&&!unknownPay&&includeRemote;
      cards.setAttribute('aria-busy','false');
      count.textContent = `${shown.length} ${shown.length===1?'U.S. role':'U.S. roles'}`;
      cards.innerHTML = shown.length ? shown.map(job => `
        <article class="job-card">
          <div class="card-main">
            <div class="company-line"><img class="company-logo" src="${esc(job.logo)}" alt="" width="36" height="36" loading="lazy">${esc(job.company)}</div>
            <h3>${esc(job.title)}</h3>
            <div class="card-facts"><p class="location-line">${esc(job.workplace)}</p><p class="pay-line${job.pay==='Salary not listed'?' unlisted':''}">${esc(job.pay)}</p></div>
            <div class="tags"><span class="tag focus">${esc(job.focus)} focus</span><span class="tag">${esc(job.gateLabel)}</span></div>
          </div>
          <div class="card-side">
            <a class="apply-action" href="${esc(job.url)}" target="_blank" rel="noopener noreferrer" aria-label="Apply on company site for ${esc(job.title)} at ${esc(job.company)}">Apply on company site</a>
            <button class="details-action" type="button" data-details="${esc(job.company)}" aria-haspopup="dialog">View Role Details</button>
            <button class="feedback-action" type="button" data-flag="${esc(job.url)}" aria-pressed="${flagged.has(job.url)}" title="Flag this role for editorial review"><svg class="feedback-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 14V2M21 2h-4v12h4zM17 14l-5 7a3 3 0 0 1-2-3l1-4H5a2 2 0 0 1-2-2l1-8a2 2 0 0 1 2-2h11"/></svg>${flagged.has(job.url)?'Undo flag':'Not a builder job?'}</button>
            ${flagged.has(job.url)?'<p class="flag-note">Sent for editorial review.</p>':''}
          </div>
        </article>`).join('') : '<div class="empty">No roles match those filters. Try another search, focus, experience requirement, or work arrangement.</div>';
    }
    document.querySelector('.mobile-filter-toggle').addEventListener('click',event=>{ const expanded=document.querySelector('.sidebar').classList.toggle('expanded'); event.currentTarget.setAttribute('aria-expanded',String(expanded)); });
    document.querySelectorAll('select, #unknown-pay, #include-remote').forEach(input=>input.addEventListener('change',()=>{saveFilters();render();}));
    document.getElementById('job-search').addEventListener('input',()=>{saveFilters();render();});
    document.getElementById('location-options').addEventListener('change',event=>{const key=event.target.dataset.city;if(!key)return;if(event.target.checked)selectedCities.add(key);else selectedCities.delete(key);saveFilters();render();[...document.querySelectorAll('[data-city]')].find(input=>input.dataset.city===key)?.focus();});
    document.getElementById('select-all-cities').addEventListener('click',()=>{availableLocations.forEach(option=>selectedCities.add(option.key));saveFilters();render();});
    document.getElementById('clear-cities').addEventListener('click',()=>{selectedCities.clear();saveFilters();render();});
    function formatEmployerPosting(html) {
      const source = new DOMParser().parseFromString(html, 'text/html');
      const sections = [];
      let current = { title:'Overview', parts:[] };
      for (const node of source.body.childNodes) {
        const heading = node.nodeType===1 && (/^H[1-6]$/.test(node.tagName) || (node.tagName==='P' && node.children.length===1 && node.firstElementChild.tagName==='STRONG' && node.textContent.trim()===node.firstElementChild.textContent.trim()));
        if (heading) {
          if (current.title!=='Overview' && !current.parts.length) { current.parts.push(node.outerHTML); continue; }
          if (current.parts.length) sections.push(current);
          current={title:node.textContent.trim(),parts:[]};
        } else if (node.nodeType===1) current.parts.push(node.outerHTML);
        else if (node.textContent.trim()) current.parts.push(`<p>${esc(node.textContent)}</p>`);
      }
      if (current.parts.length) sections.push(current);
      return sections.map(section=>`<details class="posting-section" ${/the role|what.*role|what you|who you|requirements|qualifications|impact|looking for/i.test(section.title)?'open':''}><summary>${esc(section.title)}</summary><div class="employer-copy">${section.parts.join('')}</div></details>`).join('');
    }
    cards.addEventListener('click', async event => {
      const flagButton=event.target.closest('button[data-flag]');
      if(flagButton){
        const url=flagButton.dataset.flag, job=jobs.find(job=>job.url===url), active=!flagged.has(url);
        flagButton.disabled=true;
        try { const response=await fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jobId:job.id,active})}); if(!response.ok)throw new Error('Could not save feedback'); if(active)flagged.add(url);else flagged.delete(url); render(); [...cards.querySelectorAll('button[data-flag]')].find(button=>button.dataset.flag===url)?.focus(); }
        catch { flagButton.disabled=false; document.getElementById('feedback-status').textContent='Could not save feedback. Please try again.'; }
        return;
      }
      const button=event.target.closest('button[data-details]');
      if(!button)return;
      const job=jobs.find(x=>x.company===button.dataset.details);
      if(!job)return;
      openJob(job);
    });
    function openJob(job){
      const employerText=({sourceUrl:job.url,html:job.descriptionHtml});
      const verifiedText=employerText?.sourceUrl===job.url ? employerText : null;
      document.getElementById('details-content').innerHTML=`
        <div class="detail-toolbar">
          <div class="company-line"><img class="company-logo" src="${esc(job.logo)}" alt="" width="36" height="36">${esc(job.company)}</div>
          <a class="dialog-link" href="${esc(job.url)}" target="_blank" rel="noopener noreferrer">Apply on company site</a>
          <button class="dialog-close" type="button" aria-label="Close details">×</button>
        </div>
        <div class="detail-body">
          <h2 id="role-details-title" tabindex="-1">${esc(job.title)}</h2>
          <dl class="detail-facts">
            <div><dt>Workplace</dt><dd>${esc(job.workplace)}</dd></div>
            <div><dt>Compensation</dt><dd>${esc(job.pay)}</dd></div>
            <div><dt>Work focus</dt><dd>${esc(job.focus)}</dd></div>
            <div><dt>Prior SWE experience</dt><dd>${esc(job.gateLabel)}</dd></div>
          </dl>
          <section class="detail-summary"><h3>Our assessment</h3><p>${esc(job.reason)}</p>
            <details><summary>Our read of the qualifications and scope</summary><p><strong>Experience:</strong> ${esc(job.qualifications)}</p><p><strong>Ownership:</strong> ${esc(job.problem)} ${esc(job.delivery)}</p><p><strong>Pay details:</strong> ${esc(job.payDetail)}</p></details>
          </section>
          <div class="posting-heading"><h3>Complete employer posting</h3><button class="expand-posting" type="button">Expand all sections</button></div>
          <p class="source-note">${verifiedText ? `From ${esc(job.company)}’s employer posting. Sections retain the employer’s wording.` : 'Employer text is unavailable in this preview.'}</p>
          ${verifiedText ? formatEmployerPosting(verifiedText.html) : ''}
          <p class="checked detail-footnote">Employer page checked ${esc(new Date(job.checkedAt).toLocaleDateString('en-US'))}. Check the company site for changes.</p>
        </div>`;
      if(location.pathname!==`/roles/${job.id}`) history.pushState({},'',`/roles/${job.id}${location.search}`);
      const dialog=document.getElementById('details');
      dialog.showModal(); dialog.scrollTop=0; dialog.querySelector('#role-details-title').focus();
    }
    document.getElementById('details').addEventListener('click',event=>{
      if(!event.target.closest('.expand-posting'))return;
      const sections=[...document.querySelectorAll('.posting-section')];
      const expand=sections.some(section=>!section.open);
      sections.forEach(section=>section.open=expand);
      event.target.textContent=expand?'Collapse all sections':'Expand all sections';
    });
    document.getElementById('details').addEventListener('toggle',event=>{
      if(!event.target.matches('.posting-section'))return;
      const sections=[...document.querySelectorAll('.posting-section')];
      document.querySelector('.expand-posting').textContent=sections.every(section=>section.open)?'Collapse all sections':'Expand all sections';
    },true);
    document.getElementById('details').addEventListener('click',event=>{if(event.target.matches('.dialog-close')||event.target.id==='details')document.getElementById('details').close();});
    const focusSelect=document.getElementById('focus-filter');
    focusSelect.innerHTML='<option value="all">All focuses</option>'+[...new Set(jobs.map(job=>job.focus))].map(focus=>`<option>${esc(focus)}</option>`).join('');
    function restoreFilters(){
      const params=new URLSearchParams(location.search);
      document.getElementById('job-search').value=params.get('q')||'';
      selectedCities=new Set(params.has('cityMode')?params.getAll('city').filter(key=>allLocations.some(option=>option.key===key)):allLocations.map(option=>option.key));
      const salary=document.getElementById('salary-filter');salary.value=params.get('salary')||'0';if(!salary.value)salary.value='0';
      document.getElementById('unknown-pay').checked=params.get('unknownPay')==='1';
      document.getElementById('include-remote').checked=params.get('includeRemote')!=='0';
      for(const key of ['focus','gate']){const select=document.getElementById(key+'-filter');select.value=params.get(key)||'all';if(!select.value)select.value='all';}
    }
    function saveFilters(){
      const params=new URLSearchParams();
      for(const [id,key] of [['job-search','q']]){const value=document.getElementById(id).value.trim();if(value)params.set(key,value);}
      for(const key of ['focus','gate']){const value=document.getElementById(key+'-filter').value;if(value!=='all')params.set(key,value);}
      const salary=document.getElementById('salary-filter').value;if(salary!=='0')params.set('salary',salary);
      if(document.getElementById('unknown-pay').checked)params.set('unknownPay','1');
      if(!document.getElementById('include-remote').checked)params.set('includeRemote','0');
      if(selectedCities.size!==allLocations.length){params.set('cityMode','selected');[...selectedCities].sort().forEach(key=>params.append('city',key));}
      history.replaceState({},'',location.pathname+(params.size?'?'+params:''));
    }
    function route(){ restoreFilters();render(); const id=location.pathname.split('/')[2];if(id){const job=jobs.find(job=>job.id===id);if(job)openJob(job);}else document.getElementById('details').close(); }
    document.getElementById('reset-filters').addEventListener('click',()=>{history.replaceState({},'',location.pathname);restoreFilters();render();});
    document.getElementById('details').addEventListener('close',()=>{if(location.pathname.startsWith('/roles/'))history.pushState({},'','/'+location.search);});
    window.addEventListener('popstate',route);
    restoreFilters();render();route();
    document.getElementById('server-role')?.remove();


}
start().catch(()=>{const cards=document.getElementById('cards');cards.setAttribute('aria-busy','false');cards.innerHTML='<p>Could not load roles. <a href="/">Try again</a>.</p>';});
