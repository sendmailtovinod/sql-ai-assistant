import Anthropic from '@anthropic-ai/sdk'
import { wrapSDK } from 'langsmith/wrappers'

// When LANGCHAIN_API_KEY + LANGCHAIN_TRACING_V2=true are set, all calls are
// automatically traced. When keys are absent the client works normally.
export const anthropic = wrapSDK(new Anthropic())
