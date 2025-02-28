// src/services/content-acquisition.service.ts
import { Alert, Clipboard } from 'react-native';
import { FileImportResult } from '../types/file.types';

/**
 * Service that implements strategic content acquisition patterns
 * focused on user agency and cross-platform compatibility
 */
export class ContentAcquisitionService {
  /**
   * Sample scripts for rapid onboarding and demonstration purposes
   * with strategic content selection for showcasing application capabilities
   */
  private sampleScripts: Record<string, string> = {
    'romeo-giulietta': `Romeo e Giulietta - Atto 2, Scena 2

ROMEO: Ma, attendi! Quale luce proviene da quella finestra?
È l'oriente, e Giulietta è il sole!
Sorgi, bel sole, e uccidi l'invidiosa luna,
già malata e pallida di dolore perché tu, sua ancella,
sei di gran lunga più bella di lei.

GIULIETTA: Ahimè!

ROMEO: Parla! Oh, parla ancora, angelo luminoso!

GIULIETTA: O Romeo, Romeo! Perché sei tu Romeo?
Rinnega tuo padre e rifiuta il tuo nome;
o, se proprio non vuoi, giurami solo il tuo amore
ed io non sarò più una Capuleti.`,
    
    'amleto': `Amleto - Atto 3, Scena 1

AMLETO: Essere o non essere, questo è il dilemma:
se sia più nobile d'animo sopportare
gli strali e i colpi d'una sorte oltraggiosa,
o prender l'armi contro un mare d'affanni
e, combattendo, finirli.

OFELIA: Buon principe, come sta la Vostra Altezza da tanti giorni?

AMLETO: Umilmente vi ringrazio: bene, bene, bene.

OFELIA: Altezza, ho dei vostri doni che da tempo
desideravo restituirvi; vi prego, prendeteli ora.`
  };
  
  /**
   * Prompts the user to paste content from clipboard,
   * eliminating dependency on native file system access
   */
  async importFromClipboard(): Promise<FileImportResult> {
    try {
      const clipboardContent = await Clipboard.getString();
      
      if (!clipboardContent || clipboardContent.trim().length === 0) {
        return {
          success: false,
          message: 'Nessun testo trovato negli appunti. Copia il testo del copione e riprova.'
        };
      }
      
      // Perform basic validation to ensure it looks like a script
      if (this.looksLikeScript(clipboardContent)) {
        return {
          success: true,
          text: clipboardContent,
          fileName: 'Dagli appunti'
        };
      } else {
        return {
          success: true, 
          text: clipboardContent,
          fileName: 'Dagli appunti',
          message: 'Il testo importato potrebbe non essere un copione. Verifica il formato.'
        };
      }
    } catch (error) {
      console.error('Clipboard access error:', error);
      return {
        success: false,
        message: 'Impossibile accedere agli appunti. Assicurati che l\'app abbia i permessi necessari.'
      };
    }
  }
  
  /**
   * Loads a pre-configured sample script for demonstration
   * and rapid user onboarding
   */
  loadSampleScript(key: keyof typeof this.sampleScripts = 'romeo-giulietta'): FileImportResult {
    const script = this.sampleScripts[key] || this.sampleScripts['romeo-giulietta'];
    
    return {
      success: true,
      text: script,
      fileName: `Esempio: ${key}`
    };
  }
  
  /**
   * Provides a list of available sample scripts with descriptive metadata
   * for user selection interfaces
   */
  getSampleScriptOptions(): Array<{id: string, title: string}> {
    return [
      { id: 'romeo-giulietta', title: 'Romeo e Giulietta' },
      { id: 'amleto', title: 'Amleto' }
    ];
  }
  
  /**
   * Heuristically determines if text appears to be a script format
   * using structural pattern recognition
   */
  private looksLikeScript(text: string): boolean {
    // Look for character name patterns (NAME: dialogue)
    const characterLinePattern = /^[A-Z][A-Za-z\s]+:/m;
    
    // Count potential character lines
    const lines = text.split('\n');
    const characterLines = lines.filter(line => characterLinePattern.test(line.trim()));
    
    // If we have at least a few character lines, it's likely a script
    return characterLines.length >= 2;
  }
}

// Singleton instance with dependency injection readiness
export const contentAcquisitionService = new ContentAcquisitionService();
