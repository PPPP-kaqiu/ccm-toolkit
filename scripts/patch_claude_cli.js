const fs = require('fs');
const path = require('path');

const cliPath = process.argv[2];
if (!cliPath) {
  console.error('Usage: node patch_claude_cli.js <path_to_cli.js>');
  process.exit(1);
}

if (!fs.existsSync(cliPath)) {
  console.error(`File not found: ${cliPath}`);
  process.exit(1);
}

console.error(`Reading ${cliPath}...`);
let content = fs.readFileSync(cliPath, 'utf8');

let patchCount = 0;

// 1. Patch j9 (JSON parsing) to strip markdown code blocks
const j9Original = 'j9=KA((A,q=!0)=>{if(!A)return null;try{return JSON.parse(Tw1(A))}catch(K){if(q)K1(K);return null}});';
const j9Patched = 'if(typeof A==="string")A=A.replace(/^[\\s\\n]*```json[\\s\\n]*/,"").replace(/^[\\s\\n]*```[\\s\\n]*/,"").replace(/[\\s\\n]*```[\\s\\n]*$/,"");';

if (content.includes(j9Patched)) {
    console.error('✓ j9 (JSON parsing) already patched');
} else if (content.includes(j9Original)) {
    const j9Replacement = 'j9=KA((A,q=!0)=>{if(!A)return null;if(typeof A==="string")A=A.replace(/^[\\s\\n]*```json[\\s\\n]*/,"").replace(/^[\\s\\n]*```[\\s\\n]*/,"").replace(/[\\s\\n]*```[\\s\\n]*$/,"");try{return JSON.parse(Tw1(A))}catch(K){if(q)K1(K);return null}});';
    content = content.replace(j9Original, j9Replacement);
    console.error('✅ Patched j9 (JSON parsing)');
    patchCount++;
} else {
    console.error('⚠️ j9 pattern not found (code may have changed)');
}

// 2. Patch JT6 type validation to handle edge cases
const jt6TypeCheckOriginal = 'if(typeof Y.input!==\"string\"&&!WO(Y.input))throw Error(\"Tool use input must be a string or object\");';
const jt6TypeCheckPatched = 'if(!Y.input||typeof Y.input===\"number\"||typeof Y.input===\"boolean\")Y.input=\"{}\";if(typeof Y.input!==\"string\"&&!WO(Y.input))throw Error(\"Tool use input must be a string or object\");';

if (content.includes(jt6TypeCheckPatched)) {
    console.error('✓ JT6 type validation already patched');
} else if (content.includes(jt6TypeCheckOriginal)) {
    content = content.replace(jt6TypeCheckOriginal, jt6TypeCheckPatched);
    console.error('✅ Patched JT6 type validation');
    patchCount++;
} else {
    console.error('⚠️ JT6 type validation pattern not found');
}

// 3. Upgrade TaskOutput.call - detect old patch and upgrade to intelligent matching
const taskOutputOldPatch = /STARS=\(await (.{1,3})\.getAppState\(\)\)\.tasks,(.{1,3})=STARS\?\.\[(.{1,3})\];if\(!\2\)\{for\(let k in STARS\)if\(STARS\[k\]\.agentId===\3\|\|STARS\[k\]\.agentName===\3\)\{\2=STARS\[k\];\3=k;break\}\}/;
const taskOutputIntelligentMarker = 'extractedName=tmpId.split';

if (content.includes(taskOutputIntelligentMarker)) {
    console.error('✓ TaskOutput.call already patched (intelligent matching)');
} else if (content.match(taskOutputOldPatch)) {
    console.error('🔄 Upgrading TaskOutput.call to intelligent matching...');
    content = content.replace(taskOutputOldPatch, (match, p1, p2, p3) => {
        return `STARS=(await ${p1}.getAppState()).tasks,${p2}=STARS?.[${p3}],tmpId=String(${p3}||"");if(!${p2}&&tmpId){let extractedName=tmpId.split("@")[0].split("/").pop();for(let k in STARS){let t=STARS[k];if(t.agentName===extractedName||t.agentId===extractedName||k===extractedName||t.agentName===tmpId||t.agentId===tmpId){${p2}=t;${p3}=k;break}}}`;
    });
    console.error('✅ Upgraded TaskOutput.call to intelligent matching');
    patchCount++;
} else {
    // Try original pattern (not yet patched)
    const taskOutputOriginal = /async call\((.{1,3}),(.{1,3}),(.{1,3}),(.{1,3}),(.{1,3})\)\{let\{task_id:(.{1,3}),block:(.{1,3}),timeout:(.{1,3})\}=\1,(.{1,3})=\(await \2\.getAppState\(\)\)\.tasks\?\.\[\\6\];if\(!\9\)throw Error\(`No task found with ID: \$\{\\6\}`\);/;
    if (content.match(taskOutputOriginal)) {
        content = content.replace(taskOutputOriginal, (match, p1, p2, p3, p4, p5, p6, p7, p8, p9) => {
            return `async call(${p1},${p2},${p3},${p4},${p5}){if(typeof ${p1}==="string")${p1}={task_id:${p1}};let{task_id:${p6},block:${p7},timeout:${p8}}=${p1},STARS=(await ${p2}.getAppState()).tasks,${p9}=STARS?.[${p6}],tmpId=String(${p6}||"");if(!${p9}&&tmpId){let extractedName=tmpId.split("@")[0].split("/").pop();for(let k in STARS){let t=STARS[k];if(t.agentName===extractedName||t.agentId===extractedName||k===extractedName||t.agentName===tmpId||t.agentId===tmpId){${p9}=t;${p6}=k;break}}}if(!${p9})throw Error(\`No task found with ID: \$\{${p6}\}\`);`;
        });
        console.error('✅ Patched TaskOutput.call (intelligent matching)');
        patchCount++;
    } else {
        console.error('⚠️ TaskOutput.call pattern not found');
    }
}

// 4. Patch SendMessage - similar logic
const sendMessageOldPatch = /STARS=\(await (.{1,3})\.getAppState\(\)\)\.tasks,(.{1,3})=STARS\?\.\[(.{1,3})\];if\(!\2\)\{for\(let k in STARS\)if\(STARS\[k\]\.agentId===\3\|\|STARS\[k\]\.agentName===\3\)\{\2=STARS\[k\];\3=k;break\}\}if\(!\2\)throw Error\(`No task found with ID: \$\{\3\}`\);/;

if (content.match(sendMessageOldPatch)) {
    console.error('🔄 Upgrading SendMessage.call to intelligent matching...');
    content = content.replace(sendMessageOldPatch, (match, p1, p2, p3) => {
        return `STARS=(await ${p1}.getAppState()).tasks,${p2}=STARS?.[${p3}],tmpId=String(${p3}||"");if(!${p2}&&tmpId){let extractedName=tmpId.split("@")[0].split("/").pop();for(let k in STARS){let t=STARS[k];if(t.agentName===extractedName||t.agentId===extractedName||k===extractedName){${p2}=t;${p3}=k;break}}}if(!${p2})throw Error(\`No task found with ID: \$\{${p3}\}\`);`;
    });
    console.error('✅ Upgraded SendMessage.call to intelligent matching');
    patchCount++;
} else {
    const sendMessageOriginal = /async call\((.{1,3}),(.{1,3}),(.{1,3}),(.{1,3}),(.{1,3})\)\{let\{task_id:(.{1,3}),content:(.{1,3})\}=\1,(.{1,3})=\(await \2\.getAppState\(\)\)\.tasks\?\.\[\\6\];if\(!\8\)throw Error\(`No task found with ID: \$\{\\6\}`\);/;
    if (content.match(sendMessageOriginal)) {
        content = content.replace(sendMessageOriginal, (match, p1, p2, p3, p4, p5, p6, p7, p8) => {
            return `async call(${p1},${p2},${p3},${p4},${p5}){if(typeof ${p1}==="string")${p1}={task_id:${p1},content:""};let{task_id:${p6},content:${p7}}=${p1},STARS=(await ${p2}.getAppState()).tasks,${p8}=STARS?.[${p6}],tmpId=String(${p6}||"");if(!${p8}&&tmpId){let extractedName=tmpId.split("@")[0].split("/").pop();for(let k in STARS){let t=STARS[k];if(t.agentName===extractedName||t.agentId===extractedName||k===extractedName){${p8}=t;${p6}=k;break}}}if(!${p8})throw Error(\`No task found with ID: \$\{${p6}\}\`);`;
        });
        console.error('✅ Patched SendMessage.call (intelligent matching)');
        patchCount++;
    } else {
        console.error('⚠️ SendMessage.call pattern not found');
    }
}

// Write back
if (patchCount > 0) {
    // Create backup
    const backupPath = cliPath + '.bak';
    if (!fs.existsSync(backupPath)) {
        fs.copyFileSync(cliPath, backupPath);
        console.error(`📦 Created backup: ${backupPath}`);
    }
    
    fs.writeFileSync(cliPath, content);
    console.error(`✅ Successfully applied ${patchCount} patch(es) to ${cliPath}`);
} else {
    console.error('Notice: This file appears to be already patched for StepFun compatibility.');
}
