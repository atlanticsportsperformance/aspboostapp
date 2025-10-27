/**
 * Quick test of percentile API
 */

const SCOTT_ID = 'b9a7afb2-5fcd-4f83-a63b-9ea69d9fd95f';

async function test() {
  console.log('🧪 Testing Percentile API...\n');

  try {
    const response = await fetch(`http://localhost:3000/api/athletes/${SCOTT_ID}/vald/percentiles`);

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const text = await response.text();
      console.error('Error response:', text);
      return;
    }

    const data = await response.json();

    console.log('\n✅ SUCCESS!\n');
    console.log(JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

test();
