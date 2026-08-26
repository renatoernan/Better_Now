const SUPABASE_URL = 'https://waeyfjvwhhnwqregofda.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndhZXlmanZ3aGhud3FyZWdvZmRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwMDgxODUsImV4cCI6MjA4NjU4NDE4NX0.3RrL31r0V8IKC-VXFGdlXtfZffPJr48hAaXql0GTfdw';

async function testOrderEmail() {
  // Let's fetch the latest order in app_event_orders
  const resOrders = await fetch(`${SUPABASE_URL}/rest/v1/app_event_orders?select=*&order=created_at.desc&limit=5`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
  });
  const orders = await resOrders.json();
  console.log('Latest 5 orders:', orders.map(o => ({ id: o.id, status: o.status, client_name: o.client_name, client_email: o.client_email, created_at: o.created_at })));
}

testOrderEmail().catch(console.error);
