import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Handle Login
  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert("Login Error", error.message);
    setLoading(false);
  }

  // Handle Sign Up
  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) Alert.alert("Signup Error", error.message);
    else Alert.alert("Check your email", "Check your inbox for a confirmation link!");
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>My Garden</Text>
      <Text style={styles.subtitle}>Log in to manage your trays</Text>

      <View style={styles.inputGroup}>
        <TextInput
          label="Email"
          placeholder="email@address.com"
          value={email}
          onChangeText={setEmail}
          autoCapitalize={'none'}
          style={styles.input}
        />
      </View>

      <View style={styles.inputGroup}>
        <TextInput
          label="Password"
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={true}
          autoCapitalize={'none'}
          style={styles.input}
        />
      </View>

      <View style={styles.buttonContainer}>
        {loading ? (
          <ActivityIndicator color="#2F4F3C" />
        ) : (
          <>
            <Pressable style={styles.btnPrimary} onPress={signInWithEmail}>
              <Text style={styles.btnTextPrimary}>Sign In</Text>
            </Pressable>
            
            <Pressable style={styles.btnSecondary} onPress={signUpWithEmail}>
              <Text style={styles.btnTextSecondary}>Create Account</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, justifyContent: 'center', backgroundColor: '#F4F1EA' },
  header: { fontSize: 32, fontWeight: 'bold', color: '#2F4F3C', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#6B6560', textAlign: 'center', marginBottom: 40 },
  inputGroup: { marginBottom: 15 },
  input: { backgroundColor: '#FFF', padding: 15, borderRadius: 10, borderWidth: 1, borderColor: '#D9D4C8' },
  buttonContainer: { marginTop: 20, gap: 10 },
  btnPrimary: { backgroundColor: '#2F4F3C', padding: 15, borderRadius: 10, alignItems: 'center' },
  btnTextPrimary: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  btnSecondary: { padding: 15, alignItems: 'center' },
  btnTextSecondary: { color: '#2F4F3C', fontWeight: '600' },
});