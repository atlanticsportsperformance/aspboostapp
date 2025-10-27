/**
 * Test the percentile API with Scott's data
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const SCOTT_ID = 'b9a7afb2-5fcd-4f83-a63b-9ea69d9fd95f';
const API_URL = 'http://localhost:3000';

async function main() {
  console.log('🔍 Testing Percentile API with Scott\'s Data\n');

  const response = await fetch(`${API_URL}/api/athletes/${SCOTT_ID}/vald/percentiles`);

  if (!response.ok) {
    console.error(`❌ API Error: ${response.status} ${response.statusText}`);
    const data = await response.json();
    console.error(data);
    return;
  }

  const data = await response.json();

  console.log(`Play Level: ${data.play_level}`);
  console.log(`Average Percentile: ${data.average_percentile?.toFixed(1) || 'N/A'}\n`);

  console.log('Test Scores:');
  console.log('─'.repeat(80));

  for (const score of data.test_scores) {
    const percentile = score.latest_percentile !== null
      ? `${Math.round(score.latest_percentile)}th percentile`
      : 'No data';

    const trend = score.trend === 'up' ? '↑' : score.trend === 'down' ? '↓' : '─';

    console.log(`${score.test_name.padEnd(25)} ${percentile.padEnd(20)} ${trend}  (${score.test_count} tests)`);
  }

  console.log('\n✅ API Test Complete!\n');
}

main().catch(console.error);
