import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, ScrollView, Platform, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import styles from '../styles/RegisterScreenStyles';

// Registreringskomponent for nye brugere
export default function RegisterScreen({ navigation }) {
  // status for email
  const [email, setEmail] = useState('');
  // status for adgangskode
  const [password, setPassword] = useState('');
  // status for adgangskodebekræftelse
  const [confirmPassword, setConfirmPassword] = useState('');
  // status for brugertype (kunde eller virksomhedsejrer)
  const [userType, setUserType] = useState('customer');
  // status for indlæsning
  const [loading, setLoading] = useState(false);
  // Autentifiseringskontekst
  const { signup } = useAuth();

  // Handler for registreringsknap - validerer input og opretter konto
  const handleRegister = async () => {
    // Tjek om alle felter er udfyldt
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    // Tjek om adgangskoderne matcher
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    // Tjek minimum længde på adgangskode
    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      // Opret bruger via autentifiseringskontekst
      await signup(email, password, userType);
      Alert.alert('Success', 'Account created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView 
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={styles.title}>Create Account</Text>
            <Text style={styles.subtitle}>Join LocalRadar today</Text>

            {/* Email input felt */}
            <TextInput
              style={styles.input}
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholderTextColor="#999"
            />

            {/* Adgangskode input felt */}
            <TextInput
              style={styles.input}
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholderTextColor="#999"
            />

            {/* Bekræft adgangskode input felt */}
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              placeholderTextColor="#999"
            />

            {/* Brugertype valgmuligheder */}
            <Text style={styles.sectionTitle}>Account Type</Text>
            <View style={styles.userTypeContainer}>
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'customer' && styles.selectedUserType
                ]}
                onPress={() => setUserType('customer')}
              >
                <Text style={[
                  styles.userTypeText,
                  userType === 'customer' && styles.selectedUserTypeText
                ]}>
                  Customer
                </Text>
                <Text style={styles.userTypeDescription}>
                  Discover and follow venues
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.userTypeButton,
                  userType === 'business' && styles.selectedUserType
                ]}
                onPress={() => setUserType('business')}
              >
                <Text style={[
                  styles.userTypeText,
                  userType === 'business' && styles.selectedUserTypeText
                ]}>
                  Business Owner
                </Text>
                <Text style={styles.userTypeDescription}>
                  Manage your venue
                </Text>
              </TouchableOpacity>
            </View>

            {/* Registreringsknap */}
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleRegister}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Text>
            </TouchableOpacity>

            {/* Link til login-skærm */}
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={styles.linkText}>
                Already have an account? Sign in
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

