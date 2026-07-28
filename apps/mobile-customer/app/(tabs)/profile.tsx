import { View, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text } from 'react-native'
import { useAuthStore } from '@/stores/auth-store'
import { colors, spacing, radius } from '@/lib/theme'

const MENU = [
  { label: 'Edit Profile', icon: 'person-outline' },
  { label: 'Notifications', icon: 'notifications-outline' },
  { label: 'Refer & Earn', icon: 'share-social-outline' },
  { label: 'Gift Cards', icon: 'gift-outline' },
  { label: 'Help & Support', icon: 'help-circle-outline' },
  { label: 'Sign Out', icon: 'log-out-outline', danger: true },
]

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore()

  function handlePress(label: string) {
    if (label === 'Sign Out') {
      Alert.alert('Sign out', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ])
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={32} color={colors.white} />
          </View>
          <Text style={styles.name}>{user?.user_metadata?.full_name ?? 'Guest'}</Text>
          <Text style={styles.phone}>{user?.phone ?? user?.email ?? '—'}</Text>
        </View>

        {/* Menu */}
        <View style={styles.menuGroup}>
          {MENU.map((item, idx) => (
            <TouchableOpacity
              key={item.label}
              style={[styles.menuItem, idx < MENU.length - 1 && styles.menuBorder]}
              onPress={() => handlePress(item.label)}
              activeOpacity={0.7}
            >
              <Ionicons name={item.icon as any} size={20} color={item.danger ? colors.gray600 : colors.black} />
              <Text style={[styles.menuLabel, item.danger && styles.menuDanger]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.gray300} style={{ marginLeft: 'auto' }} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.version}>PURE EIGHT v1.0</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  profile: { alignItems: 'center', paddingVertical: spacing.xl, backgroundColor: colors.white, marginBottom: spacing.lg },
  avatar: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.black,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  name: { fontSize: 20, fontWeight: '700', color: colors.black },
  phone: { fontSize: 14, color: colors.gray500, marginTop: 4 },
  menuGroup: {
    marginHorizontal: spacing.lg, backgroundColor: colors.white,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.gray100, overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, minHeight: 56,
  },
  menuBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  menuLabel: { fontSize: 15, color: colors.black, fontWeight: '400' },
  menuDanger: { color: colors.gray700 },
  version: {
    fontSize: 11, fontWeight: '500', color: colors.gray400,
    letterSpacing: 1, textAlign: 'center',
    marginTop: spacing.xl, marginBottom: spacing.xl,
  },
})
