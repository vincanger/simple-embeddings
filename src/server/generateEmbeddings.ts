import fs from 'fs';
import path from 'path';
import { encode } from 'gpt-3-encoder';
import { openai, initPinecone } from './utils.js';
import mammoth from 'mammoth';
import pdfParse from './pdf.mjs';
import type { Vector } from '@pinecone-database/pinecone';
import type { GenerateEmbeddings } from '@wasp/actions/types';
import type { GetFilesToEmbed } from '@wasp/queries/types';

/**
 * this is the max number of tokens we want to chunk the text into
 * before we create an embedding for it. You can play around with this
 * number to suit your data. suggested size: 80 - 500
 * see: https://www.npmjs.com/package/gpt-3-encoder
 */
const CHUNK_SIZE = 300;

const dirPath = './src/shared/docs';
const files = fs.readdirSync(dirPath);

type FileToEmbed = { title: string; content: string };

type ChunkedFiles = {
  title: string;
  content: string;
  content_length: any;
  content_tokens: number;
}[][];

const chunkContent = (file: FileToEmbed) => {
  const { title, content } = file;

  const contentTokens = encode(content).length;

  let contentChunks = [];

  if (contentTokens > CHUNK_SIZE) {
    /**
     * For cleaner text, we can split on the period (.) character
     * but for less formatted text, we may want to split on the newline (\n) character
     */
    // const split = content.split('\n');
    const split = content.split('. ');
    let chunkText = '';

    for (let i = 0; i < split.length; i++) {
      const sentence = split[i];
      const sentenceTokenLength = encode(sentence).length;
      const chunkTextTokenLength = encode(chunkText).length;

      if (chunkTextTokenLength + sentenceTokenLength > CHUNK_SIZE) {
        contentChunks.push(chunkText);
        chunkText = '';
      }

      if (sentence[sentence.length - 1].match(/[a-z0-9]/i)) {
        chunkText += sentence + '. ';
      } else {
        chunkText += sentence + ' ';
      }
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

const chunkFiles = async () => {
  const fileContents: FileToEmbed[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const filePath = path.join(dirPath, file);

    const fileStats = fs.statSync(filePath);

    if (fileStats.isFile()) {
      let text: string = '';

      if (file.endsWith('.docx')) {
        const result = await mammoth.extractRawText({ path: filePath });

        console.log('DOCX parsing: ', result.messages.length ? result.messages : 'No errors');

        text = result.value;
      } else if (file.endsWith('.pdf')) {
        let dataBuffer = fs.readFileSync(filePath);

        const data = await pdfParse(dataBuffer);
        text = data.text;
      } else if (file.endsWith('.DS_Store')) {
        continue;
      } else {
        text = fs.readFileSync(filePath, 'utf8');
      }
      const content = text.replace(/(\r\n|\n|\r)/gm, ' ');
      fileContents.push({ title: file, content });
    }
  }

  const contentChunked: ChunkedFiles = fileContents.map((file) => {
    return chunkContent(file);
  });

  // write the chunked text to a file at the root of the project for debugging
  fs.writeFileSync('../../../chunkedTextForEmbeddings.json', JSON.stringify(contentChunked, null, 2));

  return contentChunked;
};

chunkFiles();

export const generateEmbeddings: GenerateEmbeddings<never, string> = async (_args, context) => {
  const contentChunked = await chunkFiles();

  const vectors: Vector[] = [];
  const pinecone = await initPinecone();

  // make sure to create an index before you upsert embeddings
  const indexes = await pinecone.listIndexes();
  if (!indexes.includes('embeds-test')) {
    await pinecone.createIndex({
      createRequest: {
        name: 'embeds-test',
        dimension: 1536,
      },
    });
  }

  const pineconeIndex = pinecone.Index('embeds-test');

  console.log('generateEmbeddings [[ starting... ]] ');
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
        console.log('skipping this chunk -- embedding already exists in the database');
        continue;
      }

      const embeddingResponse = await openai.createEmbedding({
        model: 'text-embedding-ada-002',
        input: chunkContent,
      });

      const [{ embedding }] = embeddingResponse.data.data;

      const vector: Vector = {
        id: chunkTitle,
        values: embedding,
        // metadata: {}
      };

      vectors.push(vector);

      await context.entities.Text.create({
        data: {
          title: chunkTitle,
          content: chunkContent,
        },
      });
    }
  }

  if (vectors.length === 0) {
    return 'No new embeddings generated.';
  }

  await pineconeIndex.upsert({
    upsertRequest: {
      vectors,
      // namespace: 'optional-namespace'
    },
  });

  return 'Text embeddings generated.';
};

export const getFilesToEmbed: GetFilesToEmbed<never, string[]> = async () => {
  return files.filter((file) => !file.endsWith('.DS_Store'));
};
