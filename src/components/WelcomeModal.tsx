import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';

interface Props {
  storeName: string | null;
  onDismiss: () => void;
}

export default function WelcomeModal({ storeName, onDismiss }: Props) {
  return (
    <Modal
      visible={storeName !== null}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.emoji}>🛒</Text>
          <Text style={styles.title}>Welcome!</Text>
          <Text style={styles.body}>
            You're near a{'\n'}
            <Text style={styles.storeName}>{storeName}</Text>
          </Text>
          <TouchableOpacity style={styles.button} onPress={onDismiss}>
            <Text style={styles.buttonText}>Thanks!</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    color: '#1a1a1a',
  },
  body: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  storeName: {
    fontWeight: '700',
    color: '#1a1a1a',
    fontSize: 18,
  },
  button: {
    backgroundColor: '#4A90E2',
    paddingHorizontal: 40,
    paddingVertical: 14,
    borderRadius: 30,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
