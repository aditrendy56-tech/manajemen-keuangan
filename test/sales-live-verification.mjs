import assert from 'node:assert/strict';

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function json(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { res, data };
}

async function main() {
  console.log('== Sales live verification ==');

  const outlets = await json(`${baseUrl}/api/outlets`);
  console.log('GET /api/outlets =>', outlets.res.status, Array.isArray(outlets.data) ? outlets.data.length : 'n/a');
  assert.equal(outlets.res.status, 200, 'outlets should respond 200');
  const outlet = Array.isArray(outlets.data) ? outlets.data[0] : null;
  assert.ok(outlet?.id, 'expected one outlet id');

  const sessions = await json(`${baseUrl}/api/sessions?outlet_id=${outlet.id}`);
  console.log('GET /api/sessions =>', sessions.res.status, Array.isArray(sessions.data?.sessions) ? sessions.data.sessions.length : 'n/a');
  assert.equal(sessions.res.status, 200, 'sessions should respond 200');
  const session = Array.isArray(sessions.data?.sessions) ? sessions.data.sessions.find((item) => item.status === 'open') : null;
  assert.ok(session?.id, 'expected an open session id');

  const products = await json(`${baseUrl}/api/products?outlet_id=${outlet.id}`);
  console.log('GET /api/products =>', products.res.status, Array.isArray(products.data) ? products.data.length : 'n/a');
  assert.equal(products.res.status, 200, 'products should respond 200');
  const product = Array.isArray(products.data) ? products.data[0] : null;
  assert.ok(product?.id, 'expected one product id');

  const offlineSale = await json(`${baseUrl}/api/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: session.id,
      outlet_id: outlet.id,
      channel_type: 'offline',
      payment_method: 'cash',
      gross_amount: 15000,
      net_revenue: 15000,
      items: [{ product_id: product.id, quantity: 1, unit_price: product.price_offline || 15000 }],
      notes: 'live verification offline',
    }),
  });
  console.log('POST /api/sales offline =>', offlineSale.res.status, 'id=' + (offlineSale.data?.id || 'n/a'));
  assert.equal(offlineSale.res.status, 201, 'offline sale should create');

  const customSale = await json(`${baseUrl}/api/sales/custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: session.id,
      outlet_id: outlet.id,
      product_id: product.id,
      quantity: 1,
      custom_price: 12000,
      custom_description: 'live verification custom',
    }),
  });
  console.log('POST /api/sales/custom =>', customSale.res.status, 'id=' + (customSale.data?.data?.id || 'n/a'));
  assert.equal(customSale.res.status, 201, 'custom sale should create');

  const splitSale = await json(`${baseUrl}/api/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: session.id,
      outlet_id: outlet.id,
      channel_type: 'offline',
      payment_method: 'split',
      gross_amount: 25000,
      net_revenue: 25000,
      items: [{ product_id: product.id, quantity: 1, unit_price: product.price_offline || 15000 }],
      payment_entries: [
        { payment_method: 'cash', amount: 15000, payment_status: 'settled' },
        { payment_method: 'qris', amount: 10000, payment_status: 'settled' },
      ],
      notes: 'live verification split',
    }),
  });
  console.log('POST /api/sales split =>', splitSale.res.status, 'id=' + (splitSale.data?.id || 'n/a'));
  assert.equal(splitSale.res.status, 201, 'split sale should create');

  const onlineSale = await json(`${baseUrl}/api/sales`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      session_id: session.id,
      outlet_id: outlet.id,
      channel_type: 'online',
      platform: 'gofood',
      payment_method: 'cash',
      gross_amount: 20000,
      net_revenue: 15000,
      items: [{ product_id: product.id, quantity: 1, unit_price: 20000 }],
      notes: 'live verification online',
    }),
  });
  console.log('POST /api/sales online =>', onlineSale.res.status, 'id=' + (onlineSale.data?.id || 'n/a'));
  assert.equal(onlineSale.res.status, 201, 'online sale should create');

  console.log('All live sales checks passed.');
}

main().catch((error) => {
  console.error('Verification failed:', error);
  process.exit(1);
});
