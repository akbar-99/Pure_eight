import { useState } from 'react'
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, FlatList,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { colors, spacing, radius } from '@/lib/theme'

interface LineItem {
  id: string
  name: string
  price: number
  qty: number
}

export default function POSScreen() {
  const [search, setSearch] = useState('')
  const [bill, setBill] = useState<LineItem[]>([])

  const total = bill.reduce((sum, item) => sum + item.price * item.qty, 0)

  function addItem(item: Omit<LineItem, 'qty'>) {
    setBill((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) return prev.map((i) => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...item, qty: 1 }]
    })
  }

  function removeItem(id: string) {
    setBill((prev) => prev.filter((i) => i.id !== id))
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text variant="heading3">Quick Sale</Text>
        <TouchableOpacity hitSlop={12}>
          <Ionicons name="barcode-outline" size={24} color={colors.black} />
        </TouchableOpacity>
      </View>

      {/* Customer chip */}
      <TouchableOpacity style={styles.customerBar} activeOpacity={0.7}>
        <Ionicons name="person-outline" size={18} color={colors.gray500} />
        <Text variant="body" color="muted" style={{ flex: 1 }}>Select customer (optional)</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.gray400} />
      </TouchableOpacity>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Search services / products */}
        <View style={styles.searchRow}>
          <Ionicons name="search-outline" size={18} color={colors.gray400} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search services & products…"
            placeholderTextColor={colors.gray400}
          />
        </View>

        {/* Catalogue placeholder */}
        <View style={styles.catalogSection}>
          <Text variant="label" color="muted" style={{ marginBottom: spacing.sm }}>Services</Text>
          {['Haircut — ₹500', 'Blowdry — ₹400', 'Hair Colour — ₹2,000', 'Facial — ₹1,200'].map((svc, i) => (
            <TouchableOpacity
              key={i}
              style={styles.catalogItem}
              onPress={() => addItem({ id: String(i), name: svc.split(' — ')[0], price: parseInt(svc.split('₹')[1].replace(',', '')) })}
              activeOpacity={0.7}
            >
              <Text variant="body">{svc.split(' — ')[0]}</Text>
              <Text variant="body" color="muted">{svc.split(' — ')[1]}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Bill */}
        {bill.length > 0 && (
          <View style={styles.billSection}>
            <Text variant="label" color="muted" style={{ marginBottom: spacing.sm }}>Bill</Text>
            {bill.map((item) => (
              <View key={item.id} style={styles.billRow}>
                <Text variant="body" style={{ flex: 1 }}>{item.name}</Text>
                <Text variant="body" color="muted">×{item.qty}</Text>
                <Text variant="body" style={{ width: 80, textAlign: 'right' }}>
                  ₹{(item.price * item.qty).toLocaleString()}
                </Text>
                <TouchableOpacity onPress={() => removeItem(item.id)} hitSlop={8} style={{ marginLeft: spacing.sm }}>
                  <Ionicons name="close" size={16} color={colors.gray400} />
                </TouchableOpacity>
              </View>
            ))}

            {/* Total */}
            <View style={[styles.billRow, styles.totalRow]}>
              <Text variant="heading3" style={{ flex: 1 }}>Total</Text>
              <Text variant="heading3">₹{total.toLocaleString()}</Text>
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Save bill CTA */}
      {bill.length > 0 && (
        <View style={styles.cta}>
          <Button
            label={`Save Bill — ₹${total.toLocaleString()}`}
            fullWidth
            size="lg"
            onPress={() => {}}
          />
        </View>
      )}
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
  customerBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.lg, marginTop: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.sm,
    backgroundColor: colors.gray50,
  },
  scroll: { flex: 1 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: spacing.lg, marginTop: spacing.md,
    borderWidth: 1, borderColor: colors.gray200, borderRadius: radius.sm,
    backgroundColor: colors.white, paddingHorizontal: spacing.sm,
  },
  searchIcon: { marginRight: spacing.xs },
  searchInput: { flex: 1, height: 44, fontSize: 15, color: colors.black },
  catalogSection: { paddingHorizontal: spacing.lg, marginTop: spacing.lg },
  catalogItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.gray100,
  },
  billSection: {
    marginHorizontal: spacing.lg, marginTop: spacing.xl,
    paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.gray200,
  },
  billRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  totalRow: {
    paddingTop: spacing.md, marginTop: spacing.sm,
    borderTopWidth: 1, borderTopColor: colors.gray200,
  },
  cta: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing.lg, paddingBottom: 34,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.gray100,
  },
})
