import fetch from 'node-fetch';

const SUPABASE_URL = 'https://waeyfjvwhhnwqregofda.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhZXlmanZ3aGhud3FyZWdvZmRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDgxODUsImV4cCI6MjA4NjU4NDE4NX0.3RrL31r0V8IKC-VXFGdlXtfZffPJr48hAaXql0GTfdw';

async function testQuery() {
    const selectQuery = '*,supplier_category_relations(is_primary,app_supplier_categories(id,name,color,icon))';
    const url = `${SUPABASE_URL}/rest/v1/app_suppliers?select=${encodeURIComponent(selectQuery)}&deleted_at=is.null&order=created_at.desc&limit=1`;

    const res = await fetch(url, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });

    const json = await res.json();
    console.log('GET app_suppliers result:');
    console.log(JSON.stringify(json, null, 2));

    const selectQuery2 = 'app_supplier_categories(name,color),app_suppliers!inner(id)';
    const url2 = `${SUPABASE_URL}/rest/v1/app_supplier_category_relations?select=${encodeURIComponent(selectQuery2)}&app_suppliers.deleted_at=is.null&limit=1`;

    const res2 = await fetch(url2, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
        }
    });

    const json2 = await res2.json();
    console.log('\nGET app_supplier_category_relations result:');
    console.log(JSON.stringify(json2, null, 2));

    // let's fetch definition if possible
    const url3 = `${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_KEY}`;
    const res3 = await fetch(url3, {
        headers: {
            'Accept': 'application/openapi+json'
        }
    });
    const openapi = await res3.json();

    if (openapi.definitions) {
        console.log('\nDefinitions for app_suppliers:', Object.keys(openapi.definitions).filter(k => k.includes('supplier')));
        if (openapi.definitions.app_suppliers) {
            console.log(JSON.stringify(openapi.definitions.app_suppliers, null, 2));
        }
        if (openapi.definitions.app_supplier_category_relations) {
            console.log(JSON.stringify(openapi.definitions.app_supplier_category_relations, null, 2));
        }
    }
}

testQuery().catch(console.error);
