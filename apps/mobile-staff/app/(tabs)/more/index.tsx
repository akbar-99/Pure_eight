import { View, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { Text } from '@/components/ui/Text'
import { PureEightLogo } from '@/components/ui/PureEightLogo'
import { useAuthStore } from '@/stores/auth-store'
import { useRole } from '@/hooks/useRole'
import { colors, spacing, radius } from '@/lib/theme'

interface MenuItem {
  label: string
  icon: string
  subtitle?: string
  route?: string
  danger?: boolean
  managerOnly?: boolean
}

const SECTIONS: { title: string; items: MenuItem[] }[] = [
  {
    title: 'Operations',
    items: [
      { label: 'Reports', icon: 'bar-chart-outline', subtitle: 'Daily, staff, service summaries', route: '/(tabs)/more/reports', managerOnly: true },
      { label: 'Attendance', icon: 'finger-print-outline', subtitle: 'Clock in / clock out', route: '/(tabs)/more/attendance' },
      { label: 'Inbox', icon: 'mail-outline', subtitle: 'Tickets & announcements', route: '/(tabs)/more/inbox' },
      { label: 'Audits', icon: 'clipboard-outline', subtitle: 'Quality checklists', route: '/(tabs)/more/audits', managerOnly: true },
    ],
  },
  {
    title: 'Learning',
    items: [
      { label: 'Training', icon: 'school-outline', subtitle: 'Courses & certifications', route: '/(tabs)/more/training' },
    ],
  },
  {
    title: 'Account',
    items: [
      { label: 'Settings', icon: 'settings-outline', route: '/(tabs)/more/settings' },
      { label: 'Sign Out', icon: 'log-out-outline', danger: true },
    ],
  },
]

export default function MoreScreen() {
  const { signOut, user } = useAuthStore()
  const { isManager, role } = useRole()

  const roleBadge = {
    hq_admin: 'HQ Admin',
    franchisee_owner: 'Franchisee Owner',
    outlet_manager: 'Outlet Manager',
    staff: 'Staff',
  }[role]

  function handleItem(item: MenuItem) {
    if (item.danger) {
      Alert.alert('Sign out', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut()
            router.replace('/(auth)/login')
          },
        },
      ])
      return
    }
    if (item.route) {
      router.push(item.route as any)
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile banner */}
        <View style={styles.profile}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={24} color={colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text variant="heading3">{user?.user_metadata?.full_name ?? 'Staff Member'}</Text>
            <Text variant="bodySmall" color="muted">{user?.email}</Text>
          </View>
          <View style={styles.rolePill}>
            <Text variant="label" style={{ color: colors.white, fontSize: 10 }}>{roleBadge}</Text>
          </View>
        </View>

        {SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => !item.managerOnly || isManager)
          if (visibleItems.length === 0) return null
          return (
          <View key={section.title} style={styles.section}>
            <Text variant="label" color="muted" style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.menuGroup}>
              {visibleItems.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[
                    styles.menuItem,
                    idx < visibleItems.length - 1 && styles.menuItemBorder,
                  ]}
                  onPress={() => handleItem(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon as any}
                    size={20}
                    color={item.danger ? colors.gray700 : colors.black}
                  />
                  <View style={{ flex: 1 }}>
                    <Text variant="body" style={item.danger ? { color: colors.gray700 } : {}}>
                      {item.label}
                    </Text>
                    {item.subtitle && (
                      <Text variant="bodySmall" color="muted">{item.subtitle}</Text>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                </TouchableOpacity>
              ))}
            </View>
          </View>
          )
        })}

        <View style={styles.versionBlock}>
          <PureEightLogo width={130} color="dark" />
          <Text variant="label" color="muted" style={{ marginTop: spacing.xs }}>Staff v1.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  profile: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.white, padding: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
  section: { marginTop: spacing.lg, paddingHorizontal: spacing.lg },
  sectionTitle: { marginBottom: spacing.sm },
  menuGroup: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.gray100,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    padding: spacing.md, minHeight: 56,
  },
  menuItemBorder: {
    borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  versionBlock: { alignItems: 'center', marginTop: spacing.xxl, marginBottom: spacing.xl, opacity: 0.5 },
  rolePill: {
    backgroundColor: colors.gray700, borderRadius: 99,
    paddingHorizontal: spacing.sm, paddingVertical: 3,
  },
})
