// Run the real QC selector node (deterministic rules + contentHash) on a sheet dump.
// Usage: node tools/qc_local.js <sheet.json>   (sheet.json = {Tab: [[header...], [row...]]}, from tools/dump_sheet.py)
// Prints one line per draft: msg_id, words, fails, warns, hash.
const path = require('path');
const { run, J } = require(path.join(__dirname, '..', 'tests', 'harness.js'));
const tabs = require(path.resolve(process.argv[2]));
const cfg = tabs.Config; const i = cfg.findIndex(r => r[0] === 'QC_BATCH');
if (i >= 0) cfg[i][1] = '999'; else cfg.push(['QC_BATCH', '999', '']);
const resp = { valueRanges: ['Config', 'Contacts', 'Messages', 'Profile', 'Companies'].map(t => ({ range: `'${t}'!A1:ZZ`, values: tabs[t] })) };
run('2', 'Select drafts for QC', [], { nodes: { 'Read Sheet': J([resp]) } }).then(out => {
  for (const o of out) {
    const d = o.json.det;
    console.log(JSON.stringify({ msg_id: o.json.msg.msg_id, words: d.stats.words, subj: d.stats.subject_words, fails: d.fails, warns: d.warns, hash: o.json.hash }));
  }
  console.error(`${out.length} drafts checked`);
});
