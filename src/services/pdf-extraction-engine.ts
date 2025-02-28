// src/services/pdf-extraction.service.ts
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Engine specializzato per l'estrazione e l'analisi di testo da documenti PDF
 * con fix per l'errore del worker
 */
export class PdfExtractionEngine {
  // Riferimento alla libreria PDF.js
  private pdfLib: any = null;
  private isInitialized: boolean = false;

  /**
   * Inizializza l'engine PDF con configurazione corretta del worker
   */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      // Caricamento esplicito della versione legacy (senza worker) di PDF.js
      // La versione legacy è più stabile in React Native
      const pdfjs = await import('pdfjs-dist/legacy/build/pdf');
      
      // Configurazione critica: disabiliamo il worker per React Native
      // In React Native, utilizziamo l'elaborazione sincrona senza worker
      if (pdfjs) {
        // Impedisce a PDF.js di cercare un worker esterno
        pdfjs.GlobalWorkerOptions = pdfjs.GlobalWorkerOptions || {};
pdfjs.GlobalWorkerOptions.workerSrc = ''; // Stringa vuota per disabilitare il worker
console.log('GlobalWorkerOptions:', pdfjs.GlobalWorkerOptions); // Log worker options for debugging
        
        // Forza la modalità senza worker
        pdfjs.disableWorker = true;
        
        this.pdfLib = pdfjs;
        this.isInitialized = true;
        console.log('PDF Engine inizializzato correttamente senza worker');
        return true;
      }
      
      throw new Error('Impossibile caricare PDF.js');
    } catch (error) {
      console.error('Errore durante l\'inizializzazione dell\'engine PDF:', error);
      
      // Secondo tentativo con approccio alternativo
      try {
        console.log('Tentativo alternativo di inizializzazione PDF.js...');
        // Importazione diretta senza worker
        const pdfjsLib = await import('pdfjs-dist/build/pdf');
        
        // Configurazione manuale
        pdfjsLib.GlobalWorkerOptions.workerSrc = '';
        this.pdfLib = pdfjsLib;
        this.isInitialized = true;
        return true;
      } catch (fallbackError) {
        console.error('Fallimento anche del metodo alternativo:', fallbackError);
        return false;
      }
    }
  }

  /**
   * Estrae il testo da un documento PDF
   */
  async extractTextFromPdf(fileUri: string, fileName: string): Promise<any> {
    try {
      // Assicura che l'engine sia inizializzato
      if (!this.isInitialized) {
        const initialized = await this.initialize();
        if (!initialized) {
          return {
            success: false,
            message: "Impossibile inizializzare l'engine PDF. Riavvia l'app e riprova."
          };
        }
      }

      // Leggi il file PDF come array buffer
      console.log('Lettura file PDF:', fileUri);
      const fileContent = await FileSystem.readAsStringAsync(fileUri, { 
        encoding: FileSystem.EncodingType.Base64
      });
      
      // Converte da Base64 a ArrayBuffer
      const pdfData = this.base64ToArrayBuffer(fileContent);
      
      console.log('File PDF letto, dimensione:', pdfData.byteLength);
      
      // Configurazione specifica per evitare l'uso del worker
      const loadingTask = this.pdfLib.getDocument({
        data: pdfData,
        disableWorker: true,  // Forza modalità senza worker
        isEvalSupported: false,  // Impedisce tentativi di valutazione dinamica
        nativeImageDecoderSupport: 'none' // Disabilita decoder nativi
      });
      
      console.log('Avvio caricamento PDF...');
      const pdf = await loadingTask.promise;
      console.log('PDF caricato con successo, pagine:', pdf.numPages);
      
      // Estrae il testo da tutte le pagine
      let extractedText = '';
      let characterNames = new Set<string>();
      let scriptStructure = {
        hasDialogue: false,
        hasCharacterNames: false,
        hasSceneMarkers: false
      };
      
      // Processa tutte le pagine sequenzialmente
      for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`Elaborazione pagina ${i}/${pdf.numPages}...`);
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        
        // Analizza il contenuto della pagina
        let pageText = '';
        let lastY = -1;
        let currentLine = '';
        
        // Ricostruisce il testo rispettando il layout della pagina
        for (const item of content.items) {
          if ('str' in item) {
            // Rileva cambi di riga basati sulla posizione Y
            if (lastY !== -1 && Math.abs(item.transform[5] - lastY) > 2) {
              pageText += currentLine + '\n';
              currentLine = '';
              
              // Analizza la linea completata per pattern di script
              this.analyzeLineForScriptPatterns(currentLine, characterNames, scriptStructure);
            }
            
            currentLine += item.str;
            lastY = item.transform[5];
          }
        }
        
        // Aggiungi l'ultima linea
        if (currentLine) {
          pageText += currentLine + '\n';
          this.analyzeLineForScriptPatterns(currentLine, characterNames, scriptStructure);
        }
        
        extractedText += pageText + '\n';
      }
      
      console.log('Estrazione testo completata, pulizia e formattazione...');
      
      // Post-elaborazione del testo estratto
      const processedText = this.postProcessExtractedText(extractedText, characterNames, scriptStructure);
      
      // Rilascia le risorse PDF.js
      pdf.destroy();
      
      return {
        success: true,
        text: processedText,
        fileName: fileName,
        metadata: {
          pageCount: pdf.numPages,
          characterCount: extractedText.length,
          detectedCharacters: Array.from(characterNames),
          isLikelyScript: scriptStructure.hasDialogue && scriptStructure.hasCharacterNames
        }
      };
    } catch (error) {
      console.error('Errore durante l\'estrazione del testo dal PDF:', error);
      
      // Gestione specifica per errore worker
      if (error.message && error.message.includes('worker')) {
        return {
          success: false,
          message: "Problema con il worker PDF. Usa il metodo alternativo di importazione da appunti."
        };
      }
      
      return {
        success: false,
        message: `Errore nell'elaborazione del PDF: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }

  /**
   * Converte una stringa Base64 in ArrayBuffer
   */
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    try {
      // Rimuovi eventuali prefissi data URL se presenti
      const cleanBase64 = base64.replace(/^data:[^;]+;base64,/, '');
      
      // Implementazione atob cross-platform
      const binaryString = this.atobPolyfill(cleanBase64);
      const bytes = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      return bytes.buffer;
    } catch (error) {
      console.error('Errore nella conversione Base64 → ArrayBuffer:', error);
      throw new Error('Errore durante la preparazione del file PDF');
    }
  }
  
  /**
   * Implementazione cross-platform di atob compatibile con React Native
   */
  private atobPolyfill(base64: string): string {
    // Implementazione di atob
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';
    
    // Implementazione basata su indici per React Native
    let i = 0;
    do {
      const enc1 = chars.indexOf(base64.charAt(i++));
      const enc2 = chars.indexOf(base64.charAt(i++));
      const enc3 = chars.indexOf(base64.charAt(i++));
      const enc4 = chars.indexOf(base64.charAt(i++));
      
      const chr1 = (enc1 << 2) | (enc2 >> 4);
      const chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      const chr3 = ((enc3 & 3) << 6) | enc4;
      
      output = output + String.fromCharCode(chr1);
      
      if (enc3 !== 64) {
        output = output + String.fromCharCode(chr2);
      }
      if (enc4 !== 64) {
        output = output + String.fromCharCode(chr3);
      }
    } while (i < base64.length);
    
    return output;
  }
  
  /**
   * Analizza una linea di testo per rilevare pattern di script teatrali
   */
  private analyzeLineForScriptPatterns(
    line: string, 
    characterNames: Set<string>,
    scriptStructure: { hasDialogue: boolean; hasCharacterNames: boolean; hasSceneMarkers: boolean; }
  ): void {
    // Implementazione non modificata
    const characterMatch = line.match(/^([A-Z][A-Za-z\s]+):/);
    if (characterMatch) {
      characterNames.add(characterMatch[1].trim());
      scriptStructure.hasCharacterNames = true;
    }
    
    if (line.includes(':') && line.split(':')[1].trim().length > 0) {
      scriptStructure.hasDialogue = true;
    }
    
    if (/^(ATTO|SCENA|ACT|SCENE)\s+[IVX\d]+/i.test(line.trim())) {
      scriptStructure.hasSceneMarkers = true;
    }
  }

  /**
   * Post-elabora il testo estratto per migliorare la struttura e la leggibilità
   */
  private postProcessExtractedText(
    text: string,
    characterNames: Set<string>,
    scriptStructure: { hasDialogue: boolean; hasCharacterNames: boolean; hasSceneMarkers: boolean; }
  ): string {
    // Implementazione non modificata
    if (scriptStructure.hasDialogue && scriptStructure.hasCharacterNames) {
      let processed = text.replace(/\n{3,}/g, '\n\n');
      
      characterNames.forEach(name => {
        const regex = new RegExp(`^(${name}:)`, 'gm');
        processed = processed.replace(regex, '$1');
      });
      
      if (scriptStructure.hasSceneMarkers) {
        processed = processed.replace(/^(ATTO|SCENA|ACT|SCENE)\s+([IVX\d]+)/gim, '\n\n$1 $2\n');
      }
      
      return processed;
    }
    
    return text;
  }
}

// Istanza singleton
export const pdfExtractionEngine = new PdfExtractionEngine();
