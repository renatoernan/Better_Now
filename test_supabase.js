const SUPABASE_URL = 'https://waeyfjvwhhnwqregofda.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhZXlmanZ3aGhud3FyZWdvZmRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDgxODUsImV4cCI6MjA4NjU4NDE4NX0.3RrL31r0V8IKC-VXFGdlXtfZffPJr48hAaXql0GTfdw';

async function testSelects() {
    // This is the query failing in useSupplierCategories.ts with eq.null:
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_supplier_category_relations?select=app_supplier_categories(name,color),app_suppliers!inner(id)&app_suppliers.deleted_at=eq.null&limit=1`, {
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    console.log('Failing Query Result with eq.null:', await res.json());
}
testSelects().catch(console.error);
