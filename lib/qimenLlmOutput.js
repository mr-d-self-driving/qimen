function normalizeQimenLlmOutput(raw) {
  if (Array.isArray(raw)) {
    const firstObject = raw.find(item => item && typeof item === 'object' && !Array.isArray(item));
    return firstObject || {};
  }

  if (raw && typeof raw === 'object') return raw;
  return {};
}

module.exports = {
  normalizeQimenLlmOutput
};
