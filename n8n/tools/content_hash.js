// Print n8n contentHash (src/common.js) for Messages rows of a sheet dump.  Usage: node tools/content_hash.js sheet.json M004 M009 ...
const fs = require('fs'), path = require('path'), vm = require('vm');
const common = fs.readFileSync(path.join(__dirname, '..', 'src', 'common.js'), 'utf8').replace('__SHEET_ID__', 'x').replace('__PLAYBOOK__', '{}');
const ctx = { DateTime: require(path.join(__dirname, '..', 'tests', 'node_modules', 'luxon')).DateTime };
vm.runInNewContext(common + '\nthis.contentHash = contentHash;', ctx);
const tabs = require(path.resolve(process.argv[2])); const [h, ...rows] = tabs.Messages;
const want = new Set(process.argv.slice(3));
for (const r of rows) { const m = Object.fromEntries(h.map((k, i) => [k, r[i] ?? ''])); if (!want.size || want.has(m.msg_id)) console.log(m.msg_id, ctx.contentHash(m)); }
