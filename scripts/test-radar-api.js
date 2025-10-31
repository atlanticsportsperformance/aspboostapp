/**
 * Test the radar API endpoint
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

async function testRadarAPI() {
  const athleteId = 'fc6ad90a-0db4-459d-b34a-9e9a68f00b8e'; // Cameron

  console.log('\n📊 Testing Radar API Endpoint\n');
  console.log('='.repeat(80));

  const response = await fetch(`http://localhost:3000/api/athletes/${athleteId}/vald/charts/radar`);

  if (!response.ok) {
    console.error(`❌ API Error: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.error(text);
    return;
  }

  const data = await response.json();

  console.log('\n✅ API Response:\n');
  console.log(JSON.stringify(data, null, 2));

  console.log('\n' + '='.repeat(80));
  console.log('\n📋 Analysis:\n');

  console.log(`Composite Score:`);
  console.log(`  Current: ${data.compositeScore?.current ? data.compositeScore.current.percentile + 'th on ' + new Date(data.compositeScore.current.date).toLocaleDateString() : 'None'}`);
  console.log(`  Previous: ${data.compositeScore?.previous ? data.compositeScore.previous.percentile + 'th on ' + new Date(data.compositeScore.previous.date).toLocaleDateString() : 'None'}`);

  console.log(`\nMetrics:`);
  for (const metric of data.metrics) {
    console.log(`  ${metric.displayName}:`);
    console.log(`    Current: ${metric.current ? metric.current.percentile + 'th' : 'None'}`);
    console.log(`    Previous: ${metric.previous ? metric.previous.percentile + 'th' : 'None'}`);
  }

  console.log('\n' + '='.repeat(80));
}

testRadarAPI().catch(console.error);
