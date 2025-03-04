import { db } from '@db';
import { createHash } from 'crypto';

interface TranslationVector {
  key: string;
  locale: string;
  embedding: number[];
  translation: string;
  context?: string;
}

// In-memory vector store for our translations
const vectorStore = new Map<string, TranslationVector>();

// Simple cosine similarity function
function cosineSimilarity(a: number[], b: number[]): number {
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  return dotProduct / (magnitudeA * magnitudeB);
}

// Enhanced text to vector function with context awareness
function textToVector(text: string, context?: string): number[] {
  const vector = new Array(256).fill(0); // Increased dimensionality

  // Process main text
  const words = text.toLowerCase().split(/\W+/);
  words.forEach((word, index) => {
    const hash = createHash('sha256').update(word).digest();
    for (let i = 0; i < 16; i++) {
      vector[i * 8] += hash[i] / 255;
    }

    // Add positional encoding
    if (index < 16) {
      vector[128 + index] = 1.0;
    }
  });

  // Process context if available
  if (context) {
    const contextWords = context.toLowerCase().split(/\W+/);
    contextWords.forEach(word => {
      const hash = createHash('sha256').update(word).digest();
      for (let i = 0; i < 16; i++) {
        vector[128 + i * 8] += hash[i] / 255 * 0.5; // Lower weight for context
      }
    });
  }

  // Normalize vector
  const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
  return vector.map(val => val / magnitude);
}

export class RAGTranslator {
  // Add a translation to the vector store with optional context
  addTranslation(key: string, locale: string, translation: string, context?: string) {
    const vector: TranslationVector = {
      key,
      locale,
      embedding: textToVector(key, context),
      translation,
      context
    };

    const storeKey = `${locale}:${key}`;
    vectorStore.set(storeKey, vector);
  }

  // Find the most similar translation with context awareness
  async findSimilarTranslation(key: string, locale: string, context?: string): Promise<string | null> {
    const queryVector = textToVector(key, context);
    let bestMatch: TranslationVector | null = null;
    let highestSimilarity = -1;

    // Find translations for the target locale
    const localeVectors = Array.from(vectorStore.values())
      .filter(vector => vector.locale === locale);

    // Find the most similar translation
    for (const vector of localeVectors) {
      const similarity = cosineSimilarity(queryVector, vector.embedding);

      // Boost similarity if contexts match
      if (context && vector.context === context) {
        similarity * 1.2;
      }

      if (similarity > highestSimilarity) {
        highestSimilarity = similarity;
        bestMatch = vector;
      }
    }

    // Only return matches above threshold, use different thresholds for different contexts
    const threshold = context ? 0.7 : 0.8;
    if (bestMatch && highestSimilarity > threshold) {
      return bestMatch.translation;
    }

    return null;
  }

  // Initialize with messages and organize by context
  initializeStore(messages: Record<string, Record<string, string>>) {
    Object.entries(messages).forEach(([locale, translations]) => {
      Object.entries(translations).forEach(([key, translation]) => {
        // Extract context from key pattern
        let context: string | undefined;
        if (key.startsWith('whitepaper.')) {
          context = 'whitepaper';
        } else if (key.startsWith('app.')) {
          context = 'app';
        }

        this.addTranslation(key, locale, translation, context);
      });
    });
  }
}

export const ragTranslator = new RAGTranslator();