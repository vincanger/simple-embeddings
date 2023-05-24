import { openai } from './utils.js';
import prismaClient from '@wasp/dbClient.js';
import type { Text } from '@wasp/entities';
import type { SearchEmbeddings } from '@wasp/queries/types';

type Args = { inputQuery: string; similarityThreshold: number, matchCount: number };

export const searchEmbeddings: SearchEmbeddings<Args, Text> = async ({ inputQuery, similarityThreshold = 0.01, matchCount = 5 }) => {
  const res = await openai.createEmbedding({
    model: 'text-embedding-ada-002',
    input: inputQuery,
  });

  const embedding = res.data.data[0].embedding;

  /** 
   * NOTE: the CAST() function is used to convert the input values to the correct data types
   * that our Postgres embed_search() function expects. If you didn't set this up on Supabase yet, 
   * check the README.md file for instructions.
   */
  return await prismaClient.$queryRaw`SELECT * FROM public.embed_search(query_embedding := CAST(${embedding} as vector), similarity_threshold := CAST(${similarityThreshold} as double precision), match_count := CAST(${matchCount} as integer));`;
};
