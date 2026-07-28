import { useState } from 'react'
import { View, ScrollView, StyleSheet, TouchableOpacity, FlatList } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Stack } from 'expo-router'
import { Text } from '@/components/ui/Text'
import { colors, spacing, radius } from '@/lib/theme'

type Tab = 'Announcements' | 'Tickets'

interface Message {
  id: string
  title: string
  body: string
  time: string
  unread: boolean
  type: 'announcement' | 'ticket'
}

const MESSAGES: Message[] = [
  { id: '1', title: 'Welcome to Pure Eight Staff', body: 'Thank you for joining. Use this app to manage your daily operations.', time: 'Just now', unread: true, type: 'announcement' },
]

export default function InboxScreen() {
  const [tab, setTab] = useState<Tab>('Announcements')

  const filtered = MESSAGES.filter(
    (m) => (tab === 'Announcements' ? m.type === 'announcement' : m.type === 'ticket')
  )

  return (
    <>
      <Stack.Screen options={{ title: 'Inbox' }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        {/* Tabs */}
        <View style={styles.tabs}>
          {(['Announcements', 'Tickets'] as Tab[]).map((t) => (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text variant="body" style={tab === t ? styles.tabTextActive : { color: colors.gray400 }}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.messageRow} activeOpacity={0.7}>
              <View style={[styles.dot, { opacity: item.unread ? 1 : 0 }]} />
              <View style={{ flex: 1 }}>
                <Text variant="body" style={{ fontWeight: item.unread ? '600' : '400' }}>{item.title}</Text>
                <Text variant="bodySmall" color="muted" numberOfLines={2} style={{ marginTop: 2 }}>{item.body}</Text>
                <Text variant="label" color="muted" style={{ marginTop: spacing.xs }}>{item.time}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
            </TouchableOpacity>
          )}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="mail-outline" size={40} color={colors.gray200} />
              <Text variant="body" color="muted" style={{ marginTop: spacing.md }}>No {tab.toLowerCase()} yet</Text>
            </View>
          }
        />
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  tabs: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.gray100,
    paddingHorizontal: spacing.lg,
  },
  tab: { paddingVertical: spacing.md, marginRight: spacing.xl, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: colors.black },
  tabTextActive: { color: colors.black, fontWeight: '600' },
  list: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  messageRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.black, marginTop: 4 },
  separator: { height: 1, backgroundColor: colors.gray100 },
  empty: { alignItems: 'center', paddingTop: spacing.xxl },
})
