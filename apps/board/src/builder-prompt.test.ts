import {it,expect} from 'vitest';
import {buildBuilderPromptV7,builderRequestV7,buildBuilderPromptV8,builderRequestV8,buildBuilderPromptV9,builderRequestV9,buildBuilderPromptV10,builderRequestV10,buildBuilderPromptV11,builderRequestV11,buildBuilderPromptV12,builderRequestV12} from './builder-prompt.js';
import {classificationMetrics} from './classification-metrics.js';
it('keeps target-employer examples out of a scored request and keeps metadata out of model output',()=>{
  for(const company of ['Lab37 Robotics','greenhouse:cssmerge'])expect(buildBuilderPromptV7({company}).exampleIds).not.toContain('lab37');
  expect(buildBuilderPromptV7({company:'AwardSpring'}).exampleIds).not.toContain('batch1_c08');
  const prompt=buildBuilderPromptV7({excludeExampleIds:['azul']});expect(prompt.exampleIds).not.toContain('azul');
  const request=builderRequestV7('test-model',{title:'Job',company:'Other',location:'US',description:'<p>Complete employer responsibilities and qualifications.</p>'});
  expect(JSON.parse(request.input).description).toBe('Complete employer responsibilities and qualifications.');
  expect(Object.keys(request.text.format.schema.properties)).toEqual(['decision','reason']);
  expect(request.input).not.toContain('expected');expect(request.input).not.toContain('passages');
  expect(()=>builderRequestV7('test',{title:'Job',company:'Other',location:'US',description:'x'.repeat(40001)})).toThrow('do not silently truncate');
});
it('does not inflate recall by hiding abstentions and separately exposes operational failures',()=>{
  const metrics=classificationMetrics([
    {expected:'yes',prediction:'yes',status:'succeeded',sourceComparable:true},
    {expected:'yes',prediction:'unclear',status:'succeeded',sourceComparable:true},
    {expected:'yes',prediction:null,status:'failed',sourceComparable:true},
    {expected:'no',prediction:'yes',status:'succeeded',sourceComparable:true},
    {expected:'no',prediction:'unclear',status:'succeeded',sourceComparable:true},
    {expected:'yes',prediction:'yes',status:'succeeded',sourceComparable:false},
  ]);
  expect(metrics.precision).toBe(.5);expect(metrics.recall).toBe(1/3);expect(metrics.semanticRecall).toBe(.5);
  expect(metrics.decisionCoverage).toBe(.4);expect(metrics.operationalFailures).toBe(1);expect(metrics.abstentions).toBe(2);expect(metrics.sourceUnverified).toBe(1);
  expect(classificationMetrics([]).recall).toBeNull();
});
it('preserves target-example exclusion and the small response contract in the revised candidate',()=>{
  const prompt=buildBuilderPromptV8({company:'getsquire'});
  expect(prompt.version).toBe('builder-fit-v8');
  expect(prompt.exampleIds).not.toContain('squire');
  expect(prompt.instructions).toContain('not merely participation in implementation tasks');
  const request=builderRequestV8('test-model',{title:'Role',company:'getsquire',location:'US',description:'Full employer posting'});
  expect(request.instructions).toBe(prompt.instructions);
  expect(request.text.format.schema.properties.decision.enum).toEqual(['yes','no','unclear']);
  expect(request.max_output_tokens).toBe(2000);
});
it('versions new candidates without changing frozen source input, response fields or example exclusions',()=>{
  const input={title:'Role',company:'TRM Labs',location:'US',description:'<p>The complete employer posting.</p>'};
  const previous=builderRequestV8('test-model',input);
  for(const [build,request,version] of [[buildBuilderPromptV9,builderRequestV9,9],[buildBuilderPromptV10,builderRequestV10,10],[buildBuilderPromptV11,builderRequestV11,11],[buildBuilderPromptV12,builderRequestV12,12]] as const){
    const prompt=build({company:input.company,excludeExampleIds:['azul']});
    expect(prompt.version).toBe(`builder-fit-v${version}`);
    expect(prompt.exampleIds).not.toContain('batch1_c20');
    expect(prompt.exampleIds).not.toContain('azul');
    const body=request('test-model',input,['azul']);
    expect(body.input).toBe(previous.input);
    expect(body.instructions).toBe(prompt.instructions);
    expect(body.text.format.name).toBe(`builder_fit_v${version}`);
    expect(body.text.format.schema).toEqual(previous.text.format.schema);
    expect(body.store).toBe(false);
  }
});
