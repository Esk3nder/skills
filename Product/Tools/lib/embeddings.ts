/**
 * embeddings.ts - Ollama embedding utilities for local RAG
 *
 * Uses Ollama HTTP API with nomic-embed-text model (768 dimensions)
 */

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const EMBEDDING_MODEL = process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text";

export interface EmbeddingResult {
  embedding: number[];
  model: string;
}

/**
 * Check if Ollama is available and has the embedding model
 */
export async function checkOllama(): Promise<{
  available: boolean;
  hasModel: boolean;
  error?: string;
}> {
  try {
    // Check if Ollama is running
    const healthResponse = await fetch(`${OLLAMA_URL}/api/tags`);
    if (!healthResponse.ok) {
      return { available: false, hasModel: false, error: "Ollama not responding" };
    }

    const data = (await healthResponse.json()) as { models?: { name: string }[] };
    const models = data.models || [];
    const hasModel = models.some(
      (m) => m.name === EMBEDDING_MODEL || m.name.startsWith(`${EMBEDDING_MODEL}:`)
    );

    return { available: true, hasModel };
  } catch (error) {
    return {
      available: false,
      hasModel: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Generate embedding for a single text
 */
export async function embed(text: string): Promise<number[]> {
  const response = await fetch(`${OLLAMA_URL}/api/embed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    throw new Error(`Ollama embedding failed: ${response.statusText}`);
  }

  const data = (await response.json()) as { embeddings: number[][] };
  return data.embeddings[0];
}

/**
 * Truncate text to max tokens (rough estimate: 4 chars per token)
 */
function truncateText(text: string, maxChars: number = 8000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "...";
}

/**
 * Generate embedding for a single text with retry
 */
async function embedSingle(text: string): Promise<number[] | null> {
  try {
    const truncated = truncateText(text);
    const response = await fetch(`${OLLAMA_URL}/api/embed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: truncated,
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as { embeddings: number[][] };
    return data.embeddings[0];
  } catch {
    return null;
  }
}

/**
 * Generate embeddings for multiple texts in batch
 * Uses Ollama's batch capability with fallback for failures
 */
export async function embedBatch(
  texts: string[],
  options?: { onProgress?: (completed: number, total: number) => void }
): Promise<number[][]> {
  const results: number[][] = [];
  const batchSize = 10;
  const dimensions = getEmbeddingDimensions();
  const zeroVector = new Array(dimensions).fill(0);

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map((t) => truncateText(t));

    try {
      const response = await fetch(`${OLLAMA_URL}/api/embed`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: EMBEDDING_MODEL,
          input: batch,
        }),
      });

      if (response.ok) {
        const data = (await response.json()) as { embeddings: number[][] };
        results.push(...data.embeddings);
      } else {
        // Batch failed - try one by one
        for (const text of batch) {
          const embedding = await embedSingle(text);
          results.push(embedding || zeroVector);
        }
      }
    } catch {
      // Complete failure - use zero vectors
      for (let j = 0; j < batch.length; j++) {
        results.push(zeroVector);
      }
    }

    if (options?.onProgress) {
      options.onProgress(Math.min(i + batchSize, texts.length), texts.length);
    }
  }

  return results;
}

/**
 * Get embedding dimensions for the current model
 */
export function getEmbeddingDimensions(): number {
  // nomic-embed-text produces 768-dimensional vectors
  return 768;
}

export { EMBEDDING_MODEL, OLLAMA_URL };
