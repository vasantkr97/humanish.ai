import Redis from "ioredis";
import { BM25Service } from "./bm25.service";
import { VectorDBService } from "./vectordb.service";
import { EmbeddingService } from "./embedding.service";

interface SearchResult {
  chunkId: string;
  filePath: string;
  fileName: string;
  functionName: string | null;
  content: string;
  score: number;
  rank: number;
  sources: {
    bm25Score?: number;
    bm25Rank?: number;
    vectorScore?: number;
    vectorRank?: number;
  };
}

export class HybridSearchService {
  private redis: Redis;
  private repoId: string;
  private bm25Service: BM25Service;
  private vectorDBService: VectorDBService;
  private embeddingService: EmbeddingService;

  private readonly RRF_K = 60;
  private readonly BM25_WEIGHT = 0.3;
  private readonly VECTOR_WEIGHT = 0.7;

  constructor(redis: Redis, repoId: string) {
    this.redis = redis;
    this.repoId = repoId;
    this.bm25Service = new BM25Service(redis, repoId);
    this.vectorDBService = new VectorDBService();
    this.embeddingService = new EmbeddingService();
  }

  async initialize(): Promise<void> {
    console.log("\n" + "=".repeat(70));
    console.log("HYBRID SEARCH INITIALIZATION");
    console.log("=".repeat(70) + "\n");

    const bm25Loaded = await this.bm25Service.loadFromRedis();
    if (!bm25Loaded) {
      console.warn(
        "Warning: BM25 index not found. Hybrid search will use vector-only mode.\n"
      );
    }

    await this.vectorDBService.initialize(this.repoId);

    console.log("Hybrid search initialized\n");
  }

  async search(
    query: string,
    topK: number = 20,
    method: "rrf" | "weighted" = "rrf"
  ): Promise<SearchResult[]> {
    console.log("\n" + "=".repeat(70));
    console.log("HYBRID SEARCH QUERY");
    console.log("=".repeat(70));
    console.log(`Query: "${query}"`);
    console.log(`Top K: ${topK}`);
    console.log(`Fusion Method: ${method.toUpperCase()}`);
    console.log("=".repeat(70) + "\n");

    console.log("STEP 1: BM25 Search (Keyword-based)\n");
    const bm25Results = this.bm25Service.search(query, topK * 2);
    console.log(`BM25 returned ${bm25Results.length} results\n`);

    console.log("STEP 2: Vector Search (Semantic)\n");
    const queryEmbedding =
      await this.embeddingService.generateSingleEmbedding(query);
    console.log(
      `Generated query embedding (${queryEmbedding.length} dimensions)`
    );

    const vectorResults = await this.vectorDBService.queryVectors(
      queryEmbedding,
      topK * 2
    );
    console.log(`Vector search returned ${vectorResults.length} results\n`);

    console.log("STEP 3: Combining Results\n");
    let fusedResults: SearchResult[];

    if (method === "rrf") {
      fusedResults = this.reciprocalRankFusion(bm25Results, vectorResults);
    } else {
      fusedResults = this.weightedFusion(bm25Results, vectorResults);
    }

    const finalResults = fusedResults.slice(0, topK);

    console.log("=".repeat(70));
    console.log("HYBRID SEARCH RESULTS");
    console.log("=".repeat(70));
    console.log(`Total unique results: ${fusedResults.length}`);
    console.log(`Returning top ${finalResults.length}\n`);

    finalResults.slice(0, 10).forEach((result, idx) => {
      console.log(`${idx + 1}. ${result.filePath}`);
      console.log(
        `   Score: ${result.score.toFixed(4)} | BM25: ${result.sources.bm25Score?.toFixed(2) || "N/A"} | Vector: ${result.sources.vectorScore?.toFixed(2) || "N/A"}`
      );
      if (result.functionName) {
        console.log(`   Function: ${result.functionName}`);
      }
      console.log("");
    });

    return finalResults;
  }

  private reciprocalRankFusion(
    bm25Results: Array<{
      documentId: string;
      score: number;
      rank: number;
      metadata: any;
    }>,
    vectorResults: Array<{ id: string; score: number; metadata: any }>
  ): SearchResult[] {
    console.log("Using Adaptive Reciprocal Rank Fusion (RRF)\n");

    let bm25Weight = 1.0;
    let vectorWeight = 1.0;

    if (bm25Results.length >= 2) {
      const topBM25 = bm25Results[0]?.score ?? 0;
      const secondBM25 = bm25Results[1]?.score ?? 0;
      const confidenceRatio = topBM25 / (secondBM25 + 0.1);

      console.log(`BM25 Confidence Analysis:`);
      console.log(`  Top score: ${topBM25.toFixed(2)}`);
      console.log(`  Second score: ${secondBM25.toFixed(2)}`);
      console.log(`  Confidence ratio: ${confidenceRatio.toFixed(2)}x\n`);

      if (confidenceRatio > 2.0) {
        bm25Weight = 4.0;
        vectorWeight = 0.5;
        console.log(
          `High BM25 confidence detected (${confidenceRatio.toFixed(2)}x)`
        );
        console.log(
          `  Applying adaptive weighting: BM25=${bm25Weight}x, Vector=${vectorWeight}x\n`
        );
      } else if (confidenceRatio > 1.5) {
        bm25Weight = 3.0;
        vectorWeight = 0.8;
        console.log(
          `Moderate BM25 confidence detected (${confidenceRatio.toFixed(2)}x)`
        );
        console.log(
          `  Applying adaptive weighting: BM25=${bm25Weight}x, Vector=${vectorWeight}x\n`
        );
      } else {
        console.log(`Normal confidence - using balanced RRF (1:1 weighting)\n`);
      }
    }

    const bm25Map = new Map(
      bm25Results.map((r, idx) => [r.documentId, { ...r, rank: idx + 1 }])
    );
    const vectorMap = new Map(
      vectorResults.map((r, idx) => [r.id, { ...r, rank: idx + 1 }])
    );

    const allChunkIds = new Set([
      ...bm25Results.map((r) => r.documentId),
      ...vectorResults.map((r) => r.id),
    ]);

    const scoredResults: SearchResult[] = [];
    const topBM25Id =
      bm25Results.length > 0 ? bm25Results[0]?.documentId : null;

    for (const chunkId of allChunkIds) {
      const bm25Result = bm25Map.get(chunkId);
      const vectorResult = vectorMap.get(chunkId);

      let bm25RRF = bm25Result
        ? bm25Weight / (this.RRF_K + bm25Result.rank)
        : 0;
      const vectorRRF = vectorResult
        ? vectorWeight / (this.RRF_K + vectorResult.rank)
        : 0;

      if (chunkId === topBM25Id && bm25Weight > 1.0) {
        const boost = 0.015;
        bm25RRF += boost;
        console.log(
          `   Applying top BM25 boost (+${boost}) to: ${bm25Map.get(chunkId)?.metadata?.filePath || chunkId}`
        );
      }

      const totalScore = bm25RRF + vectorRRF;

      const metadata = vectorResult?.metadata || bm25Result?.metadata;

      scoredResults.push({
        chunkId,
        filePath: metadata?.filePath || "unknown",
        fileName: metadata?.fileName || "unknown",
        functionName: metadata?.functionName || null,
        content: metadata?.content || bm25Result?.metadata?.content || "",
        score: totalScore,
        rank: 0,
        sources: {
          bm25Score: bm25Result?.score,
          bm25Rank: bm25Result?.rank,
          vectorScore: vectorResult?.score,
          vectorRank: vectorResult?.rank,
        },
      });
    }

    scoredResults.sort((a, b) => b.score - a.score);

    scoredResults.forEach((result, idx) => {
      result.rank = idx + 1;
    });

    return scoredResults;
  }

  private weightedFusion(
    bm25Results: Array<{
      documentId: string;
      score: number;
      rank: number;
      metadata: any;
    }>,
    vectorResults: Array<{ id: string; score: number; metadata: any }>
  ): SearchResult[] {
    console.log("Using Weighted Average Fusion\n");
    console.log(`BM25 Weight: ${this.BM25_WEIGHT}`);
    console.log(`Vector Weight: ${this.VECTOR_WEIGHT}\n`);

    const maxBM25 = Math.max(...bm25Results.map((r) => r.score), 1);
    const normalizedBM25 = new Map(
      bm25Results.map((r) => [
        r.documentId,
        { ...r, normalizedScore: r.score / maxBM25 },
      ])
    );

    const vectorMap = new Map(vectorResults.map((r) => [r.id, r]));

    const allChunkIds = new Set([
      ...bm25Results.map((r) => r.documentId),
      ...vectorResults.map((r) => r.id),
    ]);

    const scoredResults: SearchResult[] = [];

    for (const chunkId of allChunkIds) {
      const bm25Result = normalizedBM25.get(chunkId);
      const vectorResult = vectorMap.get(chunkId);

      const bm25Score = bm25Result
        ? bm25Result.normalizedScore * this.BM25_WEIGHT
        : 0;
      const vectorScore = vectorResult
        ? vectorResult.score * this.VECTOR_WEIGHT
        : 0;

      const totalScore = bm25Score + vectorScore;

      const metadata = vectorResult?.metadata || bm25Result?.metadata;

      scoredResults.push({
        chunkId,
        filePath: metadata?.filePath || "unknown",
        fileName: metadata?.fileName || "unknown",
        functionName: metadata?.functionName || null,
        content: metadata?.content || bm25Result?.metadata?.content || "",
        score: totalScore,
        rank: 0,
        sources: {
          bm25Score: bm25Result?.score,
          bm25Rank: bm25Result?.rank,
          vectorScore: vectorResult?.score,
          vectorRank: vectorResults.findIndex((r) => r.id === chunkId) + 1,
        },
      });
    }

    scoredResults.sort((a, b) => b.score - a.score);

    scoredResults.forEach((result, idx) => {
      result.rank = idx + 1;
    });

    return scoredResults;
  }

  getUniqueFiles(results: SearchResult[]): string[] {
    const filePaths = new Set(results.map((r) => r.filePath));
    return Array.from(filePaths);
  }

  groupByFile(results: SearchResult[]): Map<string, SearchResult[]> {
    const grouped = new Map<string, SearchResult[]>();

    for (const result of results) {
      const existing = grouped.get(result.filePath) || [];
      existing.push(result);
      grouped.set(result.filePath, existing);
    }

    return grouped;
  }
}
