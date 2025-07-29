import fetch from 'node-fetch';

async function testProductDetail() {
  const sku = '302120'; // Change to a SKU that exists in your DB for testing
  const res = await fetch('http://localhost:5000/api/openProductDetail', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sku })
  });
  const data = await res.json();
  console.log('Product detail response:', data);
}

testProductDetail();
