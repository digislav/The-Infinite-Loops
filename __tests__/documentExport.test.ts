import { getDocumentPdfFileName, getDocumentPlainText } from '@/lib/utils/documentExport';

describe('document export helpers', () => {
  it('formats a cover letter as readable text', () => {
    const text = getDocumentPlainText({
      id: '1',
      type: 'cover_letter',
      name: 'Cover Letter - Product Designer at Loop',
      content: JSON.stringify({
        name: 'Camila Prado',
        location: 'New York, NY',
        links: {
          linkedin: 'linkedin.com/in/camila',
          portfolio: 'camilapr.do',
        },
        date: 'April 24, 2026',
        greeting: 'Dear Hiring Team,',
        body: 'I am excited to apply.',
        signoff: 'Sincerely,\nCamila Prado',
      }),
    });

    expect(text).toContain('Camila Prado');
    expect(text).toContain('linkedin.com/in/camila | camilapr.do');
    expect(text).toContain('Dear Hiring Team,');
    expect(text).toContain('I am excited to apply.');
  });

  it('formats a resume as readable text', () => {
    const text = getDocumentPlainText({
      id: '2',
      type: 'resume',
      name: 'Resume - Frontend Engineer at Loop',
      content: JSON.stringify({
        name: 'Camila Prado',
        headline: 'Frontend Engineer',
        location: 'Remote',
        summary: 'Builds polished interfaces.',
        experiences: [
          {
            role: 'Senior Engineer',
            company: 'Loop',
            dateRange: '2023-2026',
            bullets: ['Built shared UI systems', 'Improved dashboard performance'],
          },
        ],
        education: [
          {
            institution: 'State University',
            degree: 'BS',
            field: 'Computer Science',
            dateRange: '2019-2023',
          },
        ],
        skills: ['React', 'TypeScript'],
      }),
    });

    expect(text).toContain('PROFESSIONAL SUMMARY');
    expect(text).toContain('Senior Engineer at Loop (2023-2026)');
    expect(text).toContain('- Built shared UI systems');
    expect(text).toContain('BS in Computer Science - State University (2019-2023)');
    expect(text).toContain('React, TypeScript');
  });

  it('builds a stable pdf filename', () => {
    expect(
      getDocumentPdfFileName({
        id: '3',
        type: 'cover_letter',
        name: 'Cover Letter - Product Designer at Loop',
        content: '{}',
      }),
    ).toBe('cover_letter_product_designer_at_loop.pdf');
  });
});
