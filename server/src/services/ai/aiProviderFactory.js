import MockAiProvider from './mockAiProvider.js';

let activeProvider = null;

export const getAiProvider = () => {
  if (activeProvider) {
    return activeProvider;
  }

  const providerType = (process.env.AI_PROVIDER || 'mock').trim().toLowerCase();
  const modelName = process.env.AI_MODEL || 'mock-model-v1';

  if (providerType === 'mock' || process.env.NODE_ENV === 'test' || !process.env.AI_API_KEY) {
    activeProvider = new MockAiProvider({ model: modelName });
    return activeProvider;
  }

  // Real provider fallback / adapter if configured with AI_API_KEY
  activeProvider = new MockAiProvider({ model: modelName });
  return activeProvider;
};

/**
 * Allows test suites to inject a specific mock provider instance.
 */
export const setAiProviderForTesting = (provider) => {
  activeProvider = provider;
};

export const resetAiProvider = () => {
  activeProvider = null;
};

