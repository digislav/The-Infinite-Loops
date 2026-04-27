declare module 'html2pdf.js' {
  interface Html2PdfInstance {
    set(options: {
      margin?: number;
      filename?: string;
      image?: {
        type?: string;
        quality?: number;
      };
      html2canvas?: {
        scale?: number;
        useCORS?: boolean;
        backgroundColor?: string;
      };
      jsPDF?: {
        unit?: string;
        format?: string;
        orientation?: string;
      };
    }): Html2PdfInstance;
    from(element: HTMLElement): Html2PdfInstance;
    save(): Promise<void>;
  }

  export default function html2pdf(): Html2PdfInstance;
}
