import { StyleSheet } from 'react-native';

export const exploreScreenStyles = StyleSheet.create({
  // Main styles til ExploreScreen
  container: {
    flex: 1,
    backgroundColor: 'rgba(39, 87, 158, 1)',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  header: {
    padding: 16,
    paddingBottom: 4,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    color: '#c9c9ce',
    fontSize: 16,
    marginBottom: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1e',
  },
  loadingText: {
    color: '#c9c9ce',
    marginTop: 12,
    fontSize: 16,
  },
  
  // Card stylinfg
  card: {
    backgroundColor: '#1a1a1e',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2b2b31',
    overflow: 'hidden',
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  cardTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  distanceText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cardSubtitle: {
    color: '#c9c9ce',
    fontSize: 14,
    marginBottom: 6,
  },
  cardDescription: {
    color: '#9aa0a6',
    fontSize: 14,
    marginBottom: 6,
  },
  cardCategories: {
    color: '#007AFF',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Follow knap styles
  followButton: {
    backgroundColor: '#2b2b31',
    padding: 12,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#2b2b31',
  },
  followButtonActive: {
    backgroundColor: '#007AFF',
  },
  followButtonText: {
    color: '#c9c9ce',
    fontSize: 14,
    fontWeight: '600',
  },
  followButtonTextActive: {
    color: '#fff',
  },
  
  // tomt state styles
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#c9c9ce',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: '#9aa0a6',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  
  // Filter styles
  filterContainer: {
    backgroundColor: '#1a1a1e',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2b2b31',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterTitle: {
    color: '#c9c9ce',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b2b31',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  filterButtonActive: {
    backgroundColor: '#0084ff',
  },
  filterButtonText: {
    color: '#c9c9ce',
    fontSize: 14,
    fontWeight: '500',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  filterArrow: {
    color: '#9aa0a6',
    fontSize: 12,
  },
  clearFiltersButton: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  clearFiltersText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // Dropdown styles
  dropdownContainer: {
    backgroundColor: '#2b2b31',
    borderRadius: 12,
    marginTop: 8,
    maxHeight: 200,
    overflow: 'hidden',
  },
  dropdownHeader: {
    color: '#0084ff',
    fontSize: 14,
    fontWeight: '600',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#1a1a1e',
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: '#404040',
  },
  dropdownItemSelected: {
    backgroundColor: '#0084ff',
  },
  dropdownItemText: {
    color: '#fff',
    fontSize: 14,
  },
  dropdownItemTextSelected: {
    fontWeight: '600',
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  
  //input styling
  distanceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2b2b31',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: '#404040',
  },
  distanceLabel: {
    color: '#c9c9ce',
    fontSize: 14,
    fontWeight: '500',
  },
  distanceInput: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    minWidth: 40,
    backgroundColor: '#1a1a1e',
    paddingHorizontal: 8,
    paddingVertical: 0,
    borderRadius: 8,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: '#0084ff',
  },
  doneButton: {
    backgroundColor: '#0084ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 4,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // View toggle styling
  viewToggle: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1e',
    borderRadius: 8,
    padding: 2,
    marginTop: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  toggleButtonActive: {
    backgroundColor: '#007AFF',
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9aa0a6',
  },
  toggleButtonTextActive: {
    color: '#fff',
  },
  
  // Event card styling
  eventCard: {
    backgroundColor: '#1a1a1e',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#2b2b31',
  },
  eventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  eventMainInfo: {
    flex: 1,
    marginRight: 8,
  },
  eventSideInfo: {
    alignItems: 'flex-end',
  },
  eventTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  eventVenue: {
    color: '#9aa0a6',
    fontSize: 12,
  },
  eventDate: {
    color: '#FF6B6B',
    fontSize: 11,
    fontWeight: '500',
    marginBottom: 2,
  },
  eventDistance: {
    color: '#007AFF',
    fontSize: 10,
    fontWeight: '500',
  },
  
  resultCount: {
    color: '#0084ff',
    fontSize: 14,
    fontWeight: '500',
  },
  
  // Layout styling
  content: { 
    flex: 1, 
    gap: 4 
  },
  section: {
    backgroundColor: '#121214',
    borderRadius: 16,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  mapWrap: {
    position: 'relative',
    backgroundColor: '#1a1a1e',
    borderRadius: 12,
    marginBottom: 4,
    overflow: 'hidden',
    height: 300,
  },
  listWrap: { 
    flex: 1 
  },
  listPad: { 
    padding: 12, 
    gap: 12 
  },
  
  // Original styling til ExploreScreen
  safe: { 
    flex: 1, 
    backgroundColor: 'rgba(39, 87, 158, 1)' 
  },
  screen: { 
    flex: 1, 
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: 'rgba(39, 87, 158, 1)'
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

  
  listWrap: { flex: 1 },
  listPad: { padding: 12, gap: 12 },


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
  
  // Map layout styling  
  columns: {
    flexDirection: 'row',
  },
  centerFill: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 200,
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