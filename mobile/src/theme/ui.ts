// Proper CSS framework for React Native - shared UI primitives
// Replaces duplicated StyleSheet blocks and removes dead CSS across screens
// Inspired by Tailwind utility composition but type-safe for RN
import { StyleSheet } from 'react-native';
import { colors } from './colors';
import { spacing } from './spacing';
import { radius } from './radius';
import { shadows } from './shadows';
import { typography } from './typography';

export const ui = StyleSheet.create({
  // Layout
  flex1: { flex: 1 },
  row: { flexDirection: 'row' as const },
  center: { alignItems: 'center' as const, justifyContent: 'center' as const },
  rowCenter: { flexDirection: 'row' as const, alignItems: 'center' as const },
  rowBetween: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const },

  // Surfaces
  screen: { flex: 1, backgroundColor: colors.bg },
  surface: { backgroundColor: colors.surface },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[3.5],
    ...shadows.card,
  },
  cardElevated: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing[4],
    ...shadows.cardElevated,
  },

  // Typography helpers
  h1: { fontSize: typography.size['5xl'], fontWeight: typography.weight.black, color: colors.text, letterSpacing: -0.5 },
  h2: { fontSize: typography.size['3xl'], fontWeight: typography.weight.extraBold, color: colors.text },
  subtitle: { fontSize: typography.size.md, color: colors.textMuted },
  caption: { fontSize: typography.size.sm, fontWeight: typography.weight.bold, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3 },

  // Inputs - single source replaces ~15 duplicated formInput blocks
  input: {
    height: 44,
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[3],
    fontSize: typography.size.md,
    color: colors.text,
  },
  inputRow: { flexDirection: 'row', gap: spacing[2], marginBottom: spacing[3] },

  // Buttons - replaces duplicated saveBtn/cancelBtn/...  (dead CSS removed)
  btnPrimary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    gap: spacing[1.5],
  },
  btnPrimaryText: { color: '#fff', fontSize: typography.size.md, fontWeight: typography.weight.extraBold },
  btnGhost: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  btnGhostText: { color: colors.text, fontSize: typography.size.md, fontWeight: typography.weight.bold },
  btnDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.dangerLight,
    paddingVertical: spacing[2.5],
    borderRadius: radius.md,
    gap: spacing[1],
  },

  // Pills / Badges
  pill: {
    backgroundColor: colors.bg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pillActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },

  // Modal framework - single definition replaces 6 duplicated modalOverlay/modalContent blocks
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' as const },
  modalOverlayCenter: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center' as const, padding: spacing[5] },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    padding: spacing[5],
    maxHeight: '90%' as const,
  },
  modalContentCenter: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    padding: spacing[5],
    maxHeight: '80%' as const,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing[4] },
  modalTitle: { fontSize: typography.size['3xl'], fontWeight: typography.weight.extraBold, color: colors.text },
  modalActions: { flexDirection: 'row', gap: spacing[2.5], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border },

  // Search / Filter bar
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[2.5],
  },
  searchInput: { flex: 1, height: 42, fontSize: typography.size.md, color: colors.text, marginLeft: spacing[1.5] },

  // Empty / Error states
  emptyBox: { alignItems: 'center', justifyContent: 'center', padding: spacing[7], paddingVertical: 60 },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    backgroundColor: colors.dangerLight,
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: spacing[2.5],
    borderRadius: radius.md,
  },

  // Dividers
  divider: { height: 1, backgroundColor: colors.border },
  dashLine: { height: 1, borderWidth: 1, borderColor: colors.border, borderStyle: 'dashed', marginVertical: spacing[3] },
});

export const tokens = { colors, spacing, radius, shadows, typography };
