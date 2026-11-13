import {expect,it} from 'vitest';
import {priorSweForJob,priorSweFromSource} from './prior-swe.js';

it('uses explicit prior engineering qualifications rather than the job title',()=>{
  expect(priorSweFromSource('<p>7+ years of software engineering experience required.</p>')).toBe('required');
  expect(priorSweFromSource('<p>Software engineer role. Own customer problems and ship features.</p>')).toBe('unclear');
  expect(priorSweFromSource('<p>5+ years of engineering experience.</p>','Software Engineer')).toBe('required');
  expect(priorSweFromSource('<p>7+ years of professional frontend engineering experience.</p>')).toBe('required');
  expect(priorSweFromSource('<p>Professional software engineering experience working with PostgreSQL.</p>')).toBe('required');
  expect(priorSweFromSource('<p>You have been shipping production systems for years.</p>','Senior Software Engineer')).toBe('required');
  expect(priorSweFromSource('<p>Software engineering experience is preferred, not required.</p>')).toBe('open');
  expect(priorSweFromSource('<p>5+ years of software development experience is a plus.</p>')).toBe('open');
});
it('keeps explicit non-SWE routes and conflicting qualifications distinct',()=>{
  expect(priorSweFromSource('<p>No software engineering background required. Build with AI.</p>')).toBe('open');
  expect(priorSweFromSource('<p>Experience level: doesn\'t matter if you are exceptional.</p>','Product Engineer')).toBe('open');
  expect(priorSweFromSource('<p>No software engineering background required.</p><p>5+ years of software engineering experience required.</p>')).toBe('unclear');
  expect(priorSweForJob('5+ years of software engineering experience required.','explicit_non_swe_route')).toBe('open');
});
