import { StyleSheet } from 'react-native';

export const profileScreenStyles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: '#0b0b0c' 
  },
  container: { 
    flex: 1, 
    paddingHorizontal: 16, 
    paddingTop: 8 
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  logoutButton: {
    backgroundColor: '#2b2b31',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  logoutText: {
    color: '#d7d7dd',
    fontSize: 12,
    fontWeight: '600',
  },

  userSection: {
    backgroundColor: '#121214',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  userEmail: {
    fontSize: 16,
    fontWeight: '500',
    color: '#c9c9ce',
    textAlign: 'center',
    marginBottom: 5,
  },
  userType: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  card: {
    flex: 1,
    backgroundColor: '#121214',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  value: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  label: {
    fontSize: 12,
    color: '#8e8e95',
    textAlign: 'center',
    fontWeight: '600',
  },

  addButton: {
    backgroundColor: '#2b2b31',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  addButtonText: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: '700',
  },

  addVenueForm: {
    backgroundColor: '#121214',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  input: {
    backgroundColor: '#1a1a1e',
    color: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#2b2b31',
  },
  typeContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  typeButton: {
    backgroundColor: '#1a1a1e',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  selectedType: {
    backgroundColor: '#2b2b31',
  },
  typeText: {
    color: '#b2b2b8',
    fontSize: 13,
    fontWeight: '600',
  },
  selectedTypeText: {
    color: '#e0e0ff',
  },
  submitButton: {
    backgroundColor: '#2b2b31',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonText: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: '700',
  },

  venuesSection: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#c9c9ce',
    marginBottom: 12,
  },
  venuesList: {
    flex: 1,
  },
  venueItem: {
    backgroundColor: '#121214',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  venueInfo: {
    flex: 1,
  },
  venueName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    color: '#fff',
  },
  venueType: {
    fontSize: 13,
    color: '#e0e0ff',
    marginBottom: 2,
  },
  venueLocation: {
    fontSize: 13,
    color: '#b2b2b8',
  },
  actionButton: {
    backgroundColor: '#ff3b30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
  },
});