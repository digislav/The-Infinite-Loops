import { buildDuplicateDocumentName } from '@/lib/utils/documentNames';

describe('buildDuplicateDocumentName', () => {
  it('adds copy suffix to a fresh document name', () => {
    expect(buildDuplicateDocumentName('Resume - Frontend Engineer at Loop')).toBe(
      'Resume - Frontend Engineer at Loop (Copy)',
    );
  });

  it('increments an existing copy suffix', () => {
    expect(buildDuplicateDocumentName('Resume - Frontend Engineer at Loop (Copy)')).toBe(
      'Resume - Frontend Engineer at Loop (Copy 2)',
    );
  });

  it('increments numbered copy suffixes', () => {
    expect(buildDuplicateDocumentName('Resume - Frontend Engineer at Loop (Copy 4)')).toBe(
      'Resume - Frontend Engineer at Loop (Copy 5)',
    );
  });
});
