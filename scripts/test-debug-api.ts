async function test() {
  console.log('🧪 Testing Debug API...\n');

  const response = await fetch('http://localhost:3000/api/test-percentile-debug');
  const data = await response.json();

  console.log('Logs:');
  data.logs?.forEach((log: string) => console.log('  ' + log));

  if (data.success) {
    console.log('\n✅ SUCCESS!');
    console.log(`Percentile: ${data.percentile}`);
    console.log(`Test value: ${data.test_value}`);
  } else {
    console.log('\n❌ FAILED');
    if (data.error) {
      console.log('Error:', data.error);
    }
  }
}

test();
