import postgres from 'postgres';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.ryiieoqyxujkxbhmiqjo:Ammar388carpool@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';

const sql = postgres(connectionString);

async function main() {
  const query = process.argv.slice(2).join(' ');
  if (!query) {
    console.log('Usage: bun run run_sql.ts "<SQL_QUERY>"');
    console.log('Example: bun run run_sql.ts "SELECT id, trip_date, status FROM public.trips LIMIT 5"');
    process.exit(0);
  }

  try {
    console.log(`Executing SQL: ${query}\n`);
    const result = await sql.unsafe(query);
    if (Array.isArray(result) && result.length > 0) {
      console.table(result);
    } else {
      console.log('Query executed successfully. (0 rows returned / command executed)');
    }
  } catch (err: any) {
    console.error('SQL Execution Error:', err.message);
    process.exitCode = 1;
  } finally {
    await sql.end();
  }
}

main();
