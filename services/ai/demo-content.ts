import type { Language, NoticeCategory } from "@/lib/domain/constants";

/**
 * Hand-written demo content. In demo mode the simplifier and translator return
 * these texts for the matching sample notices, labelled as simulated. They were
 * written for the prototype and must still be reviewed by a fluent speaker
 * before any real use.
 */
export interface DemoSample {
  key: string;
  title: string;
  category: NoticeCategory;
  source: string;
  simplified: string;
  translations: Record<Language, string>;
}

export const PTM_SOURCE =
  "Parent-Teacher Meeting will be held on 25 October 2026 at 11:00 AM in the school premises. All parents are requested to attend the meeting and bring the student's report card. For any queries, please contact the class teacher.";

export const DEMO_SAMPLES: DemoSample[] = [
  {
    key: "ptm",
    title: "Parent-Teacher Meeting on 25 October",
    category: "PTM",
    source: PTM_SOURCE,
    simplified:
      "There is a Parent-Teacher Meeting on 25 October 2026 at 11:00 AM. It will be in the school premises. Please come to the meeting. Please bring your child's report card. If you have a question, please contact the class teacher.",
    translations: {
      en: "There is a Parent-Teacher Meeting on 25 October 2026 at 11:00 AM. It will be in the school premises. Please come to the meeting. Please bring your child's report card. If you have a question, please contact the class teacher.",
      gu: "વાલી-શિક્ષક બેઠક ૨૫ ઓક્ટોબર ૨૦૨૬ ના રોજ સવારે ૧૧:૦૦ વાગ્યે યોજાશે. બેઠક શાળાના પરિસરમાં થશે. કૃપા કરીને બેઠકમાં હાજર રહો. તમારા બાળકનું રિપોર્ટ કાર્ડ સાથે લાવવું. કોઈ પ્રશ્ન હોય તો વર્ગ શિક્ષકનો સંપર્ક કરો.",
      hi: "अभिभावक-शिक्षक बैठक 25 अक्टूबर 2026 को सुबह 11:00 बजे होगी। बैठक विद्यालय परिसर में होगी। कृपया बैठक में आएं। अपने बच्चे का रिपोर्ट कार्ड साथ लाएं। कोई सवाल हो तो कक्षा शिक्षक से संपर्क करें।",
    },
  },
  {
    key: "scholarship",
    title: "Scholarship forms due 31 October",
    category: "SCHOLARSHIP",
    source:
      "Scholarship forms for eligible students of Class 9 must be submitted at the school office on or before 31 October 2026. Please bring the student's Aadhaar card, bank passbook and income certificate. The scholarship amount is ₹5,000 per year. For help, call the school office at 90000 00001.",
    simplified:
      "Eligible Class 9 students can apply for a scholarship. Submit the form at the school office by 31 October 2026. Bring the student's Aadhaar card, bank passbook and income certificate. The scholarship is ₹5,000 per year. For help, call the school office at 90000 00001.",
    translations: {
      en: "Eligible Class 9 students can apply for a scholarship. Submit the form at the school office by 31 October 2026. Bring the student's Aadhaar card, bank passbook and income certificate. The scholarship is ₹5,000 per year. For help, call the school office at 90000 00001.",
      gu: "ધોરણ ૯ ના પાત્ર વિદ્યાર્થીઓ શિષ્યવૃત્તિ માટે અરજી કરી શકે છે. ફોર્મ ૩૧ ઓક્ટોબર ૨૦૨૬ સુધીમાં શાળા કાર્યાલયમાં જમા કરાવો. વિદ્યાર્થીનું આધાર કાર્ડ, બેંક પાસબુક અને આવકનો દાખલો સાથે લાવો. શિષ્યવૃત્તિ દર વર્ષે ₹૫,૦૦૦ છે. મદદ માટે શાળા કાર્યાલયને ૯૦૦૦૦ ૦૦૦૦૧ પર ફોન કરો.",
      hi: "कक्षा 9 के पात्र विद्यार्थी छात्रवृत्ति के लिए आवेदन कर सकते हैं। फॉर्म 31 अक्टूबर 2026 तक विद्यालय कार्यालय में जमा करें। विद्यार्थी का आधार कार्ड, बैंक पासबुक और आय प्रमाण पत्र साथ लाएं। छात्रवृत्ति ₹5,000 प्रति वर्ष है। मदद के लिए विद्यालय कार्यालय को 90000 00001 पर फ़ोन करें।",
    },
  },
  {
    key: "exam",
    title: "Half-yearly examination timetable",
    category: "EXAMINATION",
    source:
      "The half-yearly examination for Classes 6 to 8 will begin on 3 November 2026. Examinations will start at 10:30 AM every day. Students must carry their hall ticket and arrive at school 15 minutes before the examination.",
    simplified:
      "The half-yearly exam for Classes 6 to 8 starts on 3 November 2026. Each exam starts at 10:30 AM. Students must bring their hall ticket. Students should come to school 15 minutes early.",
    translations: {
      en: "The half-yearly exam for Classes 6 to 8 starts on 3 November 2026. Each exam starts at 10:30 AM. Students must bring their hall ticket. Students should come to school 15 minutes early.",
      gu: "ધોરણ ૬ થી ૮ ની છમાસિક પરીક્ષા ૩ નવેમ્બર ૨૦૨૬ થી શરૂ થશે. દરરોજ પરીક્ષા સવારે ૧૦:૩૦ વાગ્યે શરૂ થશે. વિદ્યાર્થીઓએ હોલ ટિકિટ સાથે લાવવી. વિદ્યાર્થીઓ પરીક્ષાના ૧૫ મિનિટ પહેલાં શાળામાં આવો.",
      hi: "कक्षा 6 से 8 की अर्धवार्षिक परीक्षा 3 नवंबर 2026 से शुरू होगी। हर दिन परीक्षा सुबह 10:30 बजे शुरू होगी। विद्यार्थी अपना प्रवेश पत्र साथ लाएं। विद्यार्थी परीक्षा से 15 मिनट पहले विद्यालय में आएं।",
    },
  },
  {
    key: "holiday",
    title: "Diwali vacation dates",
    category: "HOLIDAY",
    source:
      "The school will remain closed from 9 November 2026 to 22 November 2026 for the Diwali vacation. Classes will resume on 23 November 2026.",
    simplified:
      "School is closed for the Diwali vacation from 9 November 2026 to 22 November 2026. School opens again on 23 November 2026.",
    translations: {
      en: "School is closed for the Diwali vacation from 9 November 2026 to 22 November 2026. School opens again on 23 November 2026.",
      gu: "દિવાળી વેકેશન માટે શાળા ૯ નવેમ્બર ૨૦૨૬ થી ૨૨ નવેમ્બર ૨૦૨૬ સુધી બંધ રહેશે. શાળા ૨૩ નવેમ્બર ૨૦૨૬ ના રોજ ફરી શરૂ થશે.",
      hi: "दीवाली अवकाश के लिए विद्यालय 9 नवंबर 2026 से 22 नवंबर 2026 तक बंद रहेगा। विद्यालय 23 नवंबर 2026 को फिर से खुलेगा।",
    },
  },
];

/** Scenario B: same notice with the wrong date in Gujarati. */
export const PTM_GU_WRONG_DATE = DEMO_SAMPLES[0]!.translations.gu.replace("૨૫ ઓક્ટોબર", "૨૬ ઓક્ટોબર");

/** Scenario C: Hindi version that drops the report-card instruction. */
export const PTM_HI_MISSING_ITEM = "अभिभावक-शिक्षक बैठक 25 अक्टूबर 2026 को सुबह 11:00 बजे होगी। बैठक विद्यालय परिसर में होगी। कृपया बैठक में आएं। कोई सवाल हो तो कक्षा शिक्षक से संपर्क करें।";

/** Short SMS forms for basic phones (Scenario D). */
export const PTM_SMS: Record<Language, string> = {
  en: "PTM: 25 Oct 2026, 11 AM. Please bring the student report card. Contact your school for help.",
  gu: "વાલી મીટિંગ: ૨૫ ઓક્ટો ૨૦૨૬, સવારે ૧૧ વાગ્યે. વિદ્યાર્થીનું રિપોર્ટ કાર્ડ સાથે લાવો. મદદ માટે શાળાનો સંપર્ક કરો.",
  hi: "अभिभावक बैठक: 25 अक्टूबर 2026, सुबह 11 बजे। विद्यार्थी का रिपोर्ट कार्ड साथ लाएं। मदद के लिए स्कूल से संपर्क करें।",
};

function normalizeForLookup(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function findDemoSampleBySource(source: string): DemoSample | undefined {
  const needle = normalizeForLookup(source);
  return DEMO_SAMPLES.find((s) => normalizeForLookup(s.source) === needle);
}

export function findDemoSampleByText(text: string): DemoSample | undefined {
  const needle = normalizeForLookup(text);
  return DEMO_SAMPLES.find(
    (s) => normalizeForLookup(s.simplified) === needle || normalizeForLookup(s.source) === needle,
  );
}
