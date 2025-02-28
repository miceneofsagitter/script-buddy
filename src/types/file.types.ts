// src/types/file.types.ts

/**
 * Represents the result of a file import operation with comprehensive status information
 * Uses discriminated union pattern for type-safe result handling
 */
export interface FileImportResult {
  success: boolean;
  message?: string;
  text?: string;
  fileName?: string;
}

/**
 * Defines file formats supported by the application's document processing pipeline
 * Extensible enum for future format support
 */
export enum FileFormat {
  PDF = 'pdf',
  TEXT = 'text',
  DOCX = 'docx', // Reserved for future implementation
  FOUNTAIN = 'fountain', // Reserved for screenplay format support
  UNKNOWN = 'unknown'
}

/**
 * Configuration options for file processing operations
 * Allows for customized behavior in various file handling contexts
 */
export interface FileProcessingOptions {
  preserveFormatting?: boolean;
  extractMetadata?: boolean;
  detectEncoding?: boolean;
  maxSizeBytes?: number;
}

/**
 * Document metadata extracted during processing
 * Provides structural information about imported scripts
 */
export interface DocumentMetadata {
  title?: string;
  author?: string;
  creationDate?: Date;
  modificationDate?: Date;
  pageCount?: number;
  format: FileFormat;
}
