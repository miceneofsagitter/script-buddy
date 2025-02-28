declare module 'pdfjs-dist/build/pdf' {
  export const GlobalWorkerOptions: {
    workerSrc: string;
  };
  export function getDocument(params: any): any;
  // Add other necessary exports based on your usage
}
