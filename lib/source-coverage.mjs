import {sourceBlocks} from './source-sections.mjs';

const normalized = text => text.normalize('NFKC').toLowerCase().replace(/\s+/g,' ').trim();

// A quotation check is a review aid. It cannot establish semantic coverage or scope.
export function sourceWithoutStepEvidence(process, locale='en') {
  const segmenter = new Intl.Segmenter(locale, {granularity:'sentence'});
  const evidence = process.nodes.filter(node=>['activity','decision'].includes(node.type))
    .map(node=>normalized(node.evidence||'')).filter(quote=>quote.split(' ').length>=2);
  const passages = new Set();
  for (const block of sourceBlocks(process.source)) {
    if (block.future && process.mode==='as-is') continue;
    for (const line of block.text.split('\n')) {
      if (/^\s*#/.test(line)) continue;
      for (const {segment} of segmenter.segment(line)) {
        const text = segment.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim();
        const key = normalized(text).replace(/[.!?]+$/, '');
        if (key.split(' ').length < 4) continue;
        if (!evidence.some(quote=>key.includes(quote.replace(/[.!?]+$/, ''))||quote.includes(key))) passages.add(text);
      }
    }
  }
  return [...passages];
}
