import { openai } from './utils.js';
import prismaClient from '@wasp/dbClient.js';
import { initPinecone } from './utils.js';
import type { Text } from '@wasp/entities';
import type { SearchEmbeddings } from '@wasp/queries/types';

type Args = { inputQuery: string };

export const searchEmbeddings: SearchEmbeddings<Args, Text[]> = async ({ inputQuery }, context) => {
  const pinecone = await initPinecone();

  const res = await openai.createEmbedding({
    model: 'text-embedding-ada-002',
    input: inputQuery,
  });

  const embedding = res.data.data[0].embedding;

  const indexes = await pinecone.listIndexes();
  console.log('indexes-->>', indexes);

  const index = pinecone.Index('embeds-test');
  const queryRequest = {
    vector: embedding,
    topK: 10,
    includeValues: false,
    includeMetadata: false,
  };
  const queryResponse = await index.query({ queryRequest });

  let matches: Text[] = [];
  if (queryResponse.matches?.length) {
    const textChunks = await Promise.all(
      queryResponse.matches.map(async (match) => {
        return await context.entities.Text.findFirst({
          where: {
            title: match.id,
          },
        });
      })
    );
    matches = textChunks.filter((textChunk) => !!textChunk) as Text[];
  }
  return matches;
};
