/**
 * Analyze the Youth percentile history data to determine:
 * 1. How many unique Youth athletes exist
 * 2. How many tests each athlete has per test type
 * 3. Which athletes should have contributions (2+ tests per type)
 */

// Raw data from user
const rawData = `06e209ba-f5da-4d0e-9150-829963347f18,f8f13a34-cbfa-4070-97ed-59a49151afc1,SJ,2025-10-22 21:04:27.323+00,3e78b3ef-a273-40a5-b6fb-b5d47581097e,Youth,2025-10-29 18:23:07.964237+00,Peak Power (W),1739.299,0,1
21c09bdd-5ceb-4d71-89e5-75e1b933100f,f8f13a34-cbfa-4070-97ed-59a49151afc1,CMJ,2025-10-22 21:03:21.62+00,7dbb0ab4-6c17-4899-849a-356a2f49e982,Youth,2025-10-29 18:23:07.347309+00,Peak Power / BM (W/kg),36.9956666666667,0,4
379df6be-74c0-47b0-adf2-3c90d9f6ec8c,f8f13a34-cbfa-4070-97ed-59a49151afc1,IMTP,2025-10-22 21:09:12.197+00,4810cb1f-1974-4389-a6d9-9833befcf6bf,Youth,2025-10-29 18:23:09.55878+00,Relative Strength,1.16659301785579,0,0
3b517fda-a56b-452f-9b2f-181dfa9f8d4d,f8f13a34-cbfa-4070-97ed-59a49151afc1,PPU,2025-10-22 21:06:48.609+00,1cadc6a3-cef0-4837-9a76-9c4bb3e2a6bc,Youth,2025-10-29 18:23:08.904743+00,Peak Takeoff Force (N),443.20703125,0,0
48bfc499-7971-4b82-9881-a6b06c264727,f8f13a34-cbfa-4070-97ed-59a49151afc1,SJ,2025-10-22 21:04:27.323+00,3e78b3ef-a273-40a5-b6fb-b5d47581097e,Youth,2025-10-29 18:23:08.255435+00,Peak Power / BM (W/kg),35.9803333333333,0,3
bc08059a-6960-407c-b0b5-fb53f21d4856,f8f13a34-cbfa-4070-97ed-59a49151afc1,IMTP,2025-10-22 21:09:12.197+00,4810cb1f-1974-4389-a6d9-9833befcf6bf,Youth,2025-10-29 18:23:09.281949+00,Net Peak Force (N),553.90303125,0,0
e0b01741-e0d1-48b8-82cc-cd37840b1a58,f8f13a34-cbfa-4070-97ed-59a49151afc1,FORCE_PROFILE,2025-10-22 21:09:12.197+00,,Youth,2025-10-29 18:23:10.048545+00,,,0,1
f01a7288-4bb1-4a56-a19e-dd4dece32b1d,f8f13a34-cbfa-4070-97ed-59a49151afc1,CMJ,2025-10-22 21:03:21.62+00,7dbb0ab4-6c17-4899-849a-356a2f49e982,Youth,2025-10-29 18:23:07.594576+00,Peak Power (W),1788.735,0,4
fec4d7a3-e292-41c4-a2a5-103b68dcc6a4,f8f13a34-cbfa-4070-97ed-59a49151afc1,HJ,2025-10-22 21:06:17.025+00,11b62e00-a21d-4b1b-8c5b-4a7d8269ece6,Youth,2025-10-29 18:23:08.577126+00,Reactive Strength Index,1.58782319148761,0,2
0c225e75-f600-4442-bf9a-27a7320cab86,cb209d13-4509-4b36-94e3-0f49b5312b79,SJ,2025-10-15 20:21:42.28+00,2253245e-04e4-47f6-ae6a-114140ac8d58,Youth,2025-10-30 20:30:16.531547+00,Peak Power (W),1489.838,0,0
21ff9035-fe1e-4aad-a18e-7b15827bd0a3,cb209d13-4509-4b36-94e3-0f49b5312b79,SJ,2025-01-29 22:11:57.831+00,91ff80f6-a5f2-4e2b-8c84-3f672d4dea70,Youth,2025-10-30 20:30:08.321227+00,Peak Power (W),1058.8694,0,0
24effdb2-0a04-4ef6-8370-ecaa625934ab,cb209d13-4509-4b36-94e3-0f49b5312b79,CMJ,2025-09-01 20:42:13.64+00,7e27848b-c9fc-4a67-9bdc-58d2f7245ffa,Youth,2025-10-30 20:30:09.961757+00,Peak Power / BM (W/kg),37.8666666666667,0,5
34566f90-c1fd-4310-9590-f5b2211f655b,cb209d13-4509-4b36-94e3-0f49b5312b79,FORCE_PROFILE,2025-10-15 20:27:56.55+00,,Youth,2025-10-30 20:30:20.269449+00,,,0,9.33333333333333
3526f44e-5ccb-4061-b349-5d3fae024dc9,cb209d13-4509-4b36-94e3-0f49b5312b79,CMJ,2025-10-15 20:19:18.673+00,b728a2d5-51f4-4c76-96cf-a6416a00954a,Youth,2025-10-30 20:30:14.944721+00,Peak Power (W),1398.5315,0,1
3b4066a5-4495-488c-ab9f-6c687675f59f,cb209d13-4509-4b36-94e3-0f49b5312b79,IMTP,2025-10-15 20:27:56.55+00,e671b227-1ce0-490a-9650-1428c01efc23,Youth,2025-10-30 20:30:18.99686+00,Net Peak Force (N),501.382605887939,0,0
45ef4159-5a67-4d1a-b091-435e91f5dd5c,cb209d13-4509-4b36-94e3-0f49b5312b79,IMTP,2025-09-01 20:51:19.932+00,f2eadaf7-7789-42f9-a750-f8d0fd062eec,Youth,2025-10-30 20:30:13.625748+00,Net Peak Force (N),559.881783685221,0,0
4d4e5381-b132-415c-a897-d29b6584306b,cb209d13-4509-4b36-94e3-0f49b5312b79,SJ,2025-01-29 22:11:57.831+00,91ff80f6-a5f2-4e2b-8c84-3f672d4dea70,Youth,2025-10-30 20:30:08.559327+00,Peak Power / BM (W/kg),36.1882,0,3
5db40eba-0460-49a0-b9fe-b9455c75964c,cb209d13-4509-4b36-94e3-0f49b5312b79,SJ,2025-10-15 20:20:35.05+00,21ce33da-efd7-4f93-a59e-432b217b679f,Youth,2025-10-30 20:30:15.510858+00,Peak Power (W),1460.8535,0,0
6b1cd0e2-ac35-4210-abd6-3b599a34de4d,cb209d13-4509-4b36-94e3-0f49b5312b79,IMTP,2025-10-15 20:27:56.55+00,e671b227-1ce0-490a-9650-1428c01efc23,Youth,2025-10-30 20:30:19.310238+00,Relative Strength,1.24051791288842,0,0
7c0238b0-6d3e-4a3f-9b60-379346102284,cb209d13-4509-4b36-94e3-0f49b5312b79,CMJ,2025-01-29 22:10:18.047+00,bcb78c15-bb0a-4438-b0c8-bf7868af05af,Youth,2025-10-30 20:30:07.458648+00,Peak Power / BM (W/kg),35.268,0,3
8020a4b2-8cd7-433e-921e-29ad4c79189c,cb209d13-4509-4b36-94e3-0f49b5312b79,PPU,2025-09-01 20:47:14.657+00,01e2374e-6315-43aa-83a5-12a159e5ec14,Youth,2025-10-30 20:30:12.169846+00,Peak Takeoff Force (N),391.988483685221,0,0
83ae8dc3-2f82-4b1a-a219-5a0f91fa3096,cb209d13-4509-4b36-94e3-0f49b5312b79,SJ,2025-09-01 20:43:46.193+00,586a6c6c-46c0-4e18-843a-44b3f77ce7f1,Youth,2025-10-30 20:30:10.844959+00,Peak Power (W),1320.5495,0,0
9b58e4f3-a24f-4325-adff-dbda1d1599a9,cb209d13-4509-4b36-94e3-0f49b5312b79,SJ,2025-09-01 20:43:46.193+00,586a6c6c-46c0-4e18-843a-44b3f77ce7f1,Youth,2025-10-30 20:30:11.077616+00,Peak Power / BM (W/kg),41.1515,0,9
abc0f4e9-f4d6-4f85-af97-1bf5fdf51701,cb209d13-4509-4b36-94e3-0f49b5312b79,IMTP,2025-09-01 20:51:19.932+00,f2eadaf7-7789-42f9-a750-f8d0fd062eec,Youth,2025-10-30 20:30:13.903751+00,Relative Strength,1.77962447616411,0,0
b9d48f16-9528-4f7e-bd48-4abc1a5ece4b,cb209d13-4509-4b36-94e3-0f49b5312b79,CMJ,2025-09-01 20:42:13.64+00,7e27848b-c9fc-4a67-9bdc-58d2f7245ffa,Youth,2025-10-30 20:30:10.250435+00,Peak Power (W),1213.62433333333,0,0
ca1835ad-b66d-44ef-b36c-62bea39beaf2,cb209d13-4509-4b36-94e3-0f49b5312b79,CMJ,2025-10-15 20:19:18.673+00,b728a2d5-51f4-4c76-96cf-a6416a00954a,Youth,2025-10-30 20:30:14.679614+00,Peak Power / BM (W/kg),43.325,0,11
dbafa4fc-13f2-4511-bafd-b4d7a8f2919c,cb209d13-4509-4b36-94e3-0f49b5312b79,HJ,2025-10-15 20:25:23.757+00,3dde0200-7e8f-4715-ab1d-312515fcb91c,Youth,2025-10-30 20:30:17.467955+00,Reactive Strength Index,2.33940519795268,0,34
e874b922-e0ed-4567-b8a3-0227b4e6ee4f,cb209d13-4509-4b36-94e3-0f49b5312b79,HJ,2025-09-01 20:44:59.186+00,8717d561-7209-41db-a7f4-0b54c908f497,Youth,2025-10-30 20:30:11.643905+00,Reactive Strength Index,2.20612658147263,0,23
f0e95eaf-92a0-401a-8cf3-3b54d51a3820,cb209d13-4509-4b36-94e3-0f49b5312b79,SJ,2025-10-15 20:21:42.28+00,2253245e-04e4-47f6-ae6a-114140ac8d58,Youth,2025-10-30 20:30:16.85436+00,Peak Power / BM (W/kg),46.369,0,22
f3c8eb70-a446-4dda-9758-d81f0a0ba2a0,cb209d13-4509-4b36-94e3-0f49b5312b79,CMJ,2025-01-29 22:10:18.047+00,bcb78c15-bb0a-4438-b0c8-bf7868af05af,Youth,2025-10-30 20:30:07.747794+00,Peak Power (W),1029.823,0,0
f783cbb3-3fbf-4989-bade-38f919efbb5d,cb209d13-4509-4b36-94e3-0f49b5312b79,SJ,2025-10-15 20:20:35.05+00,21ce33da-efd7-4f93-a59e-432b217b679f,Youth,2025-10-30 20:30:15.745078+00,Peak Power / BM (W/kg),45.6375,0,19
106a81d9-b136-42fd-84b4-bdedb2d63640,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,HJ,2025-09-02 21:15:45.601+00,ce93a648-ed75-4b17-9c17-b6c63a4cf092,Youth,2025-10-30 21:58:11.516497+00,Reactive Strength Index,1.30916942604068,0,0
1816dea9-d70a-49ba-b0e6-7fda7b39cba1,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,HJ,2025-10-27 19:40:02.435+00,09c6d357-360f-45e9-99bc-93d507af2b2b,Youth,2025-10-30 21:58:15.384438+00,Reactive Strength Index,1.17688016105422,0,0
24758ea0-d0ed-43f5-aafb-b85372b22011,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,IMTP,2025-09-02 21:18:18.072+00,acc97ed0-9e32-4fe4-af40-cb0cc7ba9f12,Youth,2025-10-30 21:58:13.36374+00,Relative Strength,2.20205733168891,100,3
3bdcf03a-0d77-4089-bad0-f43d64eade25,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,CMJ,2025-10-27 19:36:24.575+00,6f38bd90-2aff-49d7-a75d-2320166d4340,Youth,2025-10-30 21:58:13.816048+00,Peak Power / BM (W/kg),46.3796666666667,100,17
3d1b6875-f9f8-46cc-b0ab-654f44744b15,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,CMJ,2025-10-27 19:36:24.575+00,6f38bd90-2aff-49d7-a75d-2320166d4340,Youth,2025-10-30 21:58:14.104291+00,Peak Power (W),2153.40233333333,100,6
4575dd6b-39de-4039-942e-efa2baf4290b,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,FORCE_PROFILE,2025-10-27 19:41:06.004+00,,Youth,2025-10-30 21:58:31.83149+00,,,66.6666666666667,8
5ff4353b-3f6c-443d-b3fd-a82ff51ba48e,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,FORCE_PROFILE,2025-10-27 19:41:06.004+00,,Youth,2025-10-30 22:01:02.906514+00,,,66.6666666666667,8
65722e5d-a0da-4915-9674-fe0c49bcb931,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,FORCE_PROFILE,2025-10-27 19:41:06.004+00,,Youth,2025-10-30 21:58:19.381015+00,,,66.6666666666667,8
6ca4de68-d8b2-4e13-803b-d04a25ca7d85,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,CMJ,2025-09-02 21:13:26.156+00,7fddd176-5150-4cbf-9f3b-c3af22cafc06,Youth,2025-10-30 21:58:10.355607+00,Peak Power (W),2096.84233333333,100,6
857c8d18-5228-4232-9030-549523e0f036,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,SJ,2025-09-02 21:14:31.661+00,61411fd7-672a-4310-ad67-5bb91a8b766e,Youth,2025-10-30 21:58:11.180286+00,Peak Power / BM (W/kg),44.8935,0,17
87368a46-2007-4bfb-ae33-c71a94bf0748,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,SJ,2025-10-27 19:37:49.121+00,aeee2e2c-d0b4-43ee-a0ad-05ea08add073,Youth,2025-10-30 21:58:14.693647+00,Peak Power / BM (W/kg),51.1323333333333,100,41
a9a86317-61a4-4640-9ed2-5398f4f4e796,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,SJ,2025-09-02 21:14:31.661+00,61411fd7-672a-4310-ad67-5bb91a8b766e,Youth,2025-10-30 21:58:10.79427+00,Peak Power (W),2070.94,100,2
b3fbb264-22a6-4d40-8400-2c3667dbfdcf,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,FORCE_PROFILE,2025-10-27 19:41:06.004+00,,Youth,2025-10-30 21:58:20.6974+00,,,66.6666666666667,8
c10cfa14-b226-4949-8a73-2fcf49fe4c49,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,PPU,2025-10-27 19:41:06.004+00,c68cdc26-b266-411d-8d78-48b9024cf0a4,Youth,2025-10-30 21:58:15.988211+00,Peak Takeoff Force (N),510.648423005566,0,0
ca5dae7b-8827-42f4-8af1-679d8c3376c2,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,SJ,2025-10-27 19:37:49.121+00,aeee2e2c-d0b4-43ee-a0ad-05ea08add073,Youth,2025-10-30 21:58:14.435218+00,Peak Power (W),2373.557,100,4
d23e3df2-5e76-4a05-9dff-616745712506,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,IMTP,2025-09-02 21:18:18.072+00,acc97ed0-9e32-4fe4-af40-cb0cc7ba9f12,Youth,2025-10-30 21:58:13.019287+00,Net Peak Force (N),998.23684980695,100,0
d70ca848-b288-4230-86c6-b94251764b56,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,PPU,2025-09-02 21:16:59.678+00,3cffe1f6-a424-4d0b-9622-6030235100c7,Youth,2025-10-30 21:58:12.07462+00,Peak Takeoff Force (N),503.791390728477,0,0
e903d2af-8464-4de2-9dc2-57c1007df3b7,90ae7b7b-da7a-4912-ada9-fa8f9b7adfb9,CMJ,2025-09-02 21:13:26.156+00,7fddd176-5150-4cbf-9f3b-c3af22cafc06,Youth,2025-10-30 21:58:09.687351+00,Peak Power / BM (W/kg),45.3566666666667,100,15`;

// Parse CSV data
const lines = rawData.split('\n');
const records = lines.map(line => {
  const parts = line.split(',');
  return {
    id: parts[0],
    athlete_id: parts[1],
    test_type: parts[2],
    test_date: parts[3],
    test_id: parts[4],
    play_level: parts[5],
    created_at: parts[6],
    metric_name: parts[7],
    value: parts[8],
    percentile_play_level: parts[9],
    percentile_overall: parts[10]
  };
});

console.log('=== YOUTH PERCENTILE HISTORY ANALYSIS ===\n');

// 1. Find unique athletes
const uniqueAthletes = [...new Set(records.map(r => r.athlete_id))];
console.log(`1. UNIQUE YOUTH ATHLETES: ${uniqueAthletes.length}`);
console.log('');

// 2. Count tests per athlete per test type
const athleteTestCounts = {};

records.forEach(record => {
  // Skip FORCE_PROFILE (it's not a real test type)
  if (record.test_type === 'FORCE_PROFILE') return;

  const athleteId = record.athlete_id;
  const testType = record.test_type;
  const testId = record.test_id;

  if (!athleteTestCounts[athleteId]) {
    athleteTestCounts[athleteId] = {};
  }

  if (!athleteTestCounts[athleteId][testType]) {
    athleteTestCounts[athleteId][testType] = new Set();
  }

  // Add test_id to set (automatically handles duplicates)
  athleteTestCounts[athleteId][testType].add(testId);
});

// 3. Display test counts per athlete
console.log('2. TEST COUNTS PER ATHLETE:\n');

uniqueAthletes.forEach((athleteId, idx) => {
  console.log(`Athlete ${idx + 1}: ${athleteId}`);

  const testTypes = ['CMJ', 'SJ', 'HJ', 'PPU', 'IMTP'];
  testTypes.forEach(testType => {
    const count = athleteTestCounts[athleteId]?.[testType]?.size || 0;
    const shouldContribute = count >= 2 ? '✅ CONTRIBUTES' : '❌ Too few tests';
    console.log(`   ${testType}: ${count} test${count !== 1 ? 's' : ''} ${shouldContribute}`);
  });
  console.log('');
});

// 4. Summary: Which test types should have contributions
console.log('3. SUMMARY - EXPECTED CONTRIBUTIONS:\n');

const contributionSummary = {};

uniqueAthletes.forEach(athleteId => {
  const testTypes = ['CMJ', 'SJ', 'HJ', 'PPU', 'IMTP'];
  testTypes.forEach(testType => {
    const count = athleteTestCounts[athleteId]?.[testType]?.size || 0;
    if (count >= 2) {
      if (!contributionSummary[testType]) {
        contributionSummary[testType] = 0;
      }
      contributionSummary[testType]++;
    }
  });
});

console.log('Expected contributions in athlete_percentile_contributions table:\n');
Object.entries(contributionSummary).forEach(([testType, count]) => {
  console.log(`   ${testType}: ${count} athlete${count !== 1 ? 's' : ''} should have contributions`);
});

console.log('\n');
console.log('=== TOTAL EXPECTED CONTRIBUTIONS ===');
const totalContributions = Object.values(contributionSummary).reduce((sum, count) => sum + count, 0);
console.log(`Total: ${totalContributions} rows should be in athlete_percentile_contributions`);
console.log('');

// 5. Detail breakdown
console.log('=== DETAILED BREAKDOWN ===\n');

uniqueAthletes.forEach((athleteId, idx) => {
  console.log(`Athlete ${idx + 1}: ${athleteId.substring(0, 8)}...`);

  const testTypes = ['CMJ', 'SJ', 'HJ', 'PPU', 'IMTP'];
  const contributes = [];
  const doesNotContribute = [];

  testTypes.forEach(testType => {
    const count = athleteTestCounts[athleteId]?.[testType]?.size || 0;
    if (count >= 2) {
      contributes.push(`${testType}(${count})`);
    } else if (count > 0) {
      doesNotContribute.push(`${testType}(${count})`);
    }
  });

  if (contributes.length > 0) {
    console.log(`   ✅ Contributes: ${contributes.join(', ')}`);
  }
  if (doesNotContribute.length > 0) {
    console.log(`   ❌ Does NOT contribute: ${doesNotContribute.join(', ')}`);
  }
  console.log('');
});
