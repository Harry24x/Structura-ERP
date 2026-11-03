import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceWithoutStepEvidence} from '../lib/source-coverage.mjs';
import {isResponsibilityConflict,translate} from '../lib/i18n.mjs';
import {processInstructions} from '../lib/process-prompt.mjs';

test('coverage review finds a missing invoice sentence and excludes future payment plans from as-is',()=>{
  const process={
    mode:'as-is',
    source:'The buyer sends a parts request by phone or email. The supplier sends the invoice to Finance.\n\nFuture needs: Automate payment for matched invoices.',
    nodes:[{type:'activity',evidence:'sends a parts request'}],
  };
  assert.deepEqual(sourceWithoutStepEvidence(process),['The supplier sends the invoice to Finance.']);
});

test('responsibility conflicts remain distinct from missing role questions in every locale',()=>{
  for(const locale of ['en','et','fr','de']){
    const prefix=translate(locale,'Responsibility conflict')+':';
    assert.ok(processInstructions(locale).includes(prefix));
    assert.ok(isResponsibilityConflict({kind:'role',text:prefix+' CFO vs. plant manager above 5,000 €'}));
    assert.ok(!isResponsibilityConflict({kind:'role',text:'Who approves the request?'}));
  }
});
