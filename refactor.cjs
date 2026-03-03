const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./src');
const tables = [
    'contact_forms', 'carousel_images', 'admin_users', 'activity_logs',
    'clients', 'events', 'event_types', 'suppliers', 'supplier_contacts',
    'supplier_categories', 'supplier_services', 'supplier_evaluations',
    'supplier_documents', 'testimonials', 'faqs', 'leads'
];

let changedFiles = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    tables.forEach(t => {
        // string replacements for 'table'
        content = content.split(`.from('${t}')`).join(`.from('app_${t}')`);
        content = content.split(`.from("${t}")`).join(`.from("app_${t}")`);
        content = content.split(`.from(\`${t}\`)`).join(`.from(\`app_${t}\`)`);

        // string replacements for <Database>('table')
        content = content.split(`.from<Database>('${t}')`).join(`.from<Database>('app_${t}')`);
        content = content.split(`.from<Database>("${t}")`).join(`.from<Database>("app_${t}")`);
        content = content.split(`.from<Database>(\`${t}\`)`).join(`.from<Database>(\`app_${t}\`)`);

        // Add replacements for joins in .select() strings
        // matches: "table(", " table(", "\ntable("
        const joinRegex = new RegExp('([\\s\\n,])' + t + '\\s*\\(', 'g');
        content = content.replace(joinRegex, `$1app_${t}(`);

        // Also replace references in Typescript interfaces where it makes sense? No, let's keep it safe.
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
        changedFiles++;
        console.log('Updated: ' + file);
    }
});

console.log('Total files updated: ' + changedFiles);
