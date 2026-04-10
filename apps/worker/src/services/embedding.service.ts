import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CodeChunk } from "./chunking.service";

interface EmbeddingResult {
  chunkId: string;
  embedding: number[];
}

export class EmbeddingService {
  private genAI: GoogleGenerativeAI;
  private model: any;
  private readonly EMBEDDING_DIMENSION = 1536; // Changed from 768
  private readonly BATCH_SIZE = 10;

  constructor() {
    this.genAI = new GoogleGenerativeAI(
      process.env.GOOGLE_GENERATIVE_AI_API_KEY!
    );
    this.model = this.genAI.getGenerativeModel({
      model: "models/gemini-embedding-001", // Fixed model name
    });
  }

  // NEW: L2 Normalization function (required for dimensions < 3072)
  private normalizeL2(vector: number[]): number[] {
    const norm = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));

    if (norm === 0) {
      console.warn("Zero norm vector detected, returning original");
      return vector;
    }

    return vector.map((val) => val / norm);
  }

  async generateEmbeddings(chunks: CodeChunk[]): Promise<number[][]> {
    console.log(`Generating embeddings for ${chunks.length} chunks`);
    console.log(
      `Model: gemini-embedding-001 (${this.EMBEDDING_DIMENSION} dimensions)\n`
    );

    const embeddings: number[][] = [];
    const totalBatches = Math.ceil(chunks.length / this.BATCH_SIZE);

    for (let i = 0; i < chunks.length; i += this.BATCH_SIZE) {
      const batch = chunks.slice(i, i + this.BATCH_SIZE);
      const batchNumber = Math.floor(i / this.BATCH_SIZE) + 1;

      console.log(`Processing batch ${batchNumber}/${totalBatches}`);

      const batchEmbeddings = await Promise.all(
        batch.map((chunk) => this.embedChunk(chunk))
      );

      embeddings.push(...batchEmbeddings);

      if (i + this.BATCH_SIZE < chunks.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    console.log(`Generated ${embeddings.length} embeddings\n`);
    return embeddings;
  }

  // UPDATED: Added task_type for query embeddings
  async generateSingleEmbedding(text: string): Promise<number[]> {
    const result = await this.model.embedContent({
      content: { parts: [{ text }] },
      taskType: "CODE_RETRIEVAL_QUERY", // Optimized for code queries
      outputDimensionality: this.EMBEDDING_DIMENSION,
    });

    // Apply L2 normalization
    return this.normalizeL2(result.embedding.values);
  }

  // UPDATED: Added task_type and output dimensionality
  private async embedChunk(chunk: CodeChunk): Promise<number[]> {
    try {
      const text = this.formatChunkForEmbedding(chunk);

      const result = await this.model.embedContent({
        content: { parts: [{ text }] },
        taskType: "RETRIEVAL_DOCUMENT", // For indexing code chunks
        outputDimensionality: this.EMBEDDING_DIMENSION,
      });

      // Apply L2 normalization
      return this.normalizeL2(result.embedding.values);
    } catch (error) {
      console.error(`Failed to embed ${chunk.id}:`, error);
      return new Array(this.EMBEDDING_DIMENSION).fill(0);
    }
  }

  private formatChunkForEmbedding(chunk: CodeChunk): string {
    return `
File: ${chunk.filePath}
Type: ${chunk.fileType}
Function: ${chunk.functionName || "N/A"}
Lines: ${chunk.lineStart}-${chunk.lineEnd}

${chunk.content}
    `.trim();
  }
}
