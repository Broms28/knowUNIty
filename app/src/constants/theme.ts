// KnowUNIty Design Tokens — Knowunity-inspired design language
export const colors = {
    // Primary purple
    primary: '#6C47FF',
    primaryLight: '#8B6FFF',
    primaryDark: '#4E2FE0',
    primaryFaded: '#EDE8FF',

    // Accent
    accent: '#FF6B6B',
    accentLight: '#FFE5E5',
    success: '#22C55E',
    successLight: '#DCFCE7',
    warning: '#F59E0B',
    warningLight: '#FEF3C7',

    // Neutrals
    background: '#F8F7FF',
    surface: '#FFFFFF',
    surfaceElevated: '#FFFFFF',
    border: '#E8E4FF',
    borderLight: '#F0EDF8',

    // Text
    textPrimary: '#1A1033',
    textSecondary: '#6B7280',
    textMuted: '#9CA3AF',
    textOnPrimary: '#FFFFFF',

    // Card backgrounds
    cardPurple: '#EDE8FF',
    cardBlue: '#E8F0FE',
    cardGreen: '#DCFCE7',
    cardPink: '#FCE7F3',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
};

export const radii = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    full: 9999,
};

export const shadows = {
    sm: {
        shadowColor: '#6C47FF',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 2,
    },
    md: {
        shadowColor: '#6C47FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 4,
    },
    lg: {
        shadowColor: '#6C47FF',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.16,
        shadowRadius: 24,
        elevation: 8,
    },
};

export const typography = {
    h1: { fontSize: 32, fontWeight: '800' as const, letterSpacing: -0.5 },
    h2: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
    h3: { fontSize: 20, fontWeight: '700' as const, letterSpacing: -0.2 },
    h4: { fontSize: 17, fontWeight: '600' as const },
    body: { fontSize: 15, fontWeight: '400' as const },
    bodyMedium: { fontSize: 15, fontWeight: '500' as const },
    caption: { fontSize: 13, fontWeight: '400' as const },
    label: { fontSize: 12, fontWeight: '600' as const, letterSpacing: 0.5 },
};
