import { StyleSheet } from 'react-native';
import colors from '../config/colors';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(39, 87, 158, 1)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  titleSection: {
    marginBottom: 24,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  eventTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  freeBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  freeBadgeText: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  priceBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  priceBadgeText: {
    color: colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  venueInfo: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  addressText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
  dateTimeText: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  capacityContainer: {
    gap: 8,
  },
  capacityText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  capacityBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  capacityFill: {
    height: '100%',
    borderRadius: 4,
  },
  fullEventText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  descriptionText: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
  },
  venueNameText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  venueAddressText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  buttonContainer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  participateButton: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  participatingButton: {
    backgroundColor: colors.border,
  },
  disabledButton: {
    opacity: 0.6,
  },
  participateButtonText: {
    color: colors.textOnPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  participatingButtonText: {
    color: colors.primary,
  },
  pastEventNotice: {
    backgroundColor: colors.border,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  pastEventText: {
    color: colors.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default styles;