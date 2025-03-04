import OpenAI from "openai";
import type { StandardizedData, ProcessedMetrics } from '../types/lumira';
import { dimensionalBalancer } from './dimension-balance';

if (!process.env.XAI_API_KEY) {
  throw new Error('XAI_API_KEY environment variable is required');
}

if (!process.env.XAI_BASE_URL) {
  throw new Error('XAI_BASE_URL environment variable is required');
}

const openai = new OpenAI({ 
  baseURL: process.env.XAI_BASE_URL,
  apiKey: process.env.XAI_API_KEY 
});

/**
 * AI Interpreter Service for processing system evolution metrics
 */
class AIInterpreter {
  private async analyzeEvolutionMetrics(metrics: StandardizedData): Promise<ProcessedMetrics> {
    try {
      const response = await openai.chat.completions.create({
        model: "grok-2-1212",
        messages: [
          {
            role: "system",
            content: "You are an expert system analyzing dimensional evolution metrics. Interpret the data and provide insights in JSON format."
          },
          {
            role: "user",
            content: JSON.stringify(metrics)
          }
        ],
        response_format: { type: "json_object" }
      });

      // Handle potential null response content
      const content = response.choices[0].message.content;
      if (!content) {
        throw new Error('No analysis content received from AI');
      }

      const analysis = JSON.parse(content);

      return {
        success: true,
        aggregatedMetrics: {
          count: metrics.metadata.dimensionalContext?.currentDimensions || 0,
          aggregates: {
            avgEnergy: analysis.averageEnergy || 0,
            avgPressure: analysis.systemPressure || 0,
            avgEquilibrium: analysis.systemEquilibrium || 0,
            dimensionalDiversity: analysis.dimensionalDiversity || 0
          },
          lastUpdated: new Date()
        }
      };
    } catch (error) {
      console.error('Error analyzing evolution metrics:', error);
      throw new Error('Failed to analyze evolution metrics');
    }
  }

  /**
   * Process incoming metrics with AI interpretation
   */
  public async interpretMetrics(data: StandardizedData): Promise<ProcessedMetrics> {
    try {
      // Add current dimensional state to context
      const dimensionalState = dimensionalBalancer.getDimensionalState();
      data.metadata.dimensionalContext = {
        currentDimensions: dimensionalState.length,
        totalEnergy: dimensionalState.reduce((sum, dim) => sum + dim.energy, 0),
        systemEquilibrium: dimensionalState.reduce((sum, dim) => sum + dim.equilibrium, 0) / dimensionalState.length
      };

      // Process metrics based on type
      switch (data.type) {
        case 'evolution':
        case 'reflection':
          return this.analyzeEvolutionMetrics(data);
        default:
          throw new Error(`Unsupported metric type: ${data.type}`);
      }
    } catch (error) {
      console.error('Error interpreting metrics:', error);
      throw error;
    }
  }
}

export const aiInterpreter = new AIInterpreter();