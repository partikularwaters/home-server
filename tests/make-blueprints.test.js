const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const load = name => JSON.parse(fs.readFileSync(path.join(__dirname,'../make',name),'utf8'));
const s1 = load('S1- Instant fulfillment.blueprint.json');
const s2 = load('S2- Scheduled engine.blueprint.json');
test('shared Make blueprints contain reconnectable placeholders rather than deployment credentials', () => {
  for (const blueprint of [s1,s2]) {
    for (const module of blueprint.flow) {
      if (module.module === 'gateway:CustomWebHook') {
        assert.equal(module.parameters.hook,0);
        continue;
      }
      assert.equal(module.mapper.url,'https://YOUR-DEPLOYMENT/api/backoffice');
      const auth = module.mapper.headers.filter(h=>h.name.toLowerCase()==='authorization');
      assert.equal(auth.length,1);
      assert.equal(auth[0].value,'Bearer YOUR_MAKE_AUTOMATION_TOKEN');
    }
  }
  assert.equal(JSON.parse(s2.flow[0].mapper.jsonStringBodyContent).demo_id,'YOUR_COCKPIT_SESSION_UUID');
});
test('two blueprints preserve webhook identity and the ordered scheduled-engine callback contract', () => {
  assert.equal(s1.metadata.instant,true);
  assert.equal(s2.metadata.instant,false);
  assert.deepEqual(s1.flow.map(m=>m.module),['gateway:CustomWebHook','http:MakeRequest']);
  const webhook = s1.flow[1].mapper.jsonStringBodyContent;
  for (const key of ['demo_id','generation','type','event_id','order_id']) assert.ok(webhook.includes('{{1.'+key+'}}'));
  assert.deepEqual(s2.flow.map(m=>JSON.parse(m.mapper.jsonStringBodyContent.replace(/{{1.data.generation}}/g,'2')).action),
    ['context','poll','reconciliation','condition','retry']);
  assert.deepEqual(s2.flow[1].filter.conditions,[[{a:'{{1.data.mode}}',b:'live',o:'text:equal'}]]);
  for (const module of s2.flow.slice(1)) assert.ok(module.mapper.jsonStringBodyContent.includes('"generation": {{1.data.generation}}'));
});
