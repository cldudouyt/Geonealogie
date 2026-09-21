import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyzeDuplicates, type Kinship } from '../src/lib/duplicate-analysis';
import type { PersonRecord } from '../src/lib/gedcom-store';
const person = (id: string, changes: Partial<PersonRecord> = {}): PersonRecord => ({id,givenNames:'Marie Louise',surname:'Martin',displayName:'Marie Louise MARTIN',sex:'F',birthYear:'1900',birthDateRaw:'1 JAN 1900',birthPlace:'Nantes',isAdopted:false,adoptiveParentIds:[],adoptedChildIds:[],occupations:[],marriedSurnames:[],events:[],...changes});
const kin: Record<string,Kinship> = Object.fromEntries(['a','b','c'].map(id=>[id,{parents:['p1','p2'],spouses:[],children:[]} ]));
test('batch eligibility requires exact identity, complete parents and no conflict',()=> {
  assert.equal(analyzeDuplicates([person('a'),person('b')],kin).pairs[0].eligible,true);
  for (const change of [{birthDateRaw:'ABT 1900'},{birthDateRaw:'31 FEB 1900'},{birthDateRaw:'2 JAN 1900'},{birthPlace:undefined},{givenNames:'Marie Jeanne'},{deathDateRaw:'1901',occupation:'Autre'}]) {
    const result = analyzeDuplicates([person('a',{occupation:'Professeure'}),person('b',change)],kin);
    assert.equal(result.pairs[0].eligible,false,JSON.stringify(change));
  }
  assert.equal(analyzeDuplicates([person('a'),person('b')],{...kin,b:{parents:['p1'],spouses:[],children:[]}}).pairs[0].eligible,false);
  assert.equal(analyzeDuplicates([person('a'),person('b')],{...kin,b:{...kin.b,spouses:['a']}}).pairs[0].eligible,false);
});
test('triples and ignored pairs are never silently included',()=> {
  assert.equal(analyzeDuplicates([person('a'),person('b'),person('c')],kin).pairs.filter(p=>p.eligible).length,0);
  const ignored=analyzeDuplicates([person('a'),person('b')],kin,['a:b']);
  assert.equal(ignored.pairs.length,0); assert.equal(ignored.ignoredCount,1);
});
