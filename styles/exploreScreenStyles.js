import { StyleSheet } from 'react-native';

export const exploreScreenStyles = StyleSheet.create({
  safe: { 
    flex: 1, 
    backgroundColor: '#0b0b0c' 
  },
  screen: { 
    flex: 1, 
    paddingHorizontal: 16,
    paddingTop: 8
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
  },
  mapToggle: {
    backgroundColor: '#2b2b31',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  mapToggleText: {
    color: '#e0e0ff',
    fontSize: 12,
    fontWeight: '600',
  },
  search: {
    backgroundColor: '#1a1a1e',
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    fontSize: 14,
    marginBottom: 16,
  },
  
  categoriesSection: {
    marginBottom: 16,
  },
  categoriesList: {
    paddingHorizontal: 4,
    gap: 8,
  },
  categoryButton: {
    backgroundColor: '#1a1a1e',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedCategory: {
    backgroundColor: '#2b2b31',
  },
  categoryText: {
    fontSize: 13,
    color: '#b2b2b8',
    fontWeight: '600',
  },
  selectedCategoryText: {
    color: '#e0e0ff',
  },

  content: { flex: 1, gap: 12 },
  rows: { flexDirection: 'column' },
  stack: { flexDirection: 'column' },
  
  section: {
    backgroundColor: '#121214',
    borderRadius: 16,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#c9c9ce',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1f1f22',
  },
  
  listWrap: { flex: 1 },
  listPad: { padding: 12, gap: 12 },

  card: {
    backgroundColor: '#1a1a1e',
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfo: {
    flex: 1,
    marginRight: 10,
  },
  cardTitle: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 2 
  },
  category: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  subtle: { 
    color: '#b2b2b8', 
    fontSize: 13, 
    marginBottom: 2 
  },
  time: { 
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  description: {
    color: '#888',
    fontSize: 12,
    lineHeight: 16,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#2b2b31',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  followedButton: {
    backgroundColor: '#007AFF',
  },
  favoritedButton: {
    backgroundColor: '#FFD60A',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  followedButtonText: {
    color: '#fff',
  },
  favoritedButtonText: {
    color: '#000',
  },
  cardMap: {
    height: 120,
    marginTop: 10,
    borderRadius: 8,
  },
  locationDisplay: {
    backgroundColor: '#2b2b31',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  locationText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
  },
  
  noResults: {
    color: '#c9c9ce',
    textAlign: 'center',
    fontSize: 16,
    padding: 20,
    fontStyle: 'italic',
  },
  
  // Map layout styles
  content: {
    flex: 1,
  },
  columns: {
    flexDirection: 'row',
  },
  stack: {
    flexDirection: 'column',
  },
  section: {
    flex: 1,
  },
  mapWrap: {
    position: 'relative',
    backgroundColor: '#1a1a1e',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    minHeight: 200,
  },
  centerFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
  },
  
  // Simple card layout
  cardContent: {
    flex: 1,
  },
  followButton: {
    backgroundColor: '#2b2b31',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  followedButton: {
    backgroundColor: '#007AFF',
  },
  followButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingText: {
    color: '#e0e0ff',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#1a1a1e',
    borderRadius: 12,
    position: 'relative',
    minHeight: 200,
  },
  mapTitle: {
    color: '#e0e0ff',
    fontSize: 16,
    fontWeight: '600',
    padding: 12,
    textAlign: 'center',
  },
  mapContent: {
    flex: 1,
    position: 'relative',
  },
  mapMarker: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  markerText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  selectedEventInfo: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 8,
    borderRadius: 8,
  },
  selectedEventTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  selectedEventVenue: {
    color: '#e0e0ff',
    fontSize: 12,
    marginTop: 2,
  },
  categories: {
    color: '#a0a0ff',
    fontSize: 11,
    marginTop: 4,
    fontStyle: 'italic',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptyText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtext: {
    color: '#8e8e95',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});