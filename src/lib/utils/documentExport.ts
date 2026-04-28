export type SavedDocumentType = 'cover_letter' | 'resume';

export interface SavedDocumentForExport {
  id: string;
  type: SavedDocumentType;
  name: string;
  content: string;
}

interface CoverLetterContent {
  name?: string;
  location?: string;
  links?: {
    linkedin?: string | null;
    github?: string | null;
    portfolio?: string | null;
  };
  date?: string;
  greeting?: string;
  body?: string;
  signoff?: string;
}

interface ResumeContent {
  name?: string;
  headline?: string;
  location?: string;
  links?: {
    linkedin?: string | null;
    github?: string | null;
    portfolio?: string | null;
  };
  summary?: string;
  experiences?: {
    company?: string;
    role?: string;
    dateRange?: string;
    bullets?: string[];
  }[];
  education?: {
    institution?: string;
    degree?: string;
    field?: string;
    dateRange?: string;
  }[];
  skills?: string[];
}

function compact(lines: Array<string | undefined | null>): string[] {
  return lines.filter((line): line is string => Boolean(line && line.trim()));
}

function escapeHtml(value?: string | null): string {
  if (!value) return '';

  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatLinkLine(links?: {
  linkedin?: string | null;
  github?: string | null;
  portfolio?: string | null;
}) {
  return compact([
    links?.linkedin && links.linkedin !== 'None' ? links.linkedin : null,
    links?.github && links.github !== 'None' ? links.github : null,
    links?.portfolio && links.portfolio !== 'None' ? links.portfolio : null,
  ]);
}

export function parseDocumentContent<T>(content: string): T | null {
  try {
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export function getDocumentPlainText(doc: SavedDocumentForExport): string {
  if (doc.type === 'cover_letter') {
    const parsed = parseDocumentContent<CoverLetterContent>(doc.content);
    if (!parsed) return doc.content;

    const linkLine = formatLinkLine(parsed.links).join(' | ');

    return compact([
      parsed.name,
      parsed.location,
      linkLine,
      '',
      parsed.date,
      '',
      parsed.greeting,
      '',
      parsed.body,
      '',
      parsed.signoff,
    ]).join('\n');
  }

  const parsed = parseDocumentContent<ResumeContent>(doc.content);
  if (!parsed) return doc.content;

  const linkLine = formatLinkLine(parsed.links).join(' | ');

  const experienceLines =
    parsed.experiences?.flatMap((experience) => {
      const header = compact([
        experience.role,
        experience.company ? `at ${experience.company}` : undefined,
        experience.dateRange ? `(${experience.dateRange})` : undefined,
      ]).join(' ');

      return compact([header, ...(experience.bullets?.map((bullet) => `- ${bullet}`) ?? []), '']);
    }) ?? [];

  const educationLines =
    parsed.education?.map((education) =>
      compact([
        education.degree,
        education.field ? `in ${education.field}` : undefined,
        education.institution ? `- ${education.institution}` : undefined,
        education.dateRange ? `(${education.dateRange})` : undefined,
      ]).join(' '),
    ) ?? [];

  return compact([
    compact([parsed.name, parsed.headline, parsed.location, linkLine]).join('\n'),
    parsed.summary ? `PROFESSIONAL SUMMARY\n${parsed.summary}` : '',
    experienceLines.length > 0 ? `EXPERIENCE\n${experienceLines.join('\n')}` : '',
    educationLines.length > 0 ? `EDUCATION\n${educationLines.join('\n')}` : '',
    parsed.skills?.length ? `SKILLS\n${parsed.skills.join(', ')}` : '',
  ]).join('\n\n');
}

export function getDocumentBaseFileName(doc: SavedDocumentForExport): string {
  const normalizedName = (doc.name || 'document')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');

  return normalizedName || 'document';
}

export function getDocumentDownloadFileName(doc: SavedDocumentForExport): string {
  return `${getDocumentBaseFileName(doc)}.txt`;
}

export function getDocumentPdfFileName(doc: SavedDocumentForExport): string {
  return `${getDocumentBaseFileName(doc)}.pdf`;
}

function buildCoverLetterHtml(parsed: CoverLetterContent) {
  const links = formatLinkLine(parsed.links);

  return `
    <div style="display:flex;flex-direction:column;gap:16px;color:#111827;font-family:Georgia,'Times New Roman',serif;">
      <div>
        <h1 style="margin:0 0 4px;font-size:24px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(parsed.name)}</h1>
        <p style="margin:0;font-size:14px;">${escapeHtml(parsed.location)}</p>
        ${
          links.length > 0
            ? `<div style="margin-top:8px;font-size:12px;color:#2E75B6;">${links
                .map((link) => `<span style="margin-right:16px;">${escapeHtml(link)}</span>`)
                .join('')}</div>`
            : ''
        }
      </div>
      <p style="margin:0;font-size:14px;">${escapeHtml(parsed.date)}</p>
      <p style="margin:0;font-size:14px;">${escapeHtml(parsed.greeting)}</p>
      <p style="margin:0;font-size:14px;line-height:1.8;white-space:pre-wrap;">${escapeHtml(parsed.body)}</p>
      <p style="margin:0;font-size:14px;white-space:pre-wrap;">${escapeHtml(parsed.signoff)}</p>
    </div>
  `;
}

function buildResumeHtml(parsed: ResumeContent) {
  const links = formatLinkLine(parsed.links);
  const experiences =
    parsed.experiences
      ?.map(
        (experience) => `
          <div style="display:flex;flex-direction:column;gap:6px;">
            <div style="display:flex;justify-content:space-between;gap:16px;align-items:baseline;">
              <h3 style="margin:0;font-size:14px;font-weight:700;">${escapeHtml(experience.role)}</h3>
              <span style="font-size:12px;font-weight:600;">${escapeHtml(experience.dateRange)}</span>
            </div>
            <div style="font-size:14px;font-style:italic;">${escapeHtml(experience.company)}</div>
            <ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:4px;">
              ${(experience.bullets ?? [])
                .map(
                  (bullet) =>
                    `<li style="font-size:14px;line-height:1.6;">${escapeHtml(bullet)}</li>`,
                )
                .join('')}
            </ul>
          </div>
        `,
      )
      .join('') ?? '';

  const education =
    parsed.education
      ?.map(
        (item) => `
          <div style="display:flex;justify-content:space-between;gap:16px;align-items:baseline;">
            <div>
              <div style="font-size:14px;font-weight:700;">${escapeHtml(item.institution)}</div>
              <div style="font-size:14px;font-style:italic;">${escapeHtml(item.degree)} in ${escapeHtml(item.field)}</div>
            </div>
            <div style="font-size:12px;font-weight:600;">${escapeHtml(item.dateRange)}</div>
          </div>
        `,
      )
      .join('') ?? '';

  return `
    <div style="width:100%;color:#111827;font-size:14px;">
      <div style="display:flex;flex-direction:column;gap:24px;">
        <div style="border-bottom:2px solid #111827;padding-bottom:16px;text-align:center;">
          <h1 style="margin:0;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(parsed.name)}</h1>
          <p style="margin:4px 0 0;font-size:14px;font-weight:500;">${escapeHtml(parsed.headline)}</p>
          <p style="margin:2px 0 0;font-size:12px;color:#4B5563;">${escapeHtml(parsed.location)}</p>
          ${
            links.length > 0
              ? `<div style="margin-top:8px;display:flex;justify-content:center;flex-wrap:wrap;gap:16px;font-size:12px;font-weight:600;color:#2E75B6;">${links
                  .map((link) => `<span>${escapeHtml(link)}</span>`)
                  .join('')}</div>`
              : ''
          }
        </div>
        <div>
          <h2 style="margin:0 0 8px;border-bottom:1px solid #D1D5DB;padding-bottom:4px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Professional Summary</h2>
          <p style="margin:0;font-size:14px;line-height:1.8;">${escapeHtml(parsed.summary)}</p>
        </div>
        <div>
          <h2 style="margin:0 0 8px;border-bottom:1px solid #D1D5DB;padding-bottom:4px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Experience</h2>
          <div style="display:flex;flex-direction:column;gap:16px;">${experiences}</div>
        </div>
        <div>
          <h2 style="margin:0 0 8px;border-bottom:1px solid #D1D5DB;padding-bottom:4px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Education</h2>
          <div style="display:flex;flex-direction:column;gap:12px;">${education}</div>
        </div>
        <div>
          <h2 style="margin:0 0 8px;border-bottom:1px solid #D1D5DB;padding-bottom:4px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;">Skills</h2>
          <p style="margin:0;font-size:14px;line-height:1.8;">${escapeHtml(parsed.skills?.join(', '))}</p>
        </div>
      </div>
    </div>
  `;
}

function buildDocumentExportHtml(doc: SavedDocumentForExport) {
  if (doc.type === 'cover_letter') {
    const parsed = parseDocumentContent<CoverLetterContent>(doc.content);
    return parsed ? buildCoverLetterHtml(parsed) : `<pre>${escapeHtml(doc.content)}</pre>`;
  }

  const parsed = parseDocumentContent<ResumeContent>(doc.content);
  return parsed ? buildResumeHtml(parsed) : `<pre>${escapeHtml(doc.content)}</pre>`;
}

// Opens the document in a new window and triggers the browser's native
// print dialog. The user selects "Save as PDF" (or their printer).
// This replaces html2pdf.js which was unreliable in Next.js due to
// html2canvas failing silently on off-screen elements.
export function exportDocumentPdf(doc: SavedDocumentForExport): void {
  const html = buildDocumentExportHtml(doc);
  const title = escapeHtml(doc.name);

  const pageHtml =
    '<!DOCTYPE html><html lang="en"><head>' +
    '<meta charset="utf-8"><title>' +
    title +
    '</title>' +
    '<style>' +
    '*,*::before,*::after{box-sizing:border-box;}' +
    'body{margin:0;padding:0.75in;font-family:Arial,Helvetica,sans-serif;color:#111827;background:#fff;}' +
    'h1,h2,h3,p,ul{margin:0;}ul{padding-left:1.25em;}' +
    '@media print{body{padding:0.5in;}@page{margin:0.5in;size:letter portrait;}}' +
    '</style></head><body>' +
    html +
    '</body></html>';

  const blob = new Blob([pageHtml], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  const printWindow = window.open(url, '_blank', 'width=900,height=1100');
  if (!printWindow) {
    URL.revokeObjectURL(url);
    throw new Error('Allow popups for this site to export PDF.');
  }

  printWindow.addEventListener('load', () => {
    URL.revokeObjectURL(url);
    printWindow.focus();
    printWindow.print();
    printWindow.addEventListener('afterprint', () => printWindow.close());
  });
}
