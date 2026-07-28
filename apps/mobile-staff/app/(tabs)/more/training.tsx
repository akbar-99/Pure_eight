import { View, ScrollView, StyleSheet, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { Stack } from 'expo-router'
import { Text } from '@/components/ui/Text'
import { Card } from '@/components/ui/Card'
import { colors, spacing, radius } from '@/lib/theme'

interface Course {
  id: string
  title: string
  category: string
  duration: string
  progress: number
  locked: boolean
}

const COURSES: Course[] = [
  { id: '1', title: 'Pure Eight Brand Standards', category: 'Onboarding', duration: '15 min', progress: 0, locked: false },
  { id: '2', title: 'POS & Billing Guide', category: 'Operations', duration: '10 min', progress: 0, locked: false },
  { id: '3', title: 'Customer Experience Excellence', category: 'Service', duration: '20 min', progress: 0, locked: false },
  { id: '4', title: 'Hygiene & Safety Standards', category: 'Compliance', duration: '12 min', progress: 0, locked: false },
  { id: '5', title: 'Advanced Colour Techniques', category: 'Technical', duration: '45 min', progress: 0, locked: true },
]

export default function TrainingScreen() {
  const completed = COURSES.filter((c) => c.progress === 100).length

  return (
    <>
      <Stack.Screen options={{ title: 'Training' }} />
      <SafeAreaView style={styles.safe} edges={['bottom']}>
        <ScrollView contentContainerStyle={styles.content}>
          {/* Progress banner */}
          <Card style={styles.banner}>
            <Text variant="label" color="muted">YOUR PROGRESS</Text>
            <Text variant="heading2" style={{ marginTop: spacing.xs }}>{completed}/{COURSES.length} courses</Text>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(completed / COURSES.length) * 100}%` }]} />
            </View>
          </Card>

          <Text variant="label" color="muted" style={styles.sectionLabel}>COURSES</Text>
          <Card padded={false}>
            {COURSES.map((course, idx) => (
              <TouchableOpacity
                key={course.id}
                style={[styles.courseRow, idx < COURSES.length - 1 && styles.courseBorder]}
                disabled={course.locked}
                activeOpacity={0.7}
              >
                <View style={[styles.iconBox, course.locked && { opacity: 0.4 }]}>
                  <Ionicons
                    name={course.progress === 100 ? 'checkmark-circle' : 'play-circle-outline'}
                    size={24}
                    color={course.progress === 100 ? colors.black : colors.gray500}
                  />
                </View>
                <View style={{ flex: 1, opacity: course.locked ? 0.5 : 1 }}>
                  <Text variant="body">{course.title}</Text>
                  <Text variant="bodySmall" color="muted">{course.category} · {course.duration}</Text>
                </View>
                {course.locked
                  ? <Ionicons name="lock-closed-outline" size={16} color={colors.gray300} />
                  : <Ionicons name="chevron-forward" size={16} color={colors.gray300} />
                }
              </TouchableOpacity>
            ))}
          </Card>
        </ScrollView>
      </SafeAreaView>
    </>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.gray50 },
  content: { padding: spacing.lg, gap: spacing.lg },
  banner: {},
  progressBar: {
    height: 3, backgroundColor: colors.gray100, borderRadius: 2,
    marginTop: spacing.md,
  },
  progressFill: { height: 3, backgroundColor: colors.black, borderRadius: 2 },
  sectionLabel: {},
  courseRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, minHeight: 60,
  },
  courseBorder: { borderBottomWidth: 1, borderBottomColor: colors.gray100 },
  iconBox: { width: 40, alignItems: 'center', justifyContent: 'center' },
})
