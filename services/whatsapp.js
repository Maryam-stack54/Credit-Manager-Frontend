import { Alert, Linking } from 'react-native';

// WhatsApp needs numbers in international format without "+":
// 08031234567 -> 2348031234567
export function toWhatsAppNumber(phone) {
  const digits = String(phone || '').replace(/\D/g, '');

  if (digits.startsWith('234')) return digits;
  if (digits.startsWith('0') && digits.length === 11) {
    return `234${digits.slice(1)}`;
  }

  return digits;
}

const money = (amount) => `₦${Number(amount || 0).toLocaleString()}`;

const formatDate = (date) =>
  new Date(date).toLocaleDateString('en-NG', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });

const isPastDue = (credit) =>
  credit.dueDate &&
  new Date(credit.dueDate) < new Date(new Date().toDateString());

const greeting = (customerName, senderName) => {
  const firstName = String(customerName || '').trim().split(/\s+/)[0];
  const hello = firstName ? `Hello ${firstName}` : 'Hello';

  return senderName ? `${hello}, this is ${senderName}.` : `${hello}.`;
};

const dueLine = (credit) =>
  isPastDue(credit)
    ? `This was due on ${formatDate(credit.dueDate)} and is now overdue.`
    : `Due on ${formatDate(credit.dueDate)}.`;

// Reminder about one credit: what they bought, what is left and when it is due
export function buildCreditReminder({ customerName, senderName, credit }) {
  const items = (credit.items || [])
    .map((item) => `• ${item.name} × ${item.quantity}`)
    .join('\n');

  const paid = Number(credit.totalAmount || 0) - Number(credit.balance || 0);

  return [
    greeting(customerName, senderName),
    '',
    `This is a friendly reminder that you have an outstanding balance of ${money(credit.balance)}${
      paid > 0 ? ` (you have paid ${money(paid)} of ${money(credit.totalAmount)})` : ''
    }.`,
    items ? `\n${items}\n` : '',
    dueLine(credit),
    '',
    'Thank you for your patronage!',
  ]
    .filter((line, index, lines) => !(line === '' && lines[index - 1] === ''))
    .join('\n');
}

// Reminder about everything a customer still owes
export function buildCustomerReminder({ customerName, senderName, credits }) {
  const unpaid = credits.filter((credit) => Number(credit.balance) > 0);

  if (unpaid.length === 1) {
    return buildCreditReminder({ customerName, senderName, credit: unpaid[0] });
  }

  const total = unpaid.reduce((sum, credit) => sum + Number(credit.balance), 0);

  const lines = unpaid
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .map(
      (credit) =>
        `• ${money(credit.balance)}: ${
          isPastDue(credit)
            ? `was due ${formatDate(credit.dueDate)} (overdue)`
            : `due ${formatDate(credit.dueDate)}`
        }`
    )
    .join('\n');

  return [
    greeting(customerName, senderName),
    '',
    `This is a friendly reminder that you have an outstanding balance of ${money(total)}:`,
    '',
    lines,
    '',
    'Thank you for your patronage!',
  ].join('\n');
}

// Opens WhatsApp on the customer's chat with the message typed in.
// Nothing is sent until the shop owner presses send.
export async function openWhatsApp(phone, message) {
  const number = toWhatsAppNumber(phone);

  if (number.length < 10) {
    Alert.alert(
      'Check the phone number',
      'This customer’s phone number does not look complete. Edit the customer and try again.'
    );
    return;
  }

  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

  try {
    await Linking.openURL(url);
  } catch (error) {
    Alert.alert(
      'Could not open WhatsApp',
      'Make sure WhatsApp is installed on this phone.'
    );
  }
}
