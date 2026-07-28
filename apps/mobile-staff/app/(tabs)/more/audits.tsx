import { useState } from 'react'
import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Stack } from 'expo-router'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { colors, spacing, radius } from '@/lib/theme'

interface CheckItem {
  id: string
  label: string
  checked: boolean | null
}

const INITIAL_CHECKLIST: CheckItem[] = [
  { id: '1', label: 'Reception area clean and tidy', checked: null },
  { id: '2', label: 'Workstations sanitised', checked: null },
  { id: '3', label: 'Service menu displayed correctly', checked: null },
  { id: '4', label: 'Staff in uniform with name badge', checked: null },
  { id: '5', label: 'Products stocked and labelled', checked: null },
  { id: '6', label: 'Music playing at appropriate volume', checked: null },
  { id: '7', label: 'Restrooms clean and stocked', checked: null },
  { id: '8', label: 'Opening checklist signed', checked: null },
]

export default function AuditsScreen() {
  const [items, setItems] = useState<CheckItem[]>(INITIAL_CHECKLIST)

  function toggle(id: string, value: boolean) {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, checked: value } : item))
  }

  const completed = items.filter((i) => i.checked !== null).length
  const passed = items.filter((i) => i.checked === true).length

  return (
    <>
      <Stack.Screen options={{ title: 'Quality Audit' }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Score */}
          <Card style={styles.scoreCard}>
            <Text variant="label" color="muted">TODAY'S OPENING AUDIT</Text>
            <Text variant="heading1" style={{ marginTop: spacing.sm }}>{completed}/{items.length}</Text>
            <Text variant="body" color="muted">items reviewed · {passed} passed</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(completed / items.length) * 100}%` }]} />
            </View>
          </Card>

          {/* Checklist */}
          <Text variant="label" color="muted" style={styles.sectionLabel}>CHECKLIST</Text>
          <Card padded={false}>
            {items.map((item, idx) => (
              <View
                key={item.id}
                style={[styles.checkRow, idx < items.length - 1 && styles.checkBorder]}
              >
                <Text variant="body" style={{ flex: 1 }}>{item.label}</Text>
                <View style={styles.actions}>
                  <TouchableOpacity
                    style={[styles.checkBtn, item.checked === true && styles.checkBtnActive]}
                    onPress={() => toggle(item.id, true)}
                    hitSlop={8}
                  >
                    <Ionicons name="checkmark" size={16} color={item.checked === true ? colors.white : colors.gray400} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.checkBtn, item.checked === false && styles.checkBtnFail]}
                    onPress={() => toggle(item.id, false)}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={16} color={item.checked === false ? colors.white : colors.gray400} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </Card>

          {completed === items.length && (
            <Button label="Submit Audit" size="lg" fullWidth onPress={() => {}} />
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  content: { padding: spacing.lg, gap: spacing.lg },
  scoreCard: { alignItems: 'center', paddingVertical: spacing.xl },
  progressBar: {
    height: 3, width: '80%', backgroundColor: colors.gray100,
    borderRadius: 2, marginTop: spacing.md,
  },
  progressFill: { height: 3, backgroundColor: colors.black, borderRadius: 2 },
  sectionLabel: {},
  checkRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, minHeight: 52,
  },
  checkBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  checkBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 1, borderColor: colors.gray200,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white,
  },
  checkBtnActive: { backgroundColor: colors.black, borderColor: colors.black },
  checkBtnFail: { backgroundColor: colors.gray700, borderColor: colors.gray700 },
})
