import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, Modal, TouchableWithoutFeedback, Keyboard, ScrollView } from 'react-native';
import { CardField, useStripe } from '@stripe/stripe-react-native';
import { STRIPE_CONFIG } from '../config/stripe';
import styles from '../styles/PaymentScreenStyles';

export default function PaymentScreen({ route, navigation }) {
  // Hent event data og callback fra route parametere
  const { event, onPaymentSuccess } = route.params;
  // Tilstand for indlæsning under betaling
  const [loading, setLoading] = useState(false);
  // Tilstand for visning af test kort modal
  const [showTestCards, setShowTestCards] = useState(false);
  // Stripe payment confirmation funktion
  const { confirmPayment } = useStripe();

  // Formater kortnummer med mellemrum (4242 4242 4242 4242)
  const formatCardNumber = (number) => {
    return number.match(/.{1,4}/g)?.join(' ') || number;
  };

  // Handler for betalingsprocessen - simulerer betaling til test
  const handlePayment = async () => {
    setLoading(true);

    try {
      // I en rigtig app ville du kalde din backend til at oprette payment intent
      // Til testformål simulerer vi flowet
      
      // IMPORTANT: This is a simplified test implementation
      // In production, you MUST have a backend server that:
      // 1. Creates a payment intent using your Stripe secret key
      // 2. Returns the client secret to your app
      // 3. Never exposes your secret key in the client app

      Alert.alert(
        'Test Mode Payment',
        'In test mode, you would:\n\n1. Create a payment intent on your backend\n2. Pass the client secret to the app\n3. Confirm payment with Stripe\n\nFor now, we\'ll simulate a successful payment.',
        [
          {
            text: 'Cancel',
            style: 'cancel',
            onPress: () => setLoading(false),
          },
          {
            text: 'Simulate Success',
            onPress: async () => {
              // Simulate payment success
              await new Promise(resolve => setTimeout(resolve, 1500));
              setLoading(false);
              
              // Call the success callback
              if (onPaymentSuccess) {
                await onPaymentSuccess();
              }
              
              navigation.goBack();
              Alert.alert('Success', 'Payment processed successfully! You are now registered for the event.');
            },
          },
        ]
      );
    } catch (error) {
      setLoading(false);
      Alert.alert('Payment Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <TouchableOpacity onPress={Keyboard.dismiss} style={styles.headerSpacer}>
          <Text style={styles.doneButton}>Done</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.eventCard}>
          <Text style={styles.eventTitle}>{event.title}</Text>
          <Text style={styles.eventDate}>{event.date} at {event.time}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Total Amount:</Text>
            <Text style={styles.priceAmount}>{event.ticketPrice} kr</Text>
          </View>
        </View>

        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Details</Text>
          
          <CardField
            postalCodeEnabled={false}
            placeholders={{
              number: formatCardNumber(STRIPE_CONFIG.testCards.success),
            }}
            cardStyle={styles.card}
            style={styles.cardField}
          />
        </View>

        <TouchableOpacity
          style={[styles.payButton, loading && styles.payButtonDisabled]}
          onPress={handlePayment}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.payButtonText}>Pay {event.ticketPrice} kr</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.secureNote}>🔒 Payments are secured by Stripe</Text>
      </ScrollView>

      <Modal
        visible={showTestCards}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTestCards(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Test Card Numbers</Text>
            
            <View style={styles.testCardList}>
              <View style={styles.testCardItem}>
                <Text style={styles.testCardLabel}>✅ Success:</Text>
                <Text style={styles.testCardNumber}>{formatCardNumber(STRIPE_CONFIG.testCards.success)}</Text>
              </View>
              
              <View style={styles.testCardItem}>
                <Text style={styles.testCardLabel}>🔐 Authentication:</Text>
                <Text style={styles.testCardNumber}>{formatCardNumber(STRIPE_CONFIG.testCards.authentication)}</Text>
              </View>
              
              <View style={styles.testCardItem}>
                <Text style={styles.testCardLabel}>❌ Declined:</Text>
                <Text style={styles.testCardNumber}>{formatCardNumber(STRIPE_CONFIG.testCards.declined)}</Text>
              </View>
            </View>

            <Text style={styles.modalNote}>Use any future date and any 3-digit CVC</Text>

            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setShowTestCards(false)}
            >
              <Text style={styles.modalButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}
