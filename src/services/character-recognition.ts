// src/services/character-recognition.service.ts
import { Script, Character } from '../types/script.types';

/**
 * Servizio specializzato per il rilevamento e l'analisi dei personaggi in copioni teatrali
 * Implementa algoritmi euristici ottimizzati per l'identificazione di pattern di testo
 */
export class CharacterRecognitionService {
  /**
   * Analizza un testo grezzo per rilevare e strutturare un copione teatrale
   * con identificazione intelligente dei personaggi e delle battute
   * 
   * @param rawText Testo grezzo estratto da un documento (es. PDF)
   * @returns Copione strutturato con personaggi e battute identificati
   */
  analyzeScriptText(rawText: string): Script {
    // Identificazione dei personaggi tramite pattern di espressioni regolari
    const characterPatterns = [
      /^([A-Z][A-Za-z\s]+):/gm, // Pattern standard: "PERSONAGGIO:"
      /^([A-Z][A-Za-z\s]+)\s+\(/gm, // Pattern con indicazione: "PERSONAGGIO (entra)"
      /^\s*([A-Z]{2,})\s*$/gm // Pattern maiuscolo isolato: "PERSONAGGIO"
    ];
    
    // Prepara le strutture dati per il rilevamento
    const characterMap = new Map<string, Character>();
    const characterMentions = new Map<string, number>(); // Conta le occorrenze
    const lines: string[] = rawText.split('\n');
    
    // Prima passata: identifica i potenziali personaggi
    for (const line of lines) {
      for (const pattern of characterPatterns) {
        pattern.lastIndex = 0; // Resetta l'indice di ricerca
        const match = pattern.exec(line);
        if (match && match[1]) {
          const characterName = match[1].trim();
          // Filtra nomi troppo comuni o brevi
          if (characterName.length > 1 && !this.isCommonWord(characterName)) {
            characterMentions.set(
              characterName, 
              (characterMentions.get(characterName) || 0) + 1
            );
          }
        }
      }
    }
    
    // Filtra i personaggi basandosi sulla frequenza
    // Un vero personaggio dovrebbe apparire più volte nel testo
    const likelyCharacters = Array.from(characterMentions.entries())
      .filter(([_, count]) => count >= 2) // Deve apparire almeno 2 volte
      .sort((a, b) => b[1] - a[1]); // Ordina per frequenza
    
    // Crea la struttura dati dei personaggi
    likelyCharacters.forEach(([name, _], index) => {
      const character: Character = {
        id: (index + 1).toString(),
        name: name
      };
      characterMap.set(name, character);
    });
    
    // Crea la struttura script di base
    const script: Script = {
      title: this.extractScriptTitle(rawText, lines),
      characters: Array.from(characterMap.values()),
      scenes: [{
        id: '1',
        name: 'Scena 1',
        lines: []
      }]
    };
    
    // Seconda passata: identifica le battute
    let currentCharacterId: string | null = null;
    let lineCounter = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0) continue;
      
      // Identifica marker di scena per strutturare il copione
      const sceneMarker = line.match(/^(ATTO|SCENA|ACT|SCENE)\s+([IVX\d]+)/i);
      if (sceneMarker) {
        // Nuova scena o atto rilevato
        script.scenes.push({
          id: (script.scenes.length + 1).toString(),
          name: line,
          lines: []
        });
        continue;
      }
      
      // Verifica se la linea definisce un personaggio che parla
      let characterMatch = null;
      let matchedName = '';
      
      for (const name of characterMap.keys()) {
        if (line.startsWith(name + ':')) {
          characterMatch = characterMap.get(name);
          matchedName = name;
          break;
        }
      }
      
      if (characterMatch) {
        currentCharacterId = characterMatch.id;
        
        // Estrai il dialogo dopo il nome del personaggio
        const dialogText = line.substring(matchedName.length + 1).trim();
        if (dialogText.length > 0) {
          script.scenes[script.scenes.length - 1].lines.push({
            id: (++lineCounter).toString(),
            characterId: currentCharacterId,
            text: dialogText,
            sceneId: script.scenes[script.scenes.length - 1].id
          });
        }
      } else if (currentCharacterId && line.length > 0 && !this.isSceneDirection(line)) {
        // Potrebbe essere una continuazione della battuta precedente
        const previousScene = script.scenes[script.scenes.length - 1];
        if (previousScene.lines.length > 0) {
          const previousLine = previousScene.lines[previousScene.lines.length - 1];
          if (previousLine.characterId === currentCharacterId) {
            previousLine.text += ' ' + line;
            continue;
          }
        }
        
        // Altrimenti è una nuova battuta o un'indicazione di scena
        if (this.looksLikeDialogue(line)) {
          script.scenes[script.scenes.length - 1].lines.push({
            id: (++lineCounter).toString(),
            characterId: currentCharacterId,
            text: line,
            sceneId: script.scenes[script.scenes.length - 1].id
          });
        } else {
          // Probabilmente un'indicazione di scena
          script.scenes[script.scenes.length - 1].lines.push({
            id: (++lineCounter).toString(),
            characterId: '0', // ID speciale per indicazioni di scena
            text: line,
            sceneId: script.scenes[script.scenes.length - 1].id,
            isDirection: true
          });
        }
      } else if (line.length > 0) {
        // Indicazione di scena o titolo
        script.scenes[script.scenes.length - 1].lines.push({
          id: (++lineCounter).toString(),
          characterId: '0',
          text: line,
          sceneId: script.scenes[script.scenes.length - 1].id,
          isDirection: true
        });
      }
    }
    
    return script;
  }
  
  /**
   * Estrae il titolo più probabile del copione dall'inizio del testo
   */
  private extractScriptTitle(rawText: string, lines: string[]): string {
    // Cerca nelle prime righe un potenziale titolo
    const titleCandidates: string[] = [];
    
    // Considera solo le prime 10 righe per il titolo
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      const line = lines[i].trim();
      
      // Salta linee vuote
      if (line.length === 0) continue;
      
      // Titoli non contengono solitamente ":" e non sono troppo lunghi
      if (line.length > 0 && line.length < 60 && !line.includes(':')) {
        titleCandidates.push(line);
      }
      
      // Se abbiamo già 2 candidati, ci fermiamo
      if (titleCandidates.length >= 2) break;
    }
    
    // Scegli il candidato più probabile
    if (titleCandidates.length > 0) {
      // Preferisci la prima riga non vuota, a meno che la seconda non sembri più un titolo
      if (titleCandidates.length > 1 && 
          titleCandidates[1].toUpperCase() === titleCandidates[1] && 
          titleCandidates[0].toUpperCase() !== titleCandidates[0]) {
        return titleCandidates[1];
      }
      return titleCandidates[0];
    }
    
    // Fallback: estrai il nome del file come titolo
    const fileName = rawText.substring(0, 100).match(/([^\/\\]+)\.(pdf|txt)$/i);
    if (fileName) {
      return fileName[1].replace(/[_-]/g, ' ');
    }
    
    return 'Copione Importato';
  }
  
  /**
   * Determina se una parola è troppo comune per essere un nome di personaggio
   */
  private isCommonWord(word: string): boolean {
    const commonWords = [
      'IL', 'LO', 'LA', 'I', 'GLI', 'LE', 'UN', 'UNA', 'UNO',
      'E', 'O', 'MA', 'SE', 'PERCHÉ', 'QUINDI', 'COSÌ', 'ALLORA',
      'ATTO', 'SCENA', 'FINE', 'INIZIO', 'SIPARIO', 'ENTRA', 'ESCE'
    ];
    
    return commonWords.includes(word.toUpperCase());
  }
  
  /**
   * Determina se una linea sembra un'indicazione di scena
   */
  private isSceneDirection(line: string): boolean {
    // Indicazioni di scena spesso sono tra parentesi
    if (line.startsWith('(') && line.endsWith(')')) return true;
    
    // Altri pattern comuni per indicazioni di scena
    if (/^(Entra|Esce|Entra in scena|Esce di scena|Si alza|Si siede)/i.test(line)) return true;
    
    return false;
  }
  
  /**
   * Determina se una linea sembra essere un dialogo
   */
  private looksLikeDialogue(line: string): boolean {
    // Dialoghi tendono ad essere frasi complete
    if (line.length < 3) return false;
    
    // I dialoghi spesso finiscono con punteggiatura
    if (/[.!?]$/.test(line)) return true;
    
    // I dialoghi raramente iniziano con parentesi o sono interamente in maiuscolo
    if (line.startsWith('(') || (line.toUpperCase() === line && line.length > 10)) return false;
    
    return true;
  }
}

// Istanza singleton con preparazione per dependency injection
export const characterRecognitionService = new CharacterRecognitionService();
