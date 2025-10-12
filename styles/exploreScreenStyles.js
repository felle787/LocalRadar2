import { StyleSheet } from 'react-native';

export const exploreScreenStyles = StyleSheet.create({
  screen: { 
    flex: 1, 
    backgroundColor: '#0b0b0c',
    paddingHorizontal: 16,
    paddingTop: 8
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 12,
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
  },
  cardTitle: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: '700', 
    marginBottom: 4 
  },
  subtle: { 
    color: '#b2b2b8', 
    fontSize: 13, 
    marginBottom: 2 
  },
  time: { 
    color: '#e0e0ff', 
    fontSize: 13 
  },
  
  noResults: {
    color: '#c9c9ce',
    textAlign: 'center',
    fontSize: 16,
    padding: 20,
    fontStyle: 'italic',
  },
});