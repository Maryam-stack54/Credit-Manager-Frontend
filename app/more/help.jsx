import { useMemo, useState } from 'react';
import Constants from 'expo-constants';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useAppTheme } from '../../context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import Logo from '../../components/Logo';

// Questions and answers shown in the How to use section
const GUIDE = [
  {
    question: 'How do I add a customer?',
    answer:
      'Open the Customers tab and tap the green + button at the top. Enter their name and phone number (address is optional), then tap "Save Customer".',
  },
  {
    question: 'How do I give a customer goods on credit?',
    answer:
      'Open the customer from the Customers tab and tap "New Credit". Add each item with its quantity and price, choose the due date, then tap "Save Credit". The total is worked out for you.',
  },
  {
    question: 'How do I record a payment?',
    answer:
      'Open the credit (from the Credits tab or the customer\'s Credit History) and tap "Add Payment". Enter the amount, choose how they paid (Cash, POS, Bank Transfer or Other), add a note if you like, then tap "Save Payment". The balance updates straight away.',
  },
  {
    question: 'What do Pending, Partially Paid and Paid mean?',
    answer:
      'Pending: nothing has been paid yet.\nPartially Paid: some money has been paid, but there is still a balance.\nPaid: the full amount has been paid and the credit is cleared.',
  },
  {
    question: 'What does "Overdue" mean on the Home screen?',
    answer:
      'A credit is overdue when its due date has passed and it still has a balance. "Due Soon" shows credits due in the next 7 days, so you can follow up early.',
  },
  {
    question: 'Can I change a credit after saving it?',
    answer:
      'Yes. Open the credit and tap "Edit Credit" to change the items or the due date. Payments already recorded are kept and the balance is worked out again, so the new total cannot be less than what has already been paid.',
  },
  {
    question: 'How do I remind a customer to pay on WhatsApp?',
    answer:
      'Open the customer, or one of their credits, and tap "Remind on WhatsApp". WhatsApp opens on their chat with a polite message already written, showing how much they owe and when it is due. Check it, change anything you like, then press send. Nothing is sent until you press send. Add your business name in More > Business details so the message says who it is from.',
  },
  {
    question: 'How do payment reminders work?',
    answer:
      'Go to More > Payment reminders and choose when you want to be reminded: 1 week before, 1 day before and/or on the due date. Reminders arrive at 9:00 AM and stop once a credit is fully paid. Tap a reminder to open that credit.',
  },
];

// One question that opens to show its answer when tapped
function GuideItem({ question, answer, isLast, styles, colors }) {
  const [open, setOpen] = useState(false);

  return (
    <View style={[styles.guideItem, isLast && styles.rowLast]}>
      <Pressable
        style={styles.guideHeader}
        onPress={() => setOpen(!open)}
      >
        <Text style={[styles.guideQuestion, open && styles.guideQuestionOpen]}>
          {question}
        </Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={open ? colors.primary : colors.textMuted}
        />
      </Pressable>

      {open ? <Text style={styles.guideAnswer}>{answer}</Text> : null}
    </View>
  );
}

// About the app and the how-to guide
export default function HelpScreen() {
  const { colors } = useAppTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const version = Constants.expoConfig?.version || '1.0.0';

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* App name, version and what it is for */}
      <View style={styles.aboutCard}>
        <View style={styles.aboutRing} />

        <Logo size={68} />

        <Text style={styles.appName}>Credit Manager</Text>
        <Text style={styles.version}>Version {version}</Text>

        <Text style={styles.aboutText}>
          Credit Manager helps small business owners keep track of goods
          given out on credit, record payments as they come in, and know
          exactly who owes what, without the notebook.
        </Text>
      </View>

      {/* Tap a question to see its answer */}
      <Text style={styles.sectionTitle}>HOW TO USE</Text>
      <View style={styles.section}>
        {GUIDE.map((item, index) => (
          <GuideItem
            key={item.question}
            question={item.question}
            answer={item.answer}
            isLast={index === GUIDE.length - 1}
            styles={styles}
            colors={colors}
          />
        ))}
      </View>

      <Text style={styles.footer}>Made for small businesses in Nigeria</Text>
    </ScrollView>
  );
}

const createStyles = (colors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    padding: 20,
    paddingBottom: 40,
  },

  aboutCard: {
    backgroundColor: '#0B3D2C',
    borderRadius: 26,
    padding: 24,
    alignItems: 'center',
    marginBottom: 28,
    overflow: 'hidden',
    ...colors.shadow,
  },

  aboutRing: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 220,
    height: 220,
    borderRadius: 110,
    borderWidth: 38,
    borderColor: 'rgba(111,227,168,0.08)',
  },

  appName: {
    marginTop: 16,
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.4,
  },

  version: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
    marginBottom: 14,
  },

  aboutText: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    textAlign: 'center',
    lineHeight: 21,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: 10,
    marginLeft: 4,
  },

  section: {
    backgroundColor: colors.card,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.divider,
    overflow: 'hidden',
    ...colors.shadow,
  },

  guideItem: {
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },

  rowLast: {
    borderBottomWidth: 0,
  },

  guideHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },

  guideQuestion: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginRight: 12,
  },

  guideQuestionOpen: {
    color: colors.primary,
  },

  guideAnswer: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 21,
    paddingBottom: 16,
  },

  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.textMuted,
  },
});
