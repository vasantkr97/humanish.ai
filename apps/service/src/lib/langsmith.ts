import {
  generateText,
  generateObject,
  wrapLanguageModel,
  streamText,
  streamObject,
} from "ai";
import { wrapAISDK } from "langsmith/experimental/vercel";

// Wrap Vercel AI SDK functions with LangSmith tracing
// When LANGCHAIN_TRACING_V2=true, all calls are auto-traced with token usage
const traced = wrapAISDK({
  wrapLanguageModel,
  generateText,
  streamText,
  streamObject,
  generateObject,
});

export const tracedGenerateText = traced.generateText;
export const tracedGenerateObject = traced.generateObject;
