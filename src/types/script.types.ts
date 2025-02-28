// src/types/script.types.ts

export interface Character {
  id: string;
  name: string;
}

export interface Line {
  id: string;
  characterId: string;
  text: string;
  sceneId: string;
  isDirection?: boolean;
}

export interface Scene {
  id: string;
  name: string;
  lines: Line[];
}

export interface Script {
  title: string;
  characters: Character[];
  scenes: Scene[];
}

export interface ScriptReaderProps {
  script: Script;
  userCharacterId: string;
  currentLineIndex: number;
  onLineComplete: () => void;
}

export interface PracticeSession {
  scriptId: string;
  userCharacterId: string;
  startTime: Date;
  endTime?: Date;
  completedLines: number;
  totalLines: number;
  mistakes: number;
}

export interface TtsOptions {
  rate?: number;  // Speech rate (0.1 to 10)
  pitch?: number; // Speech pitch (0.1 to 10)
  volume?: number; // Volume (0 to 1)
}
