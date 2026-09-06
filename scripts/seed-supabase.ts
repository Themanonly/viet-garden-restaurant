import assert from 'node:assert/strict';
import { mediaCatalog } from '../src/content/media';
import { menuDocument } from '../src/content/menu';
import { createSupabaseDatabaseClient, type SupabaseDatabaseClient } from '../src/content/supabase-database';
import type { SupabaseMediaRow } from '../src/content/supabase-media-repository';

type RevisionRow = { revision: number };

function mediaRow(asset: (typeof mediaCatalog)[number]): SupabaseMediaRow {
  return {
    id: asset.id,
    type: asset.type,
    source: asset.source,
    storage_bucket: asset.storageKey ? 'viet-garden-media' : null,
    storage_key: asset.storageKey ?? null,
    reference_url: asset.reference,
    alt: asset.alt,
    visible: asset.visible,
    sort_order: asset.sortOrder,
  };
}

export async function seedSupabaseBaseline(database: SupabaseDatabaseClient = createSupabaseDatabaseClient()): Promise<void> {
  assert.equal(menuDocument.categories.length, 10);
  assert.equal(menuDocument.items.length, 45);
  assert.equal(menuDocument.featuredSections.length, 1);
  assert.equal(menuDocument.featuredSections[0]?.itemIds.length, 3);
  assert.equal(mediaCatalog.length, 48);

  await database.upsert('media', mediaCatalog.map(mediaRow), 'id');
  const revisionRows = await database.select<RevisionRow>('content_revisions', 'select=revision&id=eq.default');
  if (!revisionRows[0]) throw new Error('Supabase content revision is not initialized.');
  await database.rpc('replace_menu_document', { payload: menuDocument, expected_revision: Number(revisionRows[0].revision) });

  const [categories, items, sections, sectionItems, media] = await Promise.all([
    database.select('menu_categories', 'select=id'),
    database.select('menu_items', 'select=id'),
    database.select('featured_sections', 'select=id'),
    database.select('featured_section_items', 'select=featured_section_id,menu_item_id'),
    database.select('media', 'select=id'),
  ]);
  assert.equal(categories.length, 10);
  assert.equal(items.length, 45);
  assert.equal(sections.length, 1);
  assert.equal(sectionItems.length, 3);
  assert.equal(media.length, 48);
}

if (process.argv[1]?.endsWith('seed-supabase.ts')) {
  seedSupabaseBaseline().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : 'Supabase baseline seed failed.'}\n`);
    process.exitCode = 1;
  });
}
