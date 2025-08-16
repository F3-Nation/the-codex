import { db } from '@/drizzle/db';
import { loadEnvConfig } from '@/lib/env';

// Load environment variables
loadEnvConfig();
import { entries, tags, entryTags } from './schema';
import { initialLexiconEntries, initialExiconEntries } from '@/lib/initalEntries';

async function seedLexiconEntries() {
  console.log('Seeding lexicon entries...');
  
  for (const entry of initialLexiconEntries) {
    await db.insert(entries).values({
      title: entry.name,
      definition: entry.description,
      type: entry.type,
      aliases: entry.aliases?.map(a => a.name) || [],
      mentioned_entries: [],
      video_link: null
    });
  }
  
  console.log(`Seeded ${initialLexiconEntries.length} lexicon entries`);
}

async function seedExiconEntries() {
  console.log('Seeding exicon entries and tags...');
  
  const tagNameToId = new Map<string, number>();

  for (const entry of initialExiconEntries) {
    // Insert the entry
    const insertedEntry = await db.insert(entries).values({
      title: entry.name,
      definition: entry.description,
      type: entry.type,
      aliases: entry.aliases?.map(a => a.name) || [],
      mentioned_entries: [],
      video_link: entry.videoLink || null
    }).returning({ id: entries.id });

    const entryId = insertedEntry[0].id;

    // Process tags for this entry
    for (const tag of entry.tags || []) {
      let tagId: number;

      // Check if we've already created this tag
      if (tagNameToId.has(tag.name)) {
        tagId = tagNameToId.get(tag.name)!;
      } else {
        // Create new tag
        const insertedTag = await db.insert(tags).values({
          name: tag.name
        }).returning({ id: tags.id });

        tagId = insertedTag[0].id;
        tagNameToId.set(tag.name, tagId);
      }

      // Create entry-tag relationship
      await db.insert(entryTags).values({
        entry_id: entryId,
        tag_id: tagId
      });
    }
  }
  
  console.log(`Seeded ${initialExiconEntries.length} exicon entries with ${tagNameToId.size} unique tags`);
}

export async function seedDatabase() {
  console.log('Starting database seeding...');
  
  await seedLexiconEntries();
  await seedExiconEntries();
  
  console.log('Database seeding completed successfully!');
}

// Execute the seed function if this file is run directly
if (import.meta.url.endsWith(process.argv[1])) {
  seedDatabase()
    .catch((error) => {
      console.error('Error seeding database:', error);
      process.exit(1);
    });
}
