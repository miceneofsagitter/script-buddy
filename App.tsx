// App.tsx
import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet } from 'react-native';
import { HomeScreen } from './src/screens/HomeScreen';

// Importante: importare il fix runtime prima di qualsiasi altro componente
import './src/utils/pdf-runtime-fix';

export default function App() {
  // Inizializzazione necessaria per i fix PDF.js
  useEffect(() => {
    // Forzare la modalità no-worker globalmente
    // Questa è una soluzione alternativa al problema del worker
    if (typeof window !== 'undefined') {
      (window as any).disableWorker = true;
    }
    
    // Preparazione globale per PDF.js
    if (typeof global !== 'undefined') {
      (global as any).disableWorker = true;
    }
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <HomeScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
