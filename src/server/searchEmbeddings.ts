import { openai } from './utils.js';
import type { SearchEmbeddings } from '@wasp/queries/types';

type Args = { inputQuery: string; similarityThreshold: number, matchCount: number };
type Result = { title: string; content: string; similarity: number };

export const searchEmbeddings: SearchEmbeddings<Args, Result[]> = async ({ inputQuery, similarityThreshold = 0.01, matchCount = 5 }, context) => {
  const res = await openai.createEmbedding({
    model: 'text-embedding-ada-002',
    input: inputQuery,
  });

  const embeddingResult = res.data.data[0].embedding;

  const similarResults: Result[] = []

  const textChunks = await context.entities.Text.findMany();
  textChunks.forEach((textChunk) => {
    const embeddingTextChunk = JSON.parse(textChunk.embeddings);
    const similarity = compareEmbeddings(embeddingResult, embeddingTextChunk);
    if (similarity > similarityThreshold) {
      similarResults.push({
        title: textChunk.title,
        content: textChunk.content,
        similarity: similarity,
      });
    }
  });

  similarResults.sort(function (a, b) {
    return b.similarity - a.similarity;
  });

  return similarResults.slice(0, matchCount);
};


function compareEmbeddings(embedding1: number[], embedding2: number[]) {
  const length = Math.min(embedding1.length, embedding2.length);
  let dotprod = 0;

  for (let i = 0; i < length; i++) {
    dotprod += embedding1[i] * embedding2[i];
  }

  return dotprod;
};


