import { useState } from 'react'
import { View, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { colors, spacing, radius } from '@/lib/theme'

interface Customer {
  id: string
  name: string
  mobile: string
  lastVisit: string
  totalSpend: number
}

const MOCK: Customer[] = [
  { id: '1', name: 'Priya Sharma', mobile: '98765 43210', lastVisit: '24 May 2026', totalSpend: 12400 },
  { id: '2', name: 'Rahul Menon', mobile: '91234 56789', lastVisit: '20 May 2026', totalSpend: 8750 },
  { id: '3', name: 'Aisha Khan', mobile: '99887 76655', lastVisit: '18 May 2026', totalSpend: 23100 },
]

export default function CustomersScreen() {
  const [query, setQuery] = useState('')

  const filtered = MOCK.filter(
    (c) => c.name.toLowerCase().includes(query.toLowerCase()) || c.mobile.includes(query)
  )

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text variant="heading3">Customers</Text>
        <TouchableOpacity hitSlop={12}>
          <Ionicons name="person-add-outline" size={22} color={colors.black} />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search-outline" size={18} color={colors.gray400} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or mobile…"
          placeholderTextColor={colors.gray400}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.gray400} />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.customerRow} activeOpacity={0.7}>
            <View style={styles.avatar}>
              <Text variant="heading3" color="inverse">{item.name[0]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="body">{item.name}</Text>
              <Text variant="bodySmall" color="muted">{item.mobile} · Last visit {item.lastVisit}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="bodySmall" color="muted">Spent</Text>
              <Text variant="body">₹{item.totalSpend.toLocaleString()}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color={colors.gray300} />
            <Text variant="body" color="muted" style={{ marginTop: spacing.md }}>No customers found</Text>
          </View>
        }
      />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.sm,
    height: 44, backgroundColor: colors.gray50,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.black },
  list: { paddingHorizontal: spacing.lg },
  separator: { height: 1, backgroundColor: colors.gray100 },
  customerRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.black,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyState: { alignItems: 'center', paddingTop: spacing.xxl },
})
