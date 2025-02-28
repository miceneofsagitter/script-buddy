// src/services/pdf-text-extraction.js
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Modulo specializzato per l'estrazione di testo da PDF
 * Implementa tecniche native per React Native senza dipendere da PDF.js
 */
class PdfTextExtraction {
  /**
   * Estrae il testo da un PDF usando un approccio custom senza dipendere da libraries esterne
   * 
   * @param {string} fileUri URI locale del file PDF
   * @returns {Promise<string>} Testo estratto dal PDF
   */
  async extractText(fileUri) {
    try {
      console.log('Inizio estrazione testo da PDF:', fileUri);
      
      // Leggi il file come base64
      const base64Data = await FileSystem.readAsStringAsync(fileUri, { 
        encoding: FileSystem.EncodingType.Base64 
      });
      
      if (!base64Data || base64Data.length < 100) {
        throw new Error('File PDF non valido o vuoto');
      }
      
      console.log(`PDF caricato, dimensione: ${Math.round(base64Data.length / 1024)} KB`);
      
      // Estraiamo il testo direttamente dal PDF utilizzando regex patterns
      // Questo metodo è limitato ma funziona con molti PDF semplici
      return this.extractTextFromBinary(base64Data);
    } catch (error) {
      console.error('Errore durante estrazione testo PDF:', error);
      throw error;
    }
  }
  
  /**
   * Estrae il testo direttamente dai byte del PDF senza dipendere da librerie esterne
   * Implementazione basata su pattern matching per PDF standard
   * 
   * @param {string} base64Data Il contenuto del PDF in formato base64
   * @returns {string} Il testo estratto
   */
  extractTextFromBinary(base64Data) {
    try {
      // Conversione da base64 a stringa binaria
      const binaryData = atob(base64Data);
      
      // Estrattore di testo basato su pattern regex
      // PDF utilizza oggetti di testo nel formato "(testo)"
      const results = [];
      
      // Cerchiamo stringhe di testo nel formato tipico dei PDF
      // Questa è una versione semplificata che non gestisce tutti i casi
      // ma funziona per molti PDF di base
      const textMatchRegex = /\(([^\)\\]+)\)/g;
      
      // Limita la ricerca a una porzione ragionevole del file per performance
      // ed evitare errori di memoria
      const searchableData = binaryData.substring(0, Math.min(binaryData.length, 5 * 1024 * 1024));
      
      let match;
      let extractedPieces = [];
      
      // Estrazione basata su pattern matching
      while ((match = textMatchRegex.exec(searchableData)) !== null) {
        if (match[1] && match[1].length > 1) {
          // Pulisci il testo estratto
          const cleanText = this.cleanPdfText(match[1]);
          if (cleanText.length > 0) {
            extractedPieces.push(cleanText);
          }
        }
      }
      
      // Post-processing e organizzazione del testo estratto
      return this.organizeExtractedText(extractedPieces);
    } catch (error) {
      console.error('Errore durante parsing PDF binario:', error);
      return "Errore nell'estrazione del testo. Il PDF potrebbe essere crittografato o in un formato non supportato.";
    }
  }
  
  /**
   * Pulisce il testo estratto dal PDF da caratteri di controllo e markup
   * 
   * @param {string} text Testo grezzo estratto
   * @returns {string} Testo pulito
   */
  cleanPdfText(text) {
    if (!text) return '';
    
    // Rimuove caratteri di controllo e non stampatili
    let cleaned = text.replace(/[\x00-\x09\x0B-\x0C\x0E-\x1F\x7F-\x9F]/g, '');
    
    // Gestisce spazi e layout
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    
    return cleaned;
  }
  
  /**
   * Organizza i frammenti di testo estratti in un documento coerente
   * Utilizza euristiche per ricostruire paragrafi e struttura
   * 
   * @param {string[]} textPieces Array di frammenti di testo
   * @returns {string} Testo organizzato
   */
  organizeExtractedText(textPieces) {
    if (!textPieces || textPieces.length === 0) {
      return "Nessun testo estratto dal PDF.";
    }
    
    // Applica euristiche per ricostruire la struttura del documento
    let result = '';
    let currentLine = '';
    
    // Identifica potenziali nomi di personaggi (per copioni teatrali)
    const characterPattern = /^([A-Z][A-Za-z\s]+):/;
    
    textPieces.forEach((piece, index) => {
      // Se sembra un nuovo nome di personaggio, inizia una nuova linea
      if (characterPattern.test(piece)) {
        // Salva la linea precedente se presente
        if (currentLine.length > 0) {
          result += currentLine.trim() + '\n\n';
          currentLine = '';
        }
        // Aggiunge la nuova linea con il personaggio
        result += piece;
      }
      // Se è probabilmente fine di una frase, completa il paragrafo
      else if (piece.trim().endsWith('.') || 
               piece.trim().endsWith('!') || 
               piece.trim().endsWith('?')) {
        currentLine += ' ' + piece;
        result += currentLine.trim() + '\n\n';
        currentLine = '';
      }
      // Se sembra un titolo o un'intestazione
      else if (piece === piece.toUpperCase() && piece.length > 3 && piece.length < 30) {
        // Salva la linea precedente se presente
        if (currentLine.length > 0) {
          result += currentLine.trim() + '\n\n';
          currentLine = '';
        }
        // Aggiungi il titolo
        result += piece + '\n\n';
      }
      // Altrimenti continua la linea corrente
      else {
        currentLine += ' ' + piece;
      }
    });
    
    // Aggiungi l'ultima linea se presente
    if (currentLine.length > 0) {
      result += currentLine.trim();
    }
    
    // Rimuovi spazi vuoti multipli
    return result.replace(/\n\s*\n/g, '\n\n').trim();
  }
  
  /**
   * Tenta di rilevare se il testo estratto sembra un copione teatrale
   * Analizza la struttura per identificare personaggi e dialoghi
   * 
   * @param {string} extractedText Il testo estratto da analizzare
   * @returns {object} Informazioni sulla struttura rilevata
   */
  detectScriptStructure(extractedText) {
    // Pattern per identificare personaggi parlanti
    const characterLinePattern = /^[A-Z][A-Za-z\s]+:/gm;
    
    // Conta le linee che sembrano dialoghi di personaggi
    const characterMatches = extractedText.match(characterLinePattern) || [];
    
    // Estrai i nomi dei personaggi
    const characters = new Set();
    for (const match of characterMatches) {
      const characterName = match.slice(0, -1).trim();
      characters.add(characterName);
    }
    
    // Risultato dell'analisi
    return {
      isLikelyScript: characterMatches.length > 3 && characters.size >= 2,
      characterCount: characters.size,
      characterNames: Array.from(characters),
      dialogueLines: characterMatches.length
    };
  }
}

// Esporta singleton per uso applicativo
export const pdfTextExtractor = new PdfTextExtraction();
