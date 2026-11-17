import type { MobileLanguage } from "@gaavli/types";

// Plain-language terms and privacy notice shown inside the app. Have these
// reviewed before a public launch; update the date when they change.
export const LEGAL_UPDATED = "2026-11-01";
export type LegalKind = "terms" | "privacy";
type Section = { heading: string; body: string };
type Doc = { title: string; intro: string; sections: Section[] };

const terms: Record<MobileLanguage, Doc> = {
  en: {
    title: "Terms of Use",
    intro:
      "Gaavli connects people in and around a village: to buy and sell farm produce, find local services and vehicles, and reach their village coordinator. By using the app you agree to these terms.",
    sections: [
      {
        heading: "Your account",
        body: "You sign in with your mobile number and a one-time code. Keep your phone safe and give true details. One mobile number belongs to one account.",
      },
      {
        heading: "Listings, shops and services",
        body: "You are responsible for what you list or register: it must be true, lawful and yours to offer. Prices, quantities, timings and photos should be accurate and kept up to date. Gaavli does not check professional credentials and is not a party to any sale or service.",
      },
      {
        heading: "Dealing with others",
        body: "Gaavli only helps people find each other. Agree prices, delivery and payment directly, and take care when meeting people or paying in advance. Report anything wrong from the app or through your village coordinator.",
      },
      {
        heading: "What you must not do",
        body: "Do not post false, harmful or illegal listings, copy another person's shop, harass others, or misuse phone numbers you see in the app. We may hide listings or close accounts that break these rules.",
      },
      {
        heading: "Medical and emergency information",
        body: "Health and emergency entries are self-declared. In an emergency call the emergency services first. Gaavli is not a medical service.",
      },
      {
        heading: "Changes",
        body: "We may improve the app and update these terms. Continuing to use Gaavli after a change means you accept it. Write to us from Settings if you have questions.",
      },
    ],
  },
  mr: {
    title: "वापराच्या अटी",
    intro:
      "गावली गावातील आणि आसपासच्या लोकांना जोडते: शेतमाल खरेदी-विक्री, स्थानिक सेवा व वाहने शोधणे आणि गाव समन्वयकाशी संपर्क. अॅप वापरून तुम्ही या अटी मान्य करता.",
    sections: [
      {
        heading: "तुमचे खाते",
        body: "तुम्ही मोबाईल क्रमांक आणि एकदाच वापरायच्या कोडने साइन इन करता. फोन सुरक्षित ठेवा आणि खरी माहिती द्या. एक मोबाईल क्रमांक म्हणजे एक खाते.",
      },
      {
        heading: "उत्पादने, दुकाने आणि सेवा",
        body: "तुम्ही जे नोंदवता त्याची जबाबदारी तुमची: ते खरे, कायदेशीर आणि तुमच्या मालकीचे असावे. दर, प्रमाण, वेळा आणि फोटो अचूक व अद्ययावत ठेवा. गावली व्यावसायिक पात्रता तपासत नाही आणि कोणत्याही व्यवहारात पक्ष नाही.",
      },
      {
        heading: "इतरांशी व्यवहार",
        body: "गावली फक्त लोकांना एकमेकांपर्यंत पोहोचवते. दर, वितरण आणि पैसे थेट ठरवा; भेटताना किंवा आगाऊ पैसे देताना काळजी घ्या. काही चुकीचे आढळल्यास अॅपमधून किंवा गाव समन्वयकामार्फत कळवा.",
      },
      {
        heading: "हे करू नका",
        body: "खोटी, हानिकारक किंवा बेकायदेशीर नोंद करू नका, दुसऱ्याचे दुकान नक्कल करू नका, इतरांना त्रास देऊ नका किंवा अॅपमधील फोन नंबर गैरवापरू नका. नियम मोडल्यास नोंदी लपवल्या जाऊ शकतात किंवा खाते बंद होऊ शकते.",
      },
      {
        heading: "वैद्यकीय व आपत्कालीन माहिती",
        body: "आरोग्य व आपत्कालीन नोंदी स्वतः दिलेल्या असतात. आपत्कालात आधी आपत्कालीन सेवांना फोन करा. गावली ही वैद्यकीय सेवा नाही.",
      },
      {
        heading: "बदल",
        body: "आम्ही अॅप सुधारू आणि या अटी बदलू शकतो. बदलानंतर वापर चालू ठेवणे म्हणजे तो मान्य करणे. प्रश्न असल्यास सेटिंग्जमधून आम्हाला लिहा.",
      },
    ],
  },
  hi: {
    title: "उपयोग की शर्तें",
    intro:
      "गावली गाँव और आसपास के लोगों को जोड़ता है: कृषि उपज खरीदना-बेचना, स्थानीय सेवाएँ और वाहन खोजना, और गाँव समन्वयक से संपर्क करना। ऐप का उपयोग करके आप इन शर्तों से सहमत होते हैं।",
    sections: [
      {
        heading: "आपका खाता",
        body: "आप मोबाइल नंबर और एक बार के कोड से साइन इन करते हैं। अपना फ़ोन सुरक्षित रखें और सही जानकारी दें। एक मोबाइल नंबर का एक ही खाता होता है।",
      },
      {
        heading: "उत्पाद, दुकानें और सेवाएँ",
        body: "आप जो दर्ज करते हैं उसकी ज़िम्मेदारी आपकी है: वह सच्चा, वैध और आपका होना चाहिए। दाम, मात्रा, समय और फ़ोटो सही और नए रखें। गावली पेशेवर योग्यता की जाँच नहीं करता और किसी लेन-देन में पक्ष नहीं है।",
      },
      {
        heading: "दूसरों के साथ लेन-देन",
        body: "गावली केवल लोगों को एक-दूसरे तक पहुँचाता है। दाम, डिलीवरी और भुगतान सीधे तय करें; मिलते समय या अग्रिम भुगतान करते समय सावधान रहें। कुछ गलत लगे तो ऐप से या गाँव समन्वयक के ज़रिए बताएँ।",
      },
      {
        heading: "क्या न करें",
        body: "झूठी, हानिकारक या अवैध प्रविष्टि न डालें, किसी और की दुकान की नकल न करें, दूसरों को परेशान न करें, और ऐप में दिखे फ़ोन नंबरों का दुरुपयोग न करें। नियम तोड़ने पर प्रविष्टियाँ छिपाई या खाते बंद किए जा सकते हैं।",
      },
      {
        heading: "चिकित्सा और आपातकालीन जानकारी",
        body: "स्वास्थ्य और आपातकालीन प्रविष्टियाँ स्वयं घोषित होती हैं। आपात स्थिति में पहले आपातकालीन सेवाओं को फ़ोन करें। गावली कोई चिकित्सा सेवा नहीं है।",
      },
      {
        heading: "बदलाव",
        body: "हम ऐप सुधार सकते हैं और ये शर्तें बदल सकते हैं। बदलाव के बाद उपयोग जारी रखने का अर्थ है उसे स्वीकार करना। प्रश्न हों तो सेटिंग्स से हमें लिखें।",
      },
    ],
  },
};

const privacy: Record<MobileLanguage, Doc> = {
  en: {
    title: "Privacy Policy",
    intro:
      "This explains what Gaavli collects, why, and the choices you have. We collect only what the app needs to work.",
    sections: [
      {
        heading: "What we collect",
        body: "Your name, mobile number, village and language; any alternate numbers, email, address or occupation you add; the products, shops, services and photos you list; and your requests and notifications. If you allow it, your location is used once to suggest nearby villages.",
      },
      {
        heading: "How we use it",
        body: "To sign you in with a one-time code, show listings in your village, let buyers and villagers reach you, send notifications, keep the app safe, and fix problems.",
      },
      {
        heading: "What other people can see",
        body: "A product, shop or service you list is shown with your name and the contact numbers you chose to make public. Your primary number is shared with a buyer only through the contact flow. Numbers you mark private are never shown.",
      },
      {
        heading: "Village coordinators",
        body: "A coordinator for your village can see basic account details and help you register or fix an entry. They cannot see your one-time codes.",
      },
      {
        heading: "Storage and security",
        body: "Data is stored on secured servers and sent over encrypted connections. Photos are resized and stored for as long as they are in use. We do not sell your personal information.",
      },
      {
        heading: "Your choices",
        body: "You can update your details and listings in the app, hide or remove a listing, and ask us to delete your account and data by writing to us from Settings.",
      },
    ],
  },
  mr: {
    title: "गोपनीयता धोरण",
    intro:
      "गावली काय माहिती गोळा करते, का, आणि तुमच्याकडे कोणते पर्याय आहेत ते येथे आहे. अॅप चालण्यासाठी जेवढे हवे तेवढेच आम्ही गोळा करतो.",
    sections: [
      {
        heading: "आम्ही काय गोळा करतो",
        body: "तुमचे नाव, मोबाईल क्रमांक, गाव आणि भाषा; तुम्ही जोडलेले पर्यायी क्रमांक, ईमेल, पत्ता किंवा व्यवसाय; तुम्ही नोंदवलेली उत्पादने, दुकाने, सेवा आणि फोटो; तसेच तुमच्या चौकशी आणि सूचना. तुम्ही परवानगी दिल्यास जवळची गावे सुचवण्यासाठी एकदा तुमचे स्थान वापरले जाते.",
      },
      {
        heading: "आम्ही ते कसे वापरतो",
        body: "एकदाच वापरायच्या कोडने साइन इन करण्यासाठी, तुमच्या गावातील नोंदी दाखवण्यासाठी, खरेदीदारांना व गावकऱ्यांना तुमच्यापर्यंत पोहोचवण्यासाठी, सूचना पाठवण्यासाठी, अॅप सुरक्षित ठेवण्यासाठी आणि समस्या सोडवण्यासाठी.",
      },
      {
        heading: "इतर लोकांना काय दिसते",
        body: "तुम्ही नोंदवलेले उत्पादन, दुकान किंवा सेवा तुमचे नाव आणि तुम्ही सार्वजनिक केलेल्या संपर्क क्रमांकांसह दिसते. तुमचा मुख्य क्रमांक फक्त संपर्क प्रक्रियेतून खरेदीदाराला दिला जातो. खाजगी ठेवलेले क्रमांक कधीही दिसत नाहीत.",
      },
      {
        heading: "गाव समन्वयक",
        body: "तुमच्या गावाचा समन्वयक मूलभूत खाते माहिती पाहू शकतो आणि नोंदणी किंवा दुरुस्तीत मदत करू शकतो. त्यांना तुमचे एकदाचे कोड दिसत नाहीत.",
      },
      {
        heading: "साठवण आणि सुरक्षा",
        body: "माहिती सुरक्षित सर्व्हरवर साठवली जाते आणि एन्क्रिप्टेड कनेक्शनवरून पाठवली जाते. फोटो वापरात असेपर्यंत आकार बदलून साठवले जातात. आम्ही तुमची वैयक्तिक माहिती विकत नाही.",
      },
      {
        heading: "तुमचे पर्याय",
        body: "तुम्ही अॅपमध्ये तुमची माहिती आणि नोंदी बदलू शकता, नोंद लपवू किंवा काढू शकता, आणि सेटिंग्जमधून आम्हाला लिहून खाते व माहिती हटवण्यास सांगू शकता.",
      },
    ],
  },
  hi: {
    title: "गोपनीयता नीति",
    intro:
      "यहाँ बताया गया है कि गावली क्या जानकारी लेता है, क्यों, और आपके पास क्या विकल्प हैं। ऐप चलाने के लिए जितना ज़रूरी है उतना ही हम लेते हैं।",
    sections: [
      {
        heading: "हम क्या जानकारी लेते हैं",
        body: "आपका नाम, मोबाइल नंबर, गाँव और भाषा; आपके जोड़े हुए वैकल्पिक नंबर, ईमेल, पता या व्यवसाय; आपके दर्ज किए उत्पाद, दुकानें, सेवाएँ और फ़ोटो; और आपके अनुरोध व सूचनाएँ। अनुमति देने पर आस-पास के गाँव सुझाने के लिए एक बार आपका स्थान उपयोग होता है।",
      },
      {
        heading: "हम इसका उपयोग कैसे करते हैं",
        body: "एक बार के कोड से साइन इन कराने, आपके गाँव की प्रविष्टियाँ दिखाने, खरीदारों और गाँव वालों को आप तक पहुँचाने, सूचनाएँ भेजने, ऐप सुरक्षित रखने और समस्याएँ ठीक करने के लिए।",
      },
      {
        heading: "दूसरे लोग क्या देख सकते हैं",
        body: "आपका दर्ज किया उत्पाद, दुकान या सेवा आपके नाम और आपके सार्वजनिक किए संपर्क नंबरों के साथ दिखती है। आपका मुख्य नंबर केवल संपर्क प्रक्रिया से खरीदार को मिलता है। निजी रखे नंबर कभी नहीं दिखते।",
      },
      {
        heading: "गाँव समन्वयक",
        body: "आपके गाँव का समन्वयक बुनियादी खाता जानकारी देख सकता है और पंजीकरण या सुधार में मदद कर सकता है। उसे आपके एक बार के कोड नहीं दिखते।",
      },
      {
        heading: "भंडारण और सुरक्षा",
        body: "जानकारी सुरक्षित सर्वरों पर रखी जाती है और एन्क्रिप्टेड कनेक्शन से भेजी जाती है। फ़ोटो जब तक उपयोग में हैं, आकार बदलकर रखी जाती हैं। हम आपकी निजी जानकारी बेचते नहीं हैं।",
      },
      {
        heading: "आपके विकल्प",
        body: "आप ऐप में अपनी जानकारी और प्रविष्टियाँ बदल सकते हैं, प्रविष्टि छिपा या हटा सकते हैं, और सेटिंग्स से हमें लिखकर खाता व डेटा हटाने को कह सकते हैं।",
      },
    ],
  },
};

export const legalDoc = (kind: LegalKind, language: MobileLanguage): Doc =>
  (kind === "terms" ? terms : privacy)[language];
