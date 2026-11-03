import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceBlocks,explicitFutureNeeds,clone,validateProcess} from '../lib/process.mjs';
import {examples} from '../lib/examples.mjs';

const headings=[
 ['en','Future requirements','Current process','Need','Clarification','Answer','Example'],
 ['et','Tulevikusoovid','Praegune töökorraldus','Vajadus','Täpsustus','Vastus','Näide'],
 ['fr','Besoins futurs','Processus actuel','Besoin','Clarification','Réponse','Exemple'],
 ['de','Zukünftige Anforderungen','Aktueller Prozess','Bedarf','Klarstellung','Antwort','Beispiel']
];
const futureText=source=>sourceBlocks(source).filter(block=>block.future).map(block=>block.text).join('\n');
const expense=()=>clone(examples.find(example=>example.id==='expense').process);

for(const [language,future,current,need,clarify,answer,example] of headings) {
 test(`${language}: numbered requirements remain future until a current section`,()=>{
  const source=`# ${future}\n1. Robot archives the form.\n\n2. Robot sends a reminder.\n\n# ${current}\nEmployee submits the form.`;
  const text=futureText(source);
  assert.ok(text.includes('Robot archives'));assert.ok(text.includes('Robot sends'));
  assert.ok(!text.includes('Employee submits'));
 });
 test(`${language}: an inline need ends at a blank paragraph and preserves quotations`,()=>{
  const source=`**${need}:** Robot archives the form.\nWith the receipt.\n\nEmployee submits the form.`;
  assert.deepEqual(explicitFutureNeeds(source),['Robot archives the form.\nWith the receipt.']);
  assert.ok(!futureText(source).includes('Employee submits'));
  assert.equal(sourceBlocks(source).map(block=>block.text).join('\n'),source);
 });
 test(`${language}: saved clarification and a new example reset the future context`,()=>{
  const source=`${future}\nPlanned automation.\n${clarify}: Who does it?\n${answer}: An employee.\n${future}\nAnother plan.\n${example} 2\nA different current process.`;
  const text=futureText(source);
  assert.ok(text.includes('Planned automation'));assert.ok(text.includes('Another plan'));
  assert.ok(!text.includes('Who does it'));assert.ok(!text.includes('An employee'));
  assert.ok(!text.includes('different current process'));
 });
 test(`${language}: a future-only quote cannot justify an as-is activity`,()=>{
  const model=expense(),node=model.nodes.find(node=>node.type==='activity');
  model.source+=`\n\n${future}:\nThe robot archives the form.`;
  node.label='Archive form';node.evidence='The robot archives the form.';
  assert.ok(validateProcess(model).errors.some(error=>error.includes('future need')));
  model.mode='to-be';assert.deepEqual(validateProcess(model).errors,[]);
 });
 test(`${language}: a repeated current fact remains valid when a need quotes it too`,()=>{
  const model=expense();model.source+=`\n\n${need}: finance reimburses the employee`;
  assert.deepEqual(validateProcess(model).errors,[]);
 });
}

test('ordinary multilingual need words do not turn current work into future requirements',()=>{
 const prose='An employee needs a receipt.\nVajadus kinnitatakse juhiga.\nLe besoin est enregistré.\nDer Bedarf wird geprüft.\nWe need to check invoices every day.';
 assert.equal(sourceBlocks(prose).length,1);assert.equal(futureText(prose),'');
});

test('nested headings stay future; a sibling heading closes the section',()=>{
 const source='## Tulevikusoovid\n### Automatiseerimine\nRobot archives the form.\n\n## Dokumendi järgmine osa\nCurrent facts.';
 assert.ok(futureText(source).includes('Robot archives'));
 assert.ok(!futureText(source).includes('Current facts'));
});

test('numbered section titles are labels while numbered future items retain their context',()=>{
 const source='2. Tulevikusoovid\n1. Robot archives the form.\n2. Robot sends a reminder.\n3. Praegune protsess\nEmployee submits the form.';
 assert.ok(futureText(source).includes('Robot sends'));
 assert.ok(!futureText(source).includes('Employee submits'));
});

test('system cards also reject multilingual future-only software evidence',()=>{
 const model=expense(),node=model.nodes.find(node=>node.type==='activity');
 model.source+='\nTulevikusoovid\nThe employee will use ArchivePro to submit the form.';
 model.systems=[{id:'archive',label:'ArchivePro'}];
 Object.assign(node,{systemId:'archive',execution:'assisted',humanDecision:null,systemEvidence:'The employee will use ArchivePro to submit the form.'});
 assert.ok(validateProcess(model).errors.some(error=>error.includes('future need')));
});
