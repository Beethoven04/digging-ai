// Offline Sender simulation: runs the REAL 'Pick next email' node (built workflow 3) on a sheet dump, with a fake clock,
// in LIVE mode, approving every ready row in memory. Nothing is sent and the sheet is not touched.
// Usage: node tools/sender_sim.js sheet.json [startISO] [days]
const path = require('path');
const { run, J, setNow, DateTime } = require(path.join(__dirname, '..', 'tests', 'harness.js'));
const tabs = JSON.parse(JSON.stringify(require(path.resolve(process.argv[2]))));
const start = DateTime.fromISO(process.argv[3] || '2026-11-02T08:40:00', { zone: 'Europe/Stockholm' });
const days = Number(process.argv[4] || 3);
const cfg = tabs.Config; const setCfg = (k, v) => { const r = cfg.find(x => x[0] === k); if (r) r[1] = v; else cfg.push([k, v, '']); };
setCfg('SENDING_PAUSED', 'FALSE'); setCfg('DRY_RUN', 'FALSE'); setCfg('TEST_RECIPIENT', '');
const [h, ...rows] = tabs.Messages; const col = k => h.indexOf(k);
for (const r of rows) if (r[col('status')] === 'ready') r[col('approved')] = 'TRUE';
if (!tabs.Log) tabs.Log = [['ts', 'workflow', 'level', 'event', 'msg_id', 'contact_id', 'detail']];
(async () => {
  let t = start, sent = 0;
  const end = start.plus({ days });
  while (t < end) {
    setNow(t.toISO());
    const resp = { valueRanges: ['Config', 'Contacts', 'Messages', 'Log'].map(x => ({ range: `'${x}'!A1:ZZ`, values: tabs[x] })) };
    const out = await run('3', 'Pick next email', [], { nodes: { 'Read Sheet': J([resp]) } });
    if (out.length) {
      const p = out[0].json; const r = rows.find(x => x[col('msg_id')] === p.msg.msg_id);
      r[col('status')] = 'sent'; r[col('sent_at')] = t.toISO(); r[col('to_email')] = p.realTo;
      tabs.Log.push([t.toISO(), 'Sender', 'info', 'sent', p.msg.msg_id, p.msg.contact_id, `cold → ${p.realTo}`]);
      sent++;
      console.log(`${t.toFormat('ccc dd LLL HH:mm')}  ${p.msg.msg_id}  ${p.contact.company.padEnd(28).slice(0, 28)} ${p.realTo}`);
      if (sent === 1) console.log('\n----- first email as built (MIME text part) -----\n' + p.preview + '\n-----\n');
    }
    t = t.plus({ minutes: 10 });
    if (t.hour >= 17) t = t.plus({ days: 1 }).set({ hour: 8, minute: 40 });
  }
  const left = rows.filter(r => r[col('status')] === 'ready').map(r => r[col('msg_id')]);
  console.log(`\n${sent} sent in simulation; still ready: ${left.join(' ') || 'none'}`);
})();
