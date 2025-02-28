// src/services/pdf.service.ts
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import { Platform, Alert } from 'react-native';
import { FileImportResult } from '../types/file.types';
import { pdfExtractionEngine } from './pdf-extraction-engine';

/**
 * Servizio PDF ottimizzato per tutte le piattaforme incluso iOS
 * con gestione specifica per problemi di codifica
 */
export class PdfService {
  /**
   * Importa un PDF selezionato dall'utente ed estrae il testo utilizzando
   * tecniche compatibili con iOS
   */
  async importPdfScript(): Promise<FileImportResult> {
    try {
      console.log('Avvio processo di importazione PDF, piattaforma:', Platform.OS);
      
      // Verifica di inizializzazione per l'engine di estrazione
      const engineInitialized = await pdfExtractionEngine.initialize();
      if (!engineInitialized) {
        return { 
          success: false, 
          message: "Impossibile inizializzare il motore di estrazione PDF. Verifica la connessione e riprova." 
        };
      }
      
      // Selezione del documento con interfaccia nativa e opzioni migliorate per iOS
      const options = {
        type: ['application/pdf'],
        copyToCacheDirectory: true,
        // Opzioni specifiche per iOS per migliorare la compatibilità
        ...Platform.select({
          ios: {
            transitionStyle: 'coverVertical', // Stile di transizione più fluido per iOS
            presentationStyle: 'pageSheet', // Miglior UX su iOS
          },
          default: {}
        })
      };
      
      const result = await DocumentPicker.getDocumentAsync(options);
      
      if (result.canceled) {
        return { success: false, message: 'Selezione PDF annullata' };
      }
      
      const file = result.assets[0];
      const fileUri = file.uri;
      const fileName = file.name || 'documento.pdf';
      
      // Verifica del tipo di file
      if (!this.isPdfFile(file.mimeType || '', fileName)) {
        return { 
          success: false, 
          message: 'Il file selezionato non è un PDF valido. Seleziona un file PDF contenente il copione.' 
        };
      }
      
      // Verifica dimensione file con gestione specifica per piattaforma
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      const sizeLimitMB = Platform.OS === 'ios' ? 10 : 20; // Limite più restrittivo per iOS
      
      if (fileInfo.exists && fileInfo.size > sizeLimitMB * 1024 * 1024) {
        return {
          success: false,
          message: `Il file PDF è troppo grande (>${sizeLimitMB}MB). I file più piccoli sono elaborati meglio.`
        };
      }
      
      // Avvisa l'utente che l'estrazione è in corso (solo iOS)
      if (Platform.OS === 'ios') {
        // Durante i test, un messaggio all'utente può aiutare con la pazienza
        console.log('Estrazione testo PDF in corso su iOS...');
      }
      
      // Usa l'engine di estrazione ottimizzato per iOS
      console.log('Estrazione testo da PDF:', fileName);
      const extractionResult = await pdfExtractionEngine.extractTextFromPdf(fileUri, fileName);
      
      // Gestione risposta con supporto codifica migliorato
      if (!extractionResult.success) {
        // Se c'è un errore specifico di codifica su iOS, offri soluzioni alternative
        if (Platform.OS === 'ios' && (
          extractionResult.message?.includes('codifica') || 
          extractionResult.message?.includes('encoding')
        )) {
          // Suggerimento soluzione alternativa specifica per iOS
          return {
            success: false,
            message: "Il PDF non può essere elaborato correttamente su iOS. Prova a: 1) Usare un file di testo, 2) Copiare il testo negli appunti, o 3) Provare un PDF più semplice.",
            alternativeSolutions: true
          };
        }
        
        return extractionResult;
      }
      
      return {
        success: true,
        text: extractionResult.text,
        fileName: fileName,
        metadata: extractionResult.metadata
      };
      
    } catch (error) {
      console.error('Errore critico nel flusso di importazione PDF:', error);
      
      // Gestione specifica errori per iOS
      if (Platform.OS === 'ios') {
        if (error instanceof Error && (
          error.message.includes('permission') || 
          error.message.includes('permesso')
        )) {
          return { 
            success: false, 
            message: "Permessi insufficienti per accedere al file. Per favore consenti l'accesso ai file nelle impostazioni dell'app." 
          };
        }
        
        // Errori più comuni su iOS
        return { 
          success: false, 
          message: "Errore durante l'elaborazione del PDF su iOS. Prova con un file di testo o copia il contenuto negli appunti." 
        };
      }
      
      return { 
        success: false, 
        message: `Errore durante l'elaborazione del PDF: ${error instanceof Error ? error.message : String(error)}. Prova con un altro file o formato.` 
      };
    }
  }
  
  /**
   * Verifica che il file sia un PDF valido con logica migliorata
   */
  private isPdfFile(mimeType: string, fileName: string): boolean {
    // Normalizzazione degli input
    const normalizedMime = (mimeType || '').toLowerCase().trim();
    const normalizedName = (fileName || '').toLowerCase().trim();
    
    // Verifica MIME type con più varianti
    if (['application/pdf', 'application/x-pdf', 'binary/octet-stream'].includes(normalizedMime)) {
      return true;
    }
    
    // Verifica estensione con logica migliorata per iOS che a volte dà MIME types errati
    const extension = normalizedName.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') {
      return true;
    }
    
    return false;
  }
  
  /**
   * Metodo alternativo per importare testo da appunti
   * utile come fallback per PDF problematici su iOS
   */
  async importTextFromClipboard(): Promise<FileImportResult> {
    try {
      // Questa funzione andrebbe implementata nel servizio di acquisizione contenuti
      // ma la includo qui come suggerimento per un'alternativa all'importazione PDF
      
      return {
        success: true,
        text: "Implementare questa funzione nel contentAcquisitionService come alternativa all'importazione PDF su iOS",
        fileName: "Dagli appunti",
        useClipboardInstead: true
      };
    } catch (error) {
      return {
        success: false,
        message: "Errore durante l'accesso agli appunti"
      };
    }
  }
}

// Singleton per utilizzo applicativo
export const pdfService = new PdfService();
