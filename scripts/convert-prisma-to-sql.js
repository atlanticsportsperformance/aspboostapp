/**
 * Convert Prisma schema models to Supabase SQL migrations
 * Reads from atlantic_evan_app and generates SQL ALTER TABLE statements
 */

const fs = require('fs');
const path = require('path');

// Read Prisma schema
const prismaSchemaPath = path.join(__dirname, '../atlantic_evan_app/atlantic-app-improved/prisma/schema.prisma');
const prismaSchema = fs.readFileSync(prismaSchemaPath, 'utf-8');

/**
 * Extract a specific model from Prisma schema
 */
function extractModel(schema, modelName) {
  const regex = new RegExp(`model ${modelName} \\{([^}]+)\\}`, 's');
  const match = schema.match(regex);
  return match ? match[1] : null;
}

/**
 * Parse Prisma fields to SQL column definitions
 */
function parseFields(modelContent) {
  const lines = modelContent.split('\n');
  const columns = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines, comments, and base fields we already have
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('@@')) continue;

    // Skip fields we already created in the initial migration
    if (trimmed.startsWith('id ') ||
        trimmed.startsWith('athleteId ') ||
        trimmed.startsWith('recordedUTC ') ||
        trimmed.startsWith('recordedTimeZone ') ||
        trimmed.startsWith('testId ') ||
        trimmed.startsWith('createdAt ')) {
      continue;
    }

    // Parse field definition
    const match = trimmed.match(/^(\w+)\s+(String|Float|Int|DateTime|Boolean)(\?)?/);
    if (match) {
      const [, fieldName, type, optional] = match;

      // Convert Prisma types to SQL types
      let sqlType;
      if (type === 'String') sqlType = 'TEXT';
      else if (type === 'Float') sqlType = 'FLOAT';
      else if (type === 'Int') sqlType = 'INT';
      else if (type === 'DateTime') sqlType = 'TIMESTAMPTZ';
      else if (type === 'Boolean') sqlType = 'BOOLEAN';
      else continue;

      // Convert to lowercase (Prisma already uses UPPER_CASE_WITH_UNDERSCORES format)
      const snakeCaseName = fieldName.toLowerCase();

      columns.push({ name: snakeCaseName, type: sqlType });
    }
  }

  return columns;
}

/**
 * Generate SQL ALTER TABLE statements
 */
function generateAlterTableSQL(tableName, columns) {
  const statements = columns.map(col =>
    `ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`
  );
  return statements.join('\n');
}

/**
 * Generate migration for a test type
 */
function generateMigration(testType) {
  const modelName = `${testType}Test`;
  const tableName = `${testType.toLowerCase()}_tests`;

  console.log(`\n📊 Processing ${modelName}...`);

  // Extract model
  const modelContent = extractModel(prismaSchema, modelName);
  if (!modelContent) {
    console.error(`❌ Model ${modelName} not found`);
    return null;
  }

  // Parse fields
  const columns = parseFields(modelContent);
  console.log(`✅ Found ${columns.length} columns`);

  // Generate SQL
  const sql = `-- Expand ${testType} test table to include all VALD metrics
-- This migration adds ~${columns.length} additional columns to the ${tableName} table
-- Converted from atlantic_evan_app Prisma schema

${generateAlterTableSQL(tableName, columns)}

-- Add comment
COMMENT ON TABLE ${tableName} IS 'VALD ForceDecks ${testType} test data - Full schema with ${columns.length} metric columns';
`;

  return sql;
}

// Generate migrations for all test types
const testTypes = ['SJ', 'HJ', 'PPU', 'IMTP'];

testTypes.forEach((testType, index) => {
  const migrationNumber = String(index + 5).padStart(6, '0');
  const timestamp = '20250125';
  const filename = `${timestamp}${migrationNumber}_expand_${testType.toLowerCase()}_test_table.sql`;
  const filepath = path.join(__dirname, '../supabase/migrations', filename);

  const sql = generateMigration(testType);

  if (sql) {
    fs.writeFileSync(filepath, sql);
    console.log(`✅ Created: ${filename}`);
  }
});

console.log('\n🎉 All migrations generated!');
console.log('\nNext steps:');
console.log('1. Review the generated migration files');
console.log('2. Run: npx supabase migration up');
console.log('3. Verify columns were added successfully');
