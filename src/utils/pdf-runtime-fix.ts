// This file contains runtime fixes necessary for PDF.js to work in a React Native environment.
// It must be imported before any PDF.js utilities are used.

global.TextDecoder = class TextDecoder {
  encoding: string;
  fatal: boolean;
  ignoreBOM: boolean;

  constructor(label?: string, options?: TextDecoderOptions) {
    this.encoding = label || 'utf-8';
    this.fatal = options?.fatal || false;
    this.ignoreBOM = options?.ignoreBOM || false;
  }

  decode(input?: Uint8Array, options?: { stream?: boolean }): string {
    // Implementation for decoding
    return ''; // Placeholder
  }
};

global.TextEncoder = class TextEncoder {
  encoding: string;

  constructor() {
    this.encoding = 'utf-8';
  }

  encode(input?: string): Uint8Array {
    // Implementation for encoding
    return new Uint8Array(); // Placeholder
  }

  encodeInto(source: string, destination: Uint8Array): { read: number; written: number } {
    // Implementation for encodeInto
    return { read: 0, written: 0 }; // Placeholder
  }
};

global.DOMException = class DOMException extends Error {
  INDEX_SIZE_ERR: number = 1;
  DOMSTRING_SIZE_ERR: number = 2;
  // Add other necessary properties

  constructor(message?: string, name?: string) {
    super(message);
    this.name = name || 'DOMException';
  }
};

global.Worker = class MockWorker {
  onmessage: (event: MessageEvent) => void;
  onmessageerror: (event: MessageEvent) => void;

  constructor(scriptURL: string | URL, options?: WorkerOptions) {
    // Implementation for MockWorker
  }

  postMessage(message: any): void {
    // Implementation for postMessage
  }

  terminate(): void {
    // Implementation for terminate
  }
};

// Additional necessary fixes can be added here
