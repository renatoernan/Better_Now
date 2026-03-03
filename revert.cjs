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
        // string replacements for 'app_table' -> 'table'
        content = content.split(`.from('app_${t}')`).join(`.from('${t}')`);
        content = content.split(`.from("app_${t}")`).join(`.from("${t}")`);
        content = content.split(`.from(\`app_${t}\`)`).join(`.from(\`${t}\`)`);

        // string replacements for <Database>('app_table') -> <Database>('table')
        content = content.split(`.from<Database>('app_${t}')`).join(`.from<Database>('${t}')`);
        content = content.split(`.from<Database>("app_${t}")`).join(`.from<Database>("${t}")`);
        content = content.split(`.from<Database>(\`app_${t}\`)`).join(`.from<Database>(\`${t}\`)`);
    });

    if (content !== original) {
        fs.writeFileSync(file, content);
        changedFiles++;
        console.log('Reverted: ' + file);
    }
});

console.log('Total files reverted: ' + changedFiles);
