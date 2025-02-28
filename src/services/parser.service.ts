// src/services/parser.service.ts
import { Script, Character, Line } from '../types/script.types';

/**
 * Parses raw script text into a structured format
 * Utilizes pattern recognition to identify characters and dialogue
 */
export const parseScript = (rawText: string): Script => {
  // Split the script into lines
  const textLines = rawText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  
  const script: Script = {
    title: '',
    characters: [],
    scenes: [{
      id: '1',
      name: 'Scene 1',
      lines: []
    }]
  };
  
  const characterMap = new Map<string, Character>();
  let currentCharacter: string | null = null;
  let lineCounter = 0;
  
  // Extract script title from first line if it exists
  if (textLines.length > 0 && !textLines[0].includes(':')) {
    script.title = textLines[0];
    textLines.shift();
  }
  
  textLines.forEach(textLine => {
    // Check if this line defines a character speaking
    const characterMatch = textLine.match(/^([A-Za-z\s]+):/);
    
    if (characterMatch) {
      currentCharacter = characterMatch[1].trim();
      
      // Add to character list if not already present
      if (!characterMap.has(currentCharacter)) {
        const newCharacter: Character = {
          id: (characterMap.size + 1).toString(),
          name: currentCharacter
        };
        characterMap.set(currentCharacter, newCharacter);
        script.characters.push(newCharacter);
      }
      
      // Add the line spoken by this character
      const dialogText = textLine.substring(textLine.indexOf(':') + 1).trim();
      if (dialogText.length > 0) {
        const newLine: Line = {
          id: (++lineCounter).toString(),
          characterId: characterMap.get(currentCharacter)!.id,
          text: dialogText,
          sceneId: '1'
        };
        script.scenes[0].lines.push(newLine);
      }
    } else if (currentCharacter && textLine.length > 0) {
      // This is a continuation of the previous character's dialogue
      const previousLine = script.scenes[0].lines[script.scenes[0].lines.length - 1];
      previousLine.text += ' ' + textLine;
    } else if (textLine.length > 0) {
      // This could be a stage direction or scene heading
      const newLine: Line = {
        id: (++lineCounter).toString(),
        characterId: '0', // 0 indicates narrator or stage direction
        text: textLine,
        sceneId: '1',
        isDirection: true
      };
      script.scenes[0].lines.push(newLine);
    }
  });
  
  return script;
};

/**
 * Extracts all unique characters from a script
 */
export const extractCharacters = (script: Script): Character[] => {
  return script.characters;
};

/**
 * Gets all lines for a specific character
 */
export const getLinesForCharacter = (script: Script, characterId: string): Line[] => {
  return script.scenes.flatMap(scene => 
    scene.lines.filter(line => line.characterId === characterId)
  );
};

/**
 * Identifies cue lines (lines that come before a specific character's lines)
 */
export const getCueLines = (script: Script, characterId: string): { cue: Line, response: Line }[] => {
  const cueLines: { cue: Line, response: Line }[] = [];
  
  script.scenes.forEach(scene => {
    for (let i = 0; i < scene.lines.length - 1; i++) {
      if (scene.lines[i+1].characterId === characterId && !scene.lines[i].isDirection) {
        cueLines.push({
          cue: scene.lines[i],
          response: scene.lines[i+1]
        });
      }
    }
  });
  
  return cueLines;
};
