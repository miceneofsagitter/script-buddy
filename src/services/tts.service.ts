// src/services/tts.service.ts
import * as Speech from 'expo-speech';
import { TtsOptions } from '../types/script.types.js';

/**
 * Service to handle text-to-speech functionality
 * Provides an abstraction over Expo's Speech module with additional features
 */
class TtsService {
  private isSpeaking: boolean = false;
  private queue: { text: string, options?: TtsOptions, onDone?: () => void }[] = [];
  private defaultOptions: TtsOptions = {
    rate: 0.9,
    pitch: 1.0,
    volume: 1.0
  };
  
  constructor() {
    // Initialize the service
    this.checkAvailability();
  }
  
  /**
   * Check if TTS is available on the device
   */
  private async checkAvailability(): Promise<boolean> {
    try {
      const available = await Speech.isSpeakingAsync();
      return true;
    } catch (error) {
      console.error('TTS not available:', error);
      return false;
    }
  }
  
  /**
   * Speak text with optional configuration
   */
  speak(text: string, options?: TtsOptions, onDone?: () => void): Promise<void> {
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    // Add to queue if already speaking
    if (this.isSpeaking) {
      this.queue.push({ text, options: mergedOptions, onDone });
      return Promise.resolve();
    }
    
    this.isSpeaking = true;
    
    return new Promise((resolve) => {
      Speech.speak(text, {
        rate: mergedOptions.rate,
        pitch: mergedOptions.pitch,
        volume: mergedOptions.volume,
        onDone: () => {
          this.isSpeaking = false;
          if (onDone) onDone();
          resolve();
          
          // Process next item in queue
          if (this.queue.length > 0) {
            const next = this.queue.shift()!;
            this.speak(next.text, next.options, next.onDone);
          }
        },
        onError: (error) => {
          console.error('TTS error:', error);
          this.isSpeaking = false;
          resolve();
          
          // Process next item in queue even on error
          if (this.queue.length > 0) {
            const next = this.queue.shift()!;
            this.speak(next.text, next.options, next.onDone);
          }
        }
      });
    });
  }
  
  /**
   * Stop all speech and clear the queue
   */
  stop(): void {
    Speech.stop();
    this.queue = [];
    this.isSpeaking = false;
  }
  
  /**
   * Get speech voices available on the device
   * Note: This is a placeholder as Expo Speech doesn't currently support voice selection
   */
  async getAvailableVoices(): Promise<string[]> {
    // This would ideally return a list of available voices
    // Currently Expo Speech doesn't support this directly
    return ['Default'];
  }
  
  /**
   * Set default options for TTS
   */
  setDefaultOptions(options: TtsOptions): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }
}

export const ttsService = new TtsService();
