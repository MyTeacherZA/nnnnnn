import dotenv from 'dotenv';

dotenv.config();

const MODE = (process.env.PAYPAL_MODE || 'sandbox').toLowerCase();
const BASE = MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

async function token() {
  const id = process.env.PAYPAL_CLIENT_ID || '';
  const secret = process.env.PAYPAL_CLIENT_SECRET || '';
  const basic = Buffer.from(`${id}:${secret}`).toString('base64');
  const r = await fetch(`${BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  });
  const j: any = await r.json();
  if (!j.access_token) throw new Error(j.error_description || 'auth failed');
  return j.access_token;
}

async function main() {
  const t = await token();
  // Create product
  const prodRes = await fetch(`${BASE}/v1/catalogs/products`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'MyTutorZA Subscription',
      description: 'AI tutor subscription',
      type: 'SERVICE',
      category: 'EDUCATION_AND_TRAINING_SERVICES',
    }),
  });
  const product: any = await prodRes.json();
  const productId = product.id;
  console.log('Product ID:', productId);

  const plans = [
    { key: 'PAYPAL_PLAN_WEEKLY_USD', name: 'Weekly USD', price: '2.99', currency: 'USD', interval: 'WEEK', count: 1 },
    { key: 'PAYPAL_PLAN_MONTHLY_USD', name: 'Monthly USD', price: '10.99', currency: 'USD', interval: 'MONTH', count: 1 },
    { key: 'PAYPAL_PLAN_WEEKLY_GBP', name: 'Weekly GBP', price: '2.50', currency: 'GBP', interval: 'WEEK', count: 1 },
    { key: 'PAYPAL_PLAN_MONTHLY_GBP', name: 'Monthly GBP', price: '10.50', currency: 'GBP', interval: 'MONTH', count: 1 },
  ];

  for (const p of plans) {
    const r = await fetch(`${BASE}/v1/billing/plans`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: productId,
        name: p.name,
        description: p.name,
        billing_cycles: [
          {
            frequency: { interval_unit: p.interval, interval_count: p.count },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: { fixed_price: { value: p.price, currency_code: p.currency } },
          },
        ],
        payment_preferences: { auto_bill_outstanding: true, setup_fee_failure_action: 'CONTINUE', payment_failure_threshold: 3 },
      }),
    });
    const j: any = await r.json();
    console.log(`${p.key}=${j.id}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
