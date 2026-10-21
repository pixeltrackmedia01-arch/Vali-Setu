import type { Language } from "@/lib/domain/constants";

/**
 * Concepts that must survive simplification and translation even though they
 * are words rather than numbers. Each concept lists the phrases that express it
 * in each language. Matching is deliberately conservative: a concept missing
 * from a translation is flagged for a person to check, never silently passed.
 *
 * Extend this list (or load it from the database) when new notice types or
 * dialect phrasing appear in the field.
 */
export type ConceptType = "document" | "action" | "location" | "event";

export interface Concept {
  key: string;
  type: ConceptType;
  label: string;
  /** Whether a missing concept blocks approval until a person resolves it. */
  critical: boolean;
  phrases: Record<Language, string[]>;
}

export const CONCEPTS: Concept[] = [
  // Documents and required items
  {
    key: "REPORT_CARD",
    type: "document",
    label: "Student report card",
    critical: true,
    phrases: {
      en: ["report card", "progress card", "result card", "mark sheet", "marksheet"],
      gu: ["રિપોર્ટ કાર્ડ", "પરિણામ પત્રક", "પ્રગતિ પત્રક", "પરિણામપત્રક"],
      hi: ["रिपोर्ट कार्ड", "प्रगति पत्र", "परिणाम पत्र", "अंकपत्र", "अंक पत्र"],
    },
  },
  {
    key: "AADHAAR",
    type: "document",
    label: "Aadhaar card",
    critical: true,
    phrases: { en: ["aadhaar", "aadhar"], gu: ["આધાર"], hi: ["आधार"] },
  },
  {
    key: "BIRTH_CERTIFICATE",
    type: "document",
    label: "Birth certificate",
    critical: true,
    phrases: {
      en: ["birth certificate"],
      gu: ["જન્મ પ્રમાણપત્ર", "જન્મનો દાખલો", "જન્મ દાખલો"],
      hi: ["जन्म प्रमाण पत्र", "जन्म प्रमाणपत्र"],
    },
  },
  {
    key: "BANK_PASSBOOK",
    type: "document",
    label: "Bank passbook",
    critical: true,
    phrases: {
      en: ["bank passbook", "passbook", "bank account details"],
      gu: ["બેંક પાસબુક", "પાસબુક", "બેન્ક પાસબુક"],
      hi: ["बैंक पासबुक", "पासबुक"],
    },
  },
  {
    key: "INCOME_CERTIFICATE",
    type: "document",
    label: "Income certificate",
    critical: true,
    phrases: {
      en: ["income certificate"],
      gu: ["આવકનો દાખલો", "આવક પ્રમાણપત્ર", "આવકનું પ્રમાણપત્ર"],
      hi: ["आय प्रमाण पत्र", "आय प्रमाणपत्र"],
    },
  },
  {
    key: "CASTE_CERTIFICATE",
    type: "document",
    label: "Caste certificate",
    critical: true,
    phrases: {
      en: ["caste certificate"],
      gu: ["જાતિ પ્રમાણપત્ર", "જાતિનો દાખલો", "જાતિનું પ્રમાણપત્ર"],
      hi: ["जाति प्रमाण पत्र", "जाति प्रमाणपत्र"],
    },
  },
  {
    key: "PHOTO",
    type: "document",
    label: "Photograph",
    critical: true,
    phrases: {
      en: ["passport size photo", "passport-size photo", "photograph", "photo"],
      gu: ["ફોટોગ્રાફ", "ફોટો"],
      hi: ["फ़ोटो", "फोटो", "फ़ोटोग्राफ़"],
    },
  },
  {
    key: "FEE_RECEIPT",
    type: "document",
    label: "Fee receipt",
    critical: true,
    phrases: {
      en: ["fee receipt", "fees receipt"],
      gu: ["ફી રસીદ", "ફીની રસીદ", "ફીની પહોંચ"],
      hi: ["शुल्क रसीद", "फीस रसीद", "फ़ीस रसीद"],
    },
  },
  {
    key: "HALL_TICKET",
    type: "document",
    label: "Hall ticket",
    critical: true,
    phrases: {
      en: ["hall ticket", "admit card"],
      gu: ["હોલ ટિકિટ", "પ્રવેશ પત્ર", "પ્રવેશપત્ર"],
      hi: ["प्रवेश पत्र", "एडमिट कार्ड", "हॉल टिकट"],
    },
  },
  {
    key: "ID_CARD",
    type: "document",
    label: "Identity card",
    critical: true,
    phrases: {
      en: ["identity card", "id card"],
      gu: ["ઓળખ કાર્ડ", "ઓળખપત્ર", "ઓળખ પત્ર"],
      hi: ["पहचान पत्र", "आईडी कार्ड"],
    },
  },
  // Required actions
  {
    key: "ATTEND",
    type: "action",
    label: "Attend / come",
    critical: true,
    phrases: {
      en: ["attend", "be present", "come", "arrive", "join"],
      gu: ["હાજર", "હાજરી", "આવવા", "આવો", "આવજો", "પધારવા", "પધારો"],
      hi: ["उपस्थित", "आएं", "आएँ", "आइए", "आने", "पधारें", "भाग लें"],
    },
  },
  {
    key: "BRING",
    type: "action",
    label: "Bring",
    critical: true,
    phrases: {
      en: ["bring", "carry"],
      gu: ["લાવ", "સાથે રાખ", "લઈને આવ"],
      hi: ["लाएं", "लाएँ", "लाना", "लाने", "लेकर आएं", "साथ लाएं", "लेकर आइए"],
    },
  },
  {
    key: "SUBMIT",
    type: "action",
    label: "Submit",
    critical: true,
    phrases: {
      en: ["submit", "hand over", "deposit", "give"],
      gu: ["જમા કરાવ", "જમા કરો", "રજૂ કર", "સુપરત", "આપવા", "આપો"],
      hi: ["जमा कर", "जमा करें", "प्रस्तुत कर", "सौंप", "दें", "दीजिए"],
    },
  },
  {
    key: "PAY",
    type: "action",
    label: "Pay",
    critical: true,
    phrases: {
      en: ["pay", "payment"],
      gu: ["ચૂકવ", "ભરવા", "ભરો", "ભરી દે"],
      hi: ["भुगतान", "भरें", "भरना", "चुकाएं"],
    },
  },
  {
    key: "CONTACT",
    type: "action",
    label: "Contact for help",
    critical: false,
    phrases: {
      en: ["contact", "call", "speak to", "talk to"],
      gu: ["સંપર્ક", "ફોન કરો", "વાત કરો"],
      hi: ["संपर्क", "फ़ोन करें", "फोन करें", "बात करें"],
    },
  },
  {
    key: "SIGN",
    type: "action",
    label: "Sign",
    critical: true,
    phrases: { en: ["sign", "signature"], gu: ["સહી"], hi: ["हस्ताक्षर"] },
  },
  // Locations
  {
    key: "SCHOOL_PREMISES",
    type: "location",
    label: "School premises",
    critical: false,
    phrases: {
      en: ["school premises", "school campus", "in the school", "at school", "to school", "school hall", "school ground"],
      gu: ["શાળા પરિસર", "શાળાના પરિસર", "શાળામાં", "શાળા ખાતે", "શાળાના મેદાન", "શાળાના હોલ"],
      hi: ["विद्यालय परिसर", "स्कूल परिसर", "विद्यालय में", "स्कूल में", "विद्यालय के मैदान", "विद्यालय के हॉल"],
    },
  },
  {
    key: "SCHOOL_OFFICE",
    type: "location",
    label: "School office",
    critical: false,
    phrases: {
      en: ["school office", "office"],
      gu: ["શાળા કાર્યાલય", "કાર્યાલય", "ઓફિસ", "ઑફિસ"],
      hi: ["विद्यालय कार्यालय", "कार्यालय", "ऑफिस"],
    },
  },
  // Events
  {
    key: "PTM",
    type: "event",
    label: "Parent-teacher meeting",
    critical: true,
    phrases: {
      en: ["parent-teacher meeting", "parent teacher meeting", "ptm", "parents meeting", "parents' meeting"],
      gu: ["વાલી-શિક્ષક બેઠક", "વાલી શિક્ષક બેઠક", "વાલી મીટિંગ", "વાલી સભા", "વાલી-શિક્ષક સભા"],
      hi: ["अभिभावक-शिक्षक बैठक", "अभिभावक शिक्षक बैठक", "अभिभावक बैठक", "पैरेंट-टीचर मीटिंग"],
    },
  },
  {
    key: "EXAM",
    type: "event",
    label: "Examination",
    critical: true,
    phrases: { en: ["examination", "exam", "test"], gu: ["પરીક્ષા"], hi: ["परीक्षा"] },
  },
  {
    key: "HOLIDAY",
    type: "event",
    label: "Holiday / school closed",
    critical: true,
    phrases: {
      en: ["holiday", "school will remain closed", "closed", "vacation"],
      gu: ["રજા", "બંધ રહેશે", "વેકેશન"],
      hi: ["छुट्टी", "अवकाश", "बंद रहेगा", "बंद रहेगी"],
    },
  },
  {
    key: "SCHOLARSHIP",
    type: "event",
    label: "Scholarship",
    critical: true,
    phrases: { en: ["scholarship"], gu: ["શિષ્યવૃત્તિ"], hi: ["छात्रवृत्ति"] },
  },
];

/** Words that turn a nearby date into a deadline. */
export const DEADLINE_CUES: Record<Language, string[]> = {
  en: ["last date", "deadline", "on or before", "before", "by", "no later than"],
  gu: ["છેલ્લી તારીખ", "સુધીમાં", "પહેલાં", "પહેલા", "અંતિમ તારીખ"],
  hi: ["अंतिम तिथि", "आख़िरी तारीख", "आखिरी तारीख", "तक", "से पहले"],
};
