import 'jspdf';

declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: unknown) => jsPDF;
    lastAutoTable: {
      finalY: number;
    };
  }
}
