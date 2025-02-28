// src/components/ScriptReader/ScriptReader.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { Script, Character, Line } from '../../types/script.types';
import { ttsService } from '../../services/tts.service';

interface ScriptReaderProps {
  script: Script;
  userCharacterId: string;
  onComplete?: () => void;
}

export const ScriptReader: React.FC<ScriptReaderProps> = ({
  script,
  userCharacterId,
  onComplete
}) => {
  const [currentLineIndex, setCurrentLineIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const lineRefs = useRef<Map<string, View>>(new Map());
  
  // Get character name by ID
  const getCharacterName = (characterId: string): string => {
    const character = script.characters.find(c => c.id === characterId);
    return character ? character.name : 'Direction';
  };
  
  // Handle advancing to the next line
  const advanceLine = () => {
    if (currentLineIndex < script.scenes[0].lines.length - 1) {
      setCurrentLineIndex(prevIndex => prevIndex + 1);
    } else {
      // End of script reached
      setIsPlaying(false);
      if (onComplete) onComplete();
    }
  };
  
  // Toggle play/pause
  const togglePlayback = () => {
    if (isPlaying) {
      ttsService.stop();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
    }
  };
  
  // Process the current line
  useEffect(() => {
    if (!isPlaying) return;
    
    const currentLine = script.scenes[0].lines[currentLineIndex];
    
    // Scroll to the current line
    if (scrollViewRef.current && lineRefs.current.has(currentLine.id)) {
      scrollViewRef.current.scrollTo({
        x: 0,
        y: lineRefs.current.get(currentLine.id)?.measure((x, y, width, height, pageX, pageY) => {
          scrollViewRef.current?.scrollTo({ y: pageY - 100, animated: true });
        }),
        animated: true
      });
    }
    
    // If it's the user's line, wait for them to proceed manually
    if (currentLine.characterId === userCharacterId) {
      // Don't read user's lines, wait for manual advancement
    } else {
      // Read the line using TTS
      const characterName = getCharacterName(currentLine.characterId);
      const textToRead = currentLine.isDirection ? `Direzione: ${currentLine.text}` : currentLine.text;
      
      ttsService.speak(textToRead, {}, () => {
        // After speaking, automatically advance to the next line after a short delay
        setTimeout(() => {
          advanceLine();
        }, 1000);
      });
    }
  }, [currentLineIndex, isPlaying]);
  
  return (
    <View style={styles.container}>
      <ScrollView ref={scrollViewRef} style={styles.scrollContainer}>
        {script.scenes[0].lines.map((line, index) => {
          const isCurrentLine = index === currentLineIndex;
          const isUserLine = line.characterId === userCharacterId;
          
          return (
            <View 
              key={line.id} 
              style={[
                styles.lineContainer,
                isCurrentLine && styles.currentLine,
                isUserLine && styles.userLine,
                isCurrentLine && isUserLine && styles.currentUserLine
              ]}
              ref={ref => {
                if (ref) {
                  lineRefs.current.set(line.id, ref);
                }
              }}
            >
              <Text style={styles.characterName}>
                {getCharacterName(line.characterId)}:
              </Text>
              <Text style={styles.lineText}>{line.text}</Text>
            </View>
          );
        })}
      </ScrollView>
      
      <View style={styles.controlsContainer}>
        <TouchableOpacity 
          style={styles.controlButton} 
          onPress={togglePlayback}
        >
          <Text style={styles.buttonText}>{isPlaying ? 'Pausa' : 'Riprendi'}</Text>
        </TouchableOpacity>
        
        {isPlaying && script.scenes[0].lines[currentLineIndex].characterId === userCharacterId && (
          <TouchableOpacity 
            style={[styles.controlButton, styles.nextButton]} 
            onPress={advanceLine}
          >
            <Text style={styles.buttonText}>Prossima Battuta</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  lineContainer: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ddd',
  },
  currentLine: {
    backgroundColor: '#fffde7',
    borderLeftColor: '#ffeb3b',
  },
  userLine: {
    borderLeftColor: '#4caf50',
  },
  currentUserLine: {
    backgroundColor: '#e8f5e9',
    borderLeftColor: '#4caf50',
  },
  characterName: {
    fontWeight: 'bold',
    marginBottom: 4,
    fontSize: 16,
  },
  lineText: {
    fontSize: 16,
    lineHeight: 22,
  },
  controlsContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  controlButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2196f3',
    borderRadius: 8,
    marginRight: 16,
  },
  nextButton: {
    backgroundColor: '#4caf50',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});