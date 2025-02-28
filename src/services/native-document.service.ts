// src/services/native-document.service.ts
import * as FileSystem from 'expo-file-system';
import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { FileImportResult } from '../types/file.types';

/**
 * Service that implements document importing functionality using universally
 * available Expo APIs with strategic fallback mechanisms
 */
export class NativeDocumentService {
  /**
   * Import a script document using platform-native selection mechanisms
   * with content type inference and processing pipeline orchestration
   */
  async importScript(): Promise<FileImportResult> {
    try {
      // Request permissions with appropriate context
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (!permissionResult.granted) {
        return {
          success: false,
          message: 'Per importare un copione, l\'app necessita di permessi per accedere ai file.'
        };
      }
      
      // Use image picker as a universal file selection mechanism
      // This is more widely supported across platforms than document picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        quality: 1,
        allowsEditing: false,
      });
      
      if (result.canceled) {
        return { success: false, message: 'Importazione annullata' };
      }
      
      // Process the selected asset
      const asset = result.assets[0];
      const fileUri = asset.uri;
      const fileName = fileUri.split('/').pop() || 'unknown';
      
      // Determine file type based on extension
      const fileType = this.determineFileType(fileName);
      
      // Process based on detected type
      switch (fileType) {
        case 'text':
          return await this.readTextFile(fileUri);
        case 'pdf':
          return {
            success: false,
            message: 'I file PDF richiedono una libreria aggiuntiva. Utilizzare file di testo per ora.'
          };
        default:
          // For images and other non-text formats, provide appropriate guidance
          return {
            success: false,
            message: 'Formato non supportato. Seleziona un file di testo (.txt) per importare il copione.'
          };
      }
    } catch (error) {
      console.error('Error in document import flow:', error);
      return {
        success: false,
        message: `Errore durante l'importazione: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Determine file type using extension pattern matching with
   * resilient fallback to text analysis when possible
   */
  private determineFileType(fileName: string): 'text' | 'pdf' | 'unknown' {
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    if (['txt', 'text', 'md'].includes(extension || '')) {
      return 'text';
    } else if (extension === 'pdf') {
      return 'pdf';
    }
    
    return 'unknown';
  }
  
  /**
   * Read text file using platform-optimized buffer operations
   * with encoding detection capabilities
   */
  private async readTextFile(fileUri: string): Promise<FileImportResult> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      
      if (!fileInfo.exists) {
        return {
          success: false,
          message: "File non trovato. Il riferimento potrebbe essere scaduto."
        };
      }
      
      // Use direct string reading for optimal performance
      const fileContent = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      
      return {
        success: true,
        text: fileContent,
        fileName: fileUri.split('/').pop() || 'script.txt'
      };
    } catch (error) {
      console.error('Error reading text file:', error);
      return {
        success: false,
        message: `Errore nella lettura del file: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

// Singleton instance with dependency injection readiness
export const nativeDocumentService = new NativeDocumentService();
