// src/screens/HomeScreen.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Alert } from 'react-native';
import { parseScript } from '../services/parser.service';
import { contentAcquisitionService } from '../services/content-acquisition.service';
import { pdfService } from '../services/pdf.service';
import { Script, Character } from '../types/script.types';
import { FileImportResult } from '../types/file.types';
import { ScriptReader } from '../components/ScriptReader/ScriptReader';

export const HomeScreen: React.FC = () => {
  const [scriptText, setScriptText] = useState<string>('');
  const [parsedScript, setParsedScript] = useState<Script | null>(null);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string>('');
  const [showReader, setShowReader] = useState<boolean>(false);
  const [showCharacterSelector, setShowCharacterSelector] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [importedFileName, setImportedFileName] = useState<string>('');
  
  // Parse the script when submitted
  const handleParseScript = () => {
    if (scriptText.trim().length === 0) return;
    
    try {
      const parsed = parseScript(scriptText);
      setParsedScript(parsed);
      
      // If characters were found, show the character selector
      if (parsed.characters.length > 0) {
        setShowCharacterSelector(true);
      }
    } catch (error) {
      console.error('Error parsing script:', error);
      // Would show an error toast or message here
    }
  };
  
  // Start practicing with the selected character
  const startPractice = () => {
    if (!parsedScript || !selectedCharacterId) return;
    
    setShowCharacterSelector(false);
    setShowReader(true);
  };
  
  /**
   * Loads a sample script for demonstration and rapid user onboarding
   * Uses the platform-compatible content acquisition service
   */
  const loadSampleScript = () => {
    const result = contentAcquisitionService.loadSampleScript();
    if (result.success && result.text) {
      setScriptText(result.text);
      setImportedFileName(result.fileName || '');
    }
  };
  
  /**
   * Handles file import through the document strategic pipeline
   * Implements an optimized UX flow with proper loading states and error handling
   */
  /**
   * Handles content import from clipboard with comprehensive error management
   * Provides platform-independent content acquisition strategy
   */
  const handleImportScript = async () => {
    // Clear any previous state to avoid confusion
    if (scriptText && scriptText.trim().length > 0) {
      // Ask for confirmation if replacing existing content
      const userWantsToReplace = await new Promise((resolve) => {
        Alert.alert(
          'Sostituire contenuto attuale?',
          'Il copione attuale verrà sostituito con il nuovo contenuto.',
          [
            { text: 'Annulla', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Sostituisci', onPress: () => resolve(true) },
          ],
          { cancelable: true }
        );
      });
      
      if (!userWantsToReplace) return;
    }
    
    // Start with a clean state
    setIsLoading(true);
    setImportedFileName('');
    
    try {
      // Use clipboard-based import as a platform-compatible strategy
      const result = await contentAcquisitionService.importFromClipboard();
      
      if (!result.success) {
        Alert.alert('Importazione fallita', result.message || 'Si è verificato un errore durante l\'importazione');
        return;
      }
      
      // Process successful result
      if (result.text) {
        setScriptText(result.text);
        if (result.fileName) {
          setImportedFileName(result.fileName);
        }
        
        // Show any informational messages
        if (result.message) {
          Alert.alert('Importazione completata', result.message);
        }
      } else {
        // Handle edge case of success without content
        Alert.alert('Attenzione', 'Contenuto importato correttamente ma vuoto.');
      }
    } catch (error) {
      console.error('Errore nel flusso di importazione:', error);
      Alert.alert('Errore', `Si è verificato un errore: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsLoading(false);
    }
  };
  
    /**
   * Gestisce l'importazione di un PDF contenente un copione
   * Implementa un flusso di elaborazione resiliente con gestione degli stati e feedback utente
   */
    const handleImportPdf = async () => {
      // Verifica se sostituire contenuto esistente
      if (scriptText && scriptText.trim().length > 0) {
        const userWantsToReplace = await new Promise((resolve) => {
          Alert.alert(
            'Sostituire contenuto attuale?',
            'Il copione attuale verrà sostituito con il contenuto estratto dal PDF.',
            [
              { text: 'Annulla', style: 'cancel', onPress: () => resolve(false) },
              { text: 'Sostituisci', onPress: () => resolve(true) },
            ],
            { cancelable: true }
          );
        });
        
        if (!userWantsToReplace) return;
      }
      
      // Inizializzazione dello stato per l'elaborazione
      setIsLoading(true);
      setImportedFileName('');
      
      try {
        // Implementazione di un meccanismo di timeout per migliorare l'UX su dispositivi lenti
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error('Timeout durante l\'importazione del PDF')), 60000); // 60s timeout
        });
        
        // Competizione tra importazione e timeout per resilienza operativa
        const result: FileImportResult = await Promise.race([
          pdfService.importPdfScript(),
          timeoutPromise
        ]);
        
        // Elaborazione del risultato con classificazione degli errori
        if (!result.success) {
          Alert.alert('Importazione PDF fallita', result.message || 'Si è verificato un errore durante l\'elaborazione del PDF');
          return;
        }
        
        // Elaborazione del risultato positivo
        if (result.text) {
          setScriptText(result.text);
          if (result.fileName) {
            setImportedFileName(result.fileName);
          }
          
          // Feedback sui personaggi rilevati nel PDF
          if (result.metadata?.detectedCharacters && result.metadata.detectedCharacters.length > 0) {
            const characterList = result.metadata.detectedCharacters.slice(0, 5).join(', ') + 
              (result.metadata.detectedCharacters.length > 5 ? '...' : '');
            
            Alert.alert(
              'PDF analizzato con successo', 
              `Estratto testo da ${result.metadata.pageCount || '?'} pagine.\n` +
              `Personaggi rilevati: ${characterList}`
            );
          } else {
            // Feedback generico se non sono stati rilevati personaggi
            Alert.alert('PDF importato con successo', result.message || 'Il testo è stato estratto dal PDF.');
          }
        } else {
          // Gestione del caso limite di successo senza contenuto
          Alert.alert('Attenzione', 'PDF importato correttamente ma senza contenuto testuale estraibile.');
        }
      } catch (error) {
        // Gestione errori comprensiva con categorizzazione
        console.error('Errore critico nel flusso di importazione PDF:', error);
        
        // Messaggi di errore contestuali basati sul tipo di errore
        if (error instanceof Error) {
          if (error.message.includes('Timeout')) {
            Alert.alert('Operazione troppo lunga', 'L\'elaborazione del PDF sta richiedendo troppo tempo. Prova con un file più piccolo o in formato diverso.');
          } else if (error.message.includes('permission') || error.message.includes('access')) {
            Alert.alert('Errore di permessi', 'L\'app non ha i permessi necessari per accedere a questo file PDF.');
          } else {
            Alert.alert('Errore di elaborazione PDF', `Si è verificato un errore: ${error.message}`);
          }
        } else {
          Alert.alert('Errore', 'Si è verificato un errore sconosciuto durante l\'importazione del PDF.');
        }
      } finally {
        // Assicura che lo stato di caricamento venga sempre ripristinato
        setIsLoading(false);
      }
    };
  return (
    <View style={styles.container}>
      {!showReader ? (
        <>
          <Text style={styles.title}>Script Buddy</Text>
          <Text style={styles.subtitle}>Assistente di Memorizzazione Copioni</Text>
          
          {/* File name indicator when file is imported */}
          {importedFileName ? (
            <View style={styles.fileIndicator}>
              <Text style={styles.fileIndicatorText}>
                File importato: {importedFileName}
              </Text>
            </View>
          ) : null}
          
          <ScrollView style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              multiline
              placeholder="Incolla qui il tuo copione o importa un file..."
              value={scriptText}
              onChangeText={setScriptText}
              textAlignVertical="top"
              editable={!isLoading}
            />
            
            {isLoading && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#1e88e5" />
                <Text style={styles.loadingText}>Elaborazione in corso...</Text>
              </View>
            )}
          </ScrollView>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={styles.button} 
              onPress={handleParseScript}
              disabled={scriptText.trim().length === 0 || isLoading}
            >
              <Text style={styles.buttonText}>Analizza Copione</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton]} 
              onPress={handleImportScript}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>Importa dagli Appunti</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.button, styles.importButton]} 
              onPress={handleImportPdf}
              disabled={isLoading}
            >
              <Text style={styles.importButtonText}>Importa PDF</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.button, styles.tertiaryButton]} 
              onPress={loadSampleScript}
              disabled={isLoading}
            >
              <Text style={styles.secondaryButtonText}>Carica Esempio</Text>
            </TouchableOpacity>
          </View>
          
          {/* Character Selection Modal */}
          <Modal
            visible={showCharacterSelector}
            animationType="slide"
            transparent={true}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Seleziona il tuo Personaggio</Text>
                
                <ScrollView style={styles.characterList}>
                  {parsedScript?.characters.map((character) => (
                    <TouchableOpacity
                      key={character.id}
                      style={[
                        styles.characterItem,
                        selectedCharacterId === character.id && styles.selectedCharacter
                      ]}
                      onPress={() => setSelectedCharacterId(character.id)}
                    >
                      <Text style={[
                        styles.characterName,
                        selectedCharacterId === character.id && styles.selectedCharacterText
                      ]}>
                        {character.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={[styles.button, styles.secondaryButton]}
                    onPress={() => setShowCharacterSelector(false)}
                  >
                    <Text style={styles.secondaryButtonText}>Annulla</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.button, !selectedCharacterId && styles.disabledButton]}
                    onPress={startPractice}
                    disabled={!selectedCharacterId}
                  >
                    <Text style={styles.buttonText}>Inizia Pratica</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        </>
      ) : (
        // Script Reader mode
        <>
          {parsedScript && selectedCharacterId && (
            <View style={styles.readerContainer}>
              <ScriptReader
                script={parsedScript}
                userCharacterId={selectedCharacterId}
                onComplete={() => {
                  // Handle practice completion
                  setShowReader(false);
                }}
              />
              
              <TouchableOpacity
                style={[styles.button, styles.exitButton]}
                onPress={() => setShowReader(false)}
              >
                <Text style={styles.buttonText}>Esci</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginTop: 40,
    color: '#1e88e5',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#757575',
  },
  inputContainer: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 16,
  },
  input: {
    padding: 16,
    fontSize: 16,
    minHeight: 200,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  button: {
    flex: 1,
    backgroundColor: '#1e88e5',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    flex: 0.5,
  },
  importButton: {
    backgroundColor: '#4527a0',
    flex: 0.5,
  },
  importButtonText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  secondaryButtonText: {
    color: '#757575',
    fontWeight: 'bold',
    fontSize: 16,
  },
  disabledButton: {
    backgroundColor: '#e0e0e0',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  characterList: {
    maxHeight: 300,
  },
  characterItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    borderRadius: 4,
    marginVertical: 4,
  },
  selectedCharacter: {
    backgroundColor: '#e3f2fd',
    borderColor: '#1e88e5',
    borderWidth: 1,
    borderBottomWidth: 1,
  },
  characterName: {
    fontSize: 16,
    color: '#333',
  },
  selectedCharacterText: {
    fontWeight: 'bold',
    color: '#1e88e5',
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  readerContainer: {
    flex: 1,
  },
  exitButton: {
    backgroundColor: '#f44336',
    marginTop: 16,
  },
  fileIndicator: {
    backgroundColor: '#e8f5e9',
    padding: 8,
    borderRadius: 4,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4caf50',
  },
  fileIndicatorText: {
    color: '#2e7d32',
    fontSize: 14,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#1e88e5',
    fontSize: 16,
  },
  tertiaryButton: {
    backgroundColor: '#f5f5f5',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 8,
  },
});
