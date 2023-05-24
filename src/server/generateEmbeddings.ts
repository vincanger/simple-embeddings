import fs from 'fs';
import path from 'path';
import { encode } from 'gpt-3-encoder';
import { openai } from './utils.js';
import type { GenerateEmbeddings } from '@wasp/actions/types';

/**
 * this is the max number of tokens we want to chunk the text into 
 * before we create an embedding for it.
 * see: https://www.npmjs.com/package/gpt-3-encoder
 */
const CHUNK_SIZE = 200;

const dirPath = './src/shared/docs';
const files = fs.readdirSync(dirPath);

type FileToEmbed = { title: string; content: string };

const fileContents: FileToEmbed[] = [];

files.forEach((file) => {
  const filePath = path.join(dirPath, file);

  const fileStats = fs.statSync(filePath);

  if (fileStats.isFile()) {
    // NOTE: if you want to read pdfs, first install a library such as pdf-parse
    const readFile = fs.readFileSync(filePath, 'utf8'); // this works for text files
    fileContents.push({ title: file, content: readFile });
  }
});

const chunkContent = (file: FileToEmbed) => {
  const { title, content } = file;

  const contentTokens = encode(content).length;
  
  let contentChunks = [];

  if (contentTokens > CHUNK_SIZE) {
    /**
     * For clean text, we can split on the period (.) character
     * but for other text, we may want to split on the newline (\n) character
     */
    const split = content.split('\n');
    // const split = content.split('. ');
    let chunkText = '';

    for (let i = 0; i < split.length; i++) {
      const sentence = split[i];
      const sentenceTokenLength = encode(sentence).length;
      const chunkTextTokenLength = encode(chunkText).length;

      if (chunkTextTokenLength + sentenceTokenLength > CHUNK_SIZE) {
        contentChunks.push(chunkText);
        chunkText = '';
      }

      chunkText += sentence + ' ';
    }

    contentChunks.push(chunkText.trim());
  } else {
    contentChunks.push(content.trim());
  }

  const chunks = contentChunks.map((text, index) => {
    const trimmedText = text.trim();

    const chunk = {
      title: title + '-' + index,
      content: trimmedText,
      content_length: trimmedText.length,
      content_tokens: encode(trimmedText).length,
    };

    return chunk;
  });

  if (chunks.length > 1) {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const prevChunk = chunks[i - 1];

      if (chunk.content_tokens < 100 && prevChunk) {
        prevChunk.content += ' ' + chunk.content;
        prevChunk.content_length += chunk.content_length;
        prevChunk.content_tokens += chunk.content_tokens;
        chunks.splice(i, 1);
        i--;
      }
    }
  }

  return chunks;
};

type ChunkedFiles = {
    title: string;
    content: string;
    content_length: any;
    content_tokens: number;
}[][];

const contentChunked: ChunkedFiles = fileContents.map((file) => {
  return chunkContent(file);
});

// we can write the file to the root directory of the wasp project for debugging purposes
fs.writeFileSync('../../../chunkedTextForEmbeddings.json', JSON.stringify(contentChunked, null, 2));

export const generateEmbeddings: GenerateEmbeddings<never, string> = async (_args, context) => {
  console.log('generateEmbeddings [[ starting... ]] ')
  for (let i = 0; i < contentChunked.length; i++) {
    for (let j = 0; j < contentChunked[i].length; j++) {
      
      const text = contentChunked[i];
      const { title: chunkTitle, content: chunkContent } = text[j];

      console.log('chunkTitle->>', chunkTitle);

      const existingEmbedding = await context.entities.Text.findFirst({
        where: {
          title: chunkTitle,
        },
      });

      if (!!existingEmbedding) {
        console.log('skipping this chunk -- embedding already exists in the database')
        continue;
      }

      const embeddingResponse = await openai.createEmbedding({
        model: 'text-embedding-ada-002',
        input: chunkContent,
      });

      const [{ embedding }] = embeddingResponse.data.data;

      await context.entities.Text.create({
        data: {
          title: chunkTitle,
          content: chunkContent,
          embeddings: JSON.stringify(embedding),
        },
      });

    }
  }

  return 'Text embeddings generated.'
};
