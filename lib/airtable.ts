import Airtable from 'airtable';

const base = new Airtable({ apiKey: process.env.AIRTABLE_TOKEN }).base(
  process.env.AIRTABLE_BASE_ID!
);

export type AirtableRecord<T extends object = Record<string, unknown>> = T & {
  _recordId: string;
};

export async function fetchTable<T extends object>(
  tableName: string
): Promise<AirtableRecord<T>[]> {
  const records = await base(tableName).select().all();
  return records.map(r => ({
    _recordId: r.id,
    ...(r.fields as T),
  }));
}

export async function updateRecord(
  tableName: string,
  recordId: string,
  fields: Record<string, unknown>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await base(tableName).update(recordId, fields as any);
}

export async function createRecord(
  tableName: string,
  fields: Record<string, unknown>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await base(tableName).create(fields as any);
}

export async function createRecords(
  tableName: string,
  fieldsList: Record<string, unknown>[]
): Promise<void> {
  for (let i = 0; i < fieldsList.length; i += 10) {
    const batch = fieldsList.slice(i, i + 10);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await base(tableName).create(batch.map(fields => ({ fields })) as any);
  }
}

export async function deleteRecords(
  tableName: string,
  recordIds: string[]
): Promise<void> {
  for (let i = 0; i < recordIds.length; i += 10) {
    await base(tableName).destroy(recordIds.slice(i, i + 10));
  }
}
