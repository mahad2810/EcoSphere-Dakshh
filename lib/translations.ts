// Multilanguage translations for the application

export type Language = 'en' | 'hi' | 'bn' | 'ta' | 'te' | 'mr'

export interface TranslationKeys {
  welcome: string
  progress: string
  level: string
  impactPoints: string
  myImpact: string
  xpPoints: string
  treesPlanted: string
  co2Offset: string
  waterSaved: string
  progressToNext: string
  xpNeeded: string
  activeProjects: string
  joinMore: string
  participants: string
  timeLeft: string
  reportIssue: string
  spottedIssue: string
  reportDescription: string
  reportButton: string
  photoEvidence: string
  gpsLocation: string
  leaderboard: string
  viewFullLeaderboard: string
  educationHub: string
  environmentalJourney: string
  today: string
  daysAgo: string
  weekAgo: string
  weeksAgo: string
  monthAgo: string
  dashboard: string
  myActiveProjects: string
  communityLeaderboard: string
  environmentEducationHub: string
  myEnvironmentalJourney: string
  educationalVideos: string
  environmentalQuiz: string
  welcomeBack: string
  loadingDashboard: string
  dontForgetCheckout: string
  activeProjectsCheckedIn: string
  rememberCheckout: string
  checkOut: string
  ecoWarrior: string
  progressToLevel: string
  noIssuesReported: string
  useButtonToReport: string
  loading: string
  notifications: string
  profile: string
  settings: string
  logout: string
  and: string
  viewAll: string
  xpEarned: string
  progressLabel: string
}

export const translations: Record<Language, TranslationKeys> = {
  en: {
    welcome: "Welcome back, {name}!",
    progress: "You've made amazing progress this month. Keep up the great work for our planet!",
    level: "Level 7 Eco-Warrior",
    impactPoints: "Impact Points",
    myImpact: "My Environmental Impact",
    xpPoints: "XP Points",
    treesPlanted: "Trees Planted",
    co2Offset: "CO₂ Offset",
    waterSaved: "Water Saved",
    progressToNext: "Progress to Level 8",
    xpNeeded: "XP needed for next level",
    activeProjects: "My Active Projects",
    joinMore: "Join More",
    participants: "joined",
    timeLeft: "left",
    reportIssue: "Report Environmental Issue",
    spottedIssue: "Spotted an Environmental Issue?",
    reportDescription: "Help protect our environment by reporting pollution, illegal dumping, deforestation, or other environmental concerns in your area.",
    reportButton: "Report Issue (+10 XP)",
    photoEvidence: "Photo Evidence",
    gpsLocation: "GPS Location",
    leaderboard: "Community Leaderboard",
    viewFullLeaderboard: "View Full Leaderboard",
    educationHub: "Environmental Education Hub",
    environmentalJourney: "My Environmental Journey",
    today: "Today",
    daysAgo: "days ago",
    weekAgo: "week ago",
    weeksAgo: "weeks ago",
    monthAgo: "month ago",
    dashboard: "Dashboard",
    myActiveProjects: "My Active Projects",
    communityLeaderboard: "Community Leaderboard",
    environmentEducationHub: "Environment Education Hub",
    myEnvironmentalJourney: "My Environmental Journey",
    educationalVideos: "Educational Videos",
    environmentalQuiz: "Environmental Quiz",
    welcomeBack: "Welcome back",
    loadingDashboard: "Loading dashboard...",
    dontForgetCheckout: "Don't forget to check out!",
    activeProjectsCheckedIn: "You have {count} active project{plural} checked in.",
    rememberCheckout: "Remember to check out when you're done to track your contribution hours.",
    checkOut: "Check Out",
    ecoWarrior: "Eco-Warrior",
    progressToLevel: "Progress to Level {level}",
    noIssuesReported: "You haven't reported any environmental issues yet.",
    useButtonToReport: "Use the button above to report your first issue!",
    loading: "Loading",
    notifications: "Notifications",
    profile: "Profile",
    settings: "Settings",
    logout: "Logout",
    and: "and",
    viewAll: "View All",
    xpEarned: "XP Earned",
    progressLabel: "Progress"
  },

  hi: {
    welcome: "वापसी पर स्वागत है, {name}!",
    progress: "इस महीने आपने अद्भुत प्रगति की है। हमारे ग्रह के लिए महान कार्य जारी रखें!",
    level: "स्तर 7 पर्यावरण योद्धा",
    impactPoints: "प्रभाव अंक",
    myImpact: "मेरा पर्यावरणीय प्रभाव",
    xpPoints: "XP अंक",
    treesPlanted: "पेड़ लगाए",
    co2Offset: "CO₂ कमी",
    waterSaved: "पानी बचाया",
    progressToNext: "स्तर 8 की प्रगति",
    xpNeeded: "अगले स्तर के लिए XP चाहिए",
    activeProjects: "मेरी सक्रिय परियोजनाएं",
    joinMore: "और जुड़ें",
    participants: "शामिल हुए",
    timeLeft: "बचा है",
    reportIssue: "पर्यावरणीय समस्या की रिपोर्ट करें",
    spottedIssue: "कोई पर्यावरणीय समस्या देखी?",
    reportDescription: "प्रदूषण, अवैध डंपिंग, वनों की कटाई, या अपने क्षेत्र में अन्य पर्यावरणीय चिंताओं की रिपोर्ट करके हमारे पर्यावरण की रक्षा में मदद करें।",
    reportButton: "समस्या रिपोर्ट करें (+10 XP)",
    photoEvidence: "फोटो प्रमाण",
    gpsLocation: "GPS स्थान",
    leaderboard: "समुदायिक लीडरबोर्ड",
    viewFullLeaderboard: "पूरा लीडरबोर्ड देखें",
    educationHub: "पर्यावरणीय शिक्षा केंद्र",
    environmentalJourney: "मेरी पर्यावरणीय यात्रा",
    today: "आज",
    daysAgo: "दिन पहले",
    weekAgo: "सप्ताह पहले",
    weeksAgo: "सप्ताह पहले",
    monthAgo: "महीना पहले",
    dashboard: "डैशबोर्ड",
    myActiveProjects: "मेरी सक्रिय परियोजनाएं",
    communityLeaderboard: "समुदायिक लीडरबोर्ड",
    environmentEducationHub: "पर्यावरण शिक्षा केंद्र",
    myEnvironmentalJourney: "मेरी पर्यावरणीय यात्रा",
    educationalVideos: "शैक्षिक वीडियो",
    environmentalQuiz: "पर्यावरणीय प्रश्नोत्तरी",
    welcomeBack: "वापसी पर स्वागत है",
    loadingDashboard: "डैशबोर्ड लोड हो रहा है...",
    dontForgetCheckout: "चेकआउट करना न भूलें!",
    activeProjectsCheckedIn: "आपके पास {count} सक्रिय परियोजना{plural} चेक इन हैं।",
    rememberCheckout: "अपने योगदान घंटों को ट्रैक करने के लिए समाप्त होने पर चेकआउट करना याद रखें।",
    checkOut: "चेकआउट",
    ecoWarrior: "पर्यावरण योद्धा",
    progressToLevel: "स्तर {level} की प्रगति",
    noIssuesReported: "आपने अभी तक कोई पर्यावरणीय समस्या की रिपोर्ट नहीं की है।",
    useButtonToReport: "अपनी पहली समस्या की रिपोर्ट करने के लिए ऊपर के बटन का उपयोग करें!",
    loading: "लोड हो रहा है",
    notifications: "सूचनाएं",
    profile: "प्रोफ़ाइल",
    settings: "सेटिंग्स",
    logout: "लॉगआउट",
    and: "और",
    viewAll: "सभी देखें",
    xpEarned: "XP अर्जित",
    progressLabel: "प्रगति"
  },

  bn: {
    welcome: "ফিরে আসার জন্য স্বাগতম, {name}!",
    progress: "এই মাসে আপনি অসাধারণ অগ্রগতি করেছেন। আমাদের গ্রহের জন্য দুর্দান্ত কাজ চালিয়ে যান!",
    level: "স্তর ৭ পরিবেশ যোদ্ধা",
    impactPoints: "প্রভাব পয়েন্ট",
    myImpact: "আমার পরিবেশগত প্রভাব",
    xpPoints: "XP পয়েন্ট",
    treesPlanted: "গাছ লাগানো",
    co2Offset: "CO₂ হ্রাস",
    waterSaved: "পানি সাশ্রয়",
    progressToNext: "স্তর ৮ এর অগ্রগতি",
    xpNeeded: "পরবর্তী স্তরের জন্য XP প্রয়োজন",
    activeProjects: "আমার সক্রিয় প্রকল্প",
    joinMore: "আরো যোগ দিন",
    participants: "যোগ দিয়েছে",
    timeLeft: "বাকি",
    reportIssue: "পরিবেশগত সমস্যা রিপোর্ট করুন",
    spottedIssue: "কোনো পরিবেশগত সমস্যা দেখেছেন?",
    reportDescription: "দূষণ, অবৈধ ডাম্পিং, বন উজাড়, বা আপনার এলাকার অন্যান্য পরিবেশগত উদ্বেগ রিপোর্ট করে আমাদের পরিবেশ রক্ষায় সহায়তা করুন।",
    reportButton: "সমস্যা রিপোর্ট করুন (+১০ XP)",
    photoEvidence: "ছবির প্রমাণ",
    gpsLocation: "GPS অবস্থান",
    leaderboard: "কমিউনিটি লিডারবোর্ড",
    viewFullLeaderboard: "সম্পূর্ণ লিডারবোর্ড দেখুন",
    educationHub: "পরিবেশগত শিক্ষা কেন্দ্র",
    environmentalJourney: "আমার পরিবেশগত যাত্রা",
    today: "আজ",
    daysAgo: "দিন আগে",
    weekAgo: "সপ্তাহ আগে",
    weeksAgo: "সপ্তাহ আগে",
    monthAgo: "মাস আগে",
    dashboard: "ড্যাশবোর্ড",
    myActiveProjects: "আমার সক্রিয় প্রকল্প",
    communityLeaderboard: "কমিউনিটি লিডারবোর্ড",
    environmentEducationHub: "পরিবেশ শিক্ষা কেন্দ্র",
    myEnvironmentalJourney: "আমার পরিবেশগত যাত্রা",
    educationalVideos: "শিক্ষামূলক ভিডিও",
    environmentalQuiz: "পরিবেশগত কুইজ",
    welcomeBack: "ফিরে আসার জন্য স্বাগতম",
    loadingDashboard: "ড্যাশবোর্ড লোড হচ্ছে...",
    dontForgetCheckout: "চেকআউট করতে ভুলবেন না!",
    activeProjectsCheckedIn: "আপনার {count}টি সক্রিয় প্রকল্প{plural} চেক ইন করা আছে।",
    rememberCheckout: "আপনার অবদানের ঘন্টা ট্র্যাক করতে শেষ হলে চেকআউট করতে মনে রাখবেন।",
    checkOut: "চেকআউট",
    ecoWarrior: "পরিবেশ যোদ্ধা",
    progressToLevel: "স্তর {level} এর অগ্রগতি",
    noIssuesReported: "আপনি এখনও কোনো পরিবেশগত সমস্যা রিপোর্ট করেননি।",
    useButtonToReport: "আপনার প্রথম সমস্যা রিপোর্ট করতে উপরের বোতাম ব্যবহার করুন!",
    loading: "লোড হচ্ছে",
    notifications: "বিজ্ঞপ্তি",
    profile: "প্রোফাইল",
    settings: "সেটিংস",
    logout: "লগআউট",
    and: "এবং",
    viewAll: "সব দেখুন",
    xpEarned: "XP অর্জিত",
    progressLabel: "অগ্রগতি"
  },

  ta: {
    welcome: "மீண்டும் வரவேற்கிறோம், {name}!",
    progress: "இந்த மாதம் நீங்கள் அற்புதமான முன்னேற்றம் அடைந்துள்ளீர்கள். நமது கிரகத்திற்கான சிறந்த பணியைத் தொடருங்கள்!",
    level: "நிலை 7 சுற்றுச்சூழல் வீரர்",
    impactPoints: "தாக்க புள்ளிகள்",
    myImpact: "எனது சுற்றுச்சூழல் தாக்கம்",
    xpPoints: "XP புள்ளிகள்",
    treesPlanted: "மரங்கள் நடப்பட்டன",
    co2Offset: "CO₂ குறைப்பு",
    waterSaved: "நீர் சேமிப்பு",
    progressToNext: "நிலை 8 க்கான முன்னேற்றம்",
    xpNeeded: "அடுத்த நிலைக்கு XP தேவை",
    activeProjects: "எனது செயலில் உள்ள திட்டங்கள்",
    joinMore: "மேலும் சேரவும்",
    participants: "சேர்ந்தனர்",
    timeLeft: "மீதம்",
    reportIssue: "சுற்றுச்சூழல் பிரச்சினையை புகாரளிக்கவும்",
    spottedIssue: "ஏதேனும் சுற்றுச்சூழல் பிரச்சினையைக் கண்டீர்களா?",
    reportDescription: "மாசுபாடு, சட்டவிரோத குப்பை கொட்டுதல், காடழிப்பு, அல்லது உங்கள் பகுதியில் உள்ள பிற சுற்றுச்சூழல் கவலைகளை புகாரளிப்பதன் மூலம் நமது சுற்றுச்சூழலைப் பாதுகாக்க உதவுங்கள்।",
    reportButton: "பிரச்சினையை புகாரளிக்கவும் (+10 XP)",
    photoEvidence: "புகைப்பட ஆதாரம்",
    gpsLocation: "GPS இடம்",
    leaderboard: "சமூக லீடர்போர்டு",
    viewFullLeaderboard: "முழு லீடர்போர்டைப் பார்க்கவும்",
    educationHub: "சுற்றுச்சூழல் கல்வி மையம்",
    environmentalJourney: "எனது சுற்றுச்சூழல் பயணம்",
    today: "இன்று",
    daysAgo: "நாட்களுக்கு முன்பு",
    weekAgo: "வாரத்திற்கு முன்பு",
    weeksAgo: "வாரங்களுக்கு முன்பு",
    monthAgo: "மாதத்திற்கு முன்பு",
    dashboard: "டாஷ்போர்டு",
    myActiveProjects: "எனது செயலில் உள்ள திட்டங்கள்",
    communityLeaderboard: "சமூக லீடர்போர்டு",
    environmentEducationHub: "சுற்றுச்சூழல் கல்வி மையம்",
    myEnvironmentalJourney: "எனது சுற்றுச்சூழல் பயணம்",
    educationalVideos: "கல்வி வீடியோக்கள்",
    environmentalQuiz: "சுற்றுச்சூழல் வினாடி வினா",
    welcomeBack: "மீண்டும் வரவேற்கிறோம்",
    loadingDashboard: "டாஷ்போர்டு லோட் ஆகிறது...",
    dontForgetCheckout: "செக் அவுட் செய்ய மறவாதீர்கள்!",
    activeProjectsCheckedIn: "உங்களுக்கு {count} செயல்பாட்டு திட்டங்கள்{plural} செக் இன் செய்யப்பட்டுள்ளன।",
    rememberCheckout: "உங்கள் பங்களிப்பு மணிநேரங்களைக் கண்காணிக்க முடிந்ததும் செக் அவுட் செய்ய நினைவில் கொள்ளுங்கள்।",
    checkOut: "செக் அவுட்",
    ecoWarrior: "சுற்றுச்சூழல் வீரர்",
    progressToLevel: "நிலை {level} க்கான முன்னேற்றம்",
    noIssuesReported: "நீங்கள் இன்னும் எந்த சுற்றுச்சூழல் பிரச்சினையையும் புகாரளிக்கவில்லை।",
    useButtonToReport: "உங்கள் முதல் பிரச்சினையை புகாரளிக்க மேலே உள்ள பட்டனைப் பயன்படுத்துங்கள்!",
    loading: "ஏற்றுகிறது",
    notifications: "அறிவிப்புகள்",
    profile: "சுயவிவரம்",
    settings: "அமைப்புகள்",
    logout: "வெளியேறு",
    and: "மற்றும்",
    viewAll: "அனைத்தையும் பார்க்க",
    xpEarned: "XP பெறப்பட்டது",
    progressLabel: "முன்னேற்றம்"
  },

  te: {
    welcome: "తిరిగి స్వాగతం, {name}!",
    progress: "ఈ నెలలో మీరు అద్భుతమైన పురోగతి సాధించారు. మన గ్రహం కోసం గొప్ప పనిని కొనసాగించండి!",
    level: "స్థాయి 7 పర్యావరణ యోధుడు",
    impactPoints: "ప్రభావ పాయింట్లు",
    myImpact: "నా పర్యావరణ ప్రభావం",
    xpPoints: "XP పాయింట్లు",
    treesPlanted: "చెట్లు నాటబడ్డాయి",
    co2Offset: "CO₂ తగ్గింపు",
    waterSaved: "నీరు ఆదా",
    progressToNext: "స్థాయి 8 కు పురోగతి",
    xpNeeded: "తదుపరి స్థాయికి XP అవసరం",
    activeProjects: "నా క్రియాశీల ప్రాజెక్టులు",
    joinMore: "మరిన్ని చేరండి",
    participants: "చేరారు",
    timeLeft: "మిగిలింది",
    reportIssue: "పర్యావరణ సమస్యను నివేదించండి",
    spottedIssue: "ఏదైనా పర్యావరణ సమస్యను గమనించారా?",
    reportDescription: "కాలుష్యం, చట్టవిరుద్ధ డంపింగ్, అటవీ నిర్మూలన, లేదా మీ ప్రాంతంలోని ఇతర పర్యావరణ ఆందోళనలను నివేదించడం ద్వారా మన పర్యావరణాన్ని రక్షించడంలో సహాయపడండి।",
    reportButton: "సమస్యను నివేదించండి (+10 XP)",
    photoEvidence: "ఫోటో సాక్ష్యం",
    gpsLocation: "GPS స్థానం",
    leaderboard: "కమ్యూనిటీ లీడర్‌బోర్డ్",
    viewFullLeaderboard: "పూర్తి లీడర్‌బోర్డ్ చూడండి",
    educationHub: "పర్యావరణ విద్యా కేంద్రం",
    environmentalJourney: "నా పర్యావరణ ప్రయాణం",
    today: "ఈరోజు",
    daysAgo: "రోజుల క్రితం",
    weekAgo: "వారం క్రితం",
    weeksAgo: "వారాల క్రితం",
    monthAgo: "నెల క్రితం",
    dashboard: "డాష్‌బోర్డ్",
    myActiveProjects: "నా క్రియాశీల ప్రాజెక్టులు",
    communityLeaderboard: "కమ్యూనిటీ లీడర్‌బోర్డ్",
    environmentEducationHub: "పర్యావరణ విద్యా కేంద్రం",
    myEnvironmentalJourney: "నా పర్యావరణ ప్రయాణం",
    educationalVideos: "విద్యా వీడియోలు",
    environmentalQuiz: "పర్యావరణ క్విజ్",
    welcomeBack: "తిరిగి స్వాగతం",
    loadingDashboard: "డాష్‌బోర్డ్ లోడ్ అవుతోంది...",
    dontForgetCheckout: "చెక్ అవుట్ చేయడం మర్చిపోవద్దు!",
    activeProjectsCheckedIn: "మీకు {count} క్రియాశీల ప్రాజెక్టులు{plural} చెక్ ఇన్ చేసారు।",
    rememberCheckout: "మీ సహకార గంటలను ట్రాక్ చేయడానికి పూర్తయిన తర్వాత చెక్ అవుట్ చేయాలని గుర్తుంచుకోండి।",
    checkOut: "చెక్ అవుట్",
    ecoWarrior: "పర్యావరణ యోధుడు",
    progressToLevel: "స్థాయి {level} కు పురోగతి",
    noIssuesReported: "మీరు ఇంకా ఎలాంటి పర్యావరణ సమస్యలను నివేదించలేదు।",
    useButtonToReport: "మీ మొదటి సమస్యను నివేదించడానికి పైన ఉన్న బటన్‌ను ఉపయోగించండి!",
    loading: "లోడ్ అవుతోంది",
    notifications: "నోటిఫికేషన్లు",
    profile: "ప్రొఫైల్",
    settings: "సెట్టింగ్‌లు",
    logout: "లాగ్ అవుట్",
    and: "మరియు",
    viewAll: "అన్నీ చూడండి",
    xpEarned: "XP సంపాదించబడింది",
    progressLabel: "పురోగతి"
  },

  mr: {
    welcome: "परत आल्याबद्दल स्वागत, {name}!",
    progress: "या महिन्यात तुम्ही आश्चर्यकारक प्रगती केली आहे. आमच्या ग्रहासाठी उत्कृष्ट कार्य चालू ठेवा!",
    level: "स्तर 7 पर्यावरण योद्धा",
    impactPoints: "प्रभाव गुण",
    myImpact: "माझा पर्यावरणीय प्रभाव",
    xpPoints: "XP गुण",
    treesPlanted: "झाडे लावली",
    co2Offset: "CO₂ कमी",
    waterSaved: "पाणी वाचवले",
    progressToNext: "स्तर 8 ची प्रगती",
    xpNeeded: "पुढील स्तरासाठी XP आवश्यक",
    activeProjects: "माझे सक्रिय प्रकल्प",
    joinMore: "अधिक सामील व्हा",
    participants: "सामील झाले",
    timeLeft: "शिल्लक",
    reportIssue: "पर्यावरणीय समस्येचा अहवाल द्या",
    spottedIssue: "काही पर्यावरणीय समस्या दिसली?",
    reportDescription: "प्रदूषण, बेकायदेशीर डंपिंग, जंगलतोड, किंवा तुमच्या भागातील इतर पर्यावरणीय चिंतांचा अहवाल देऊन आमच्या पर्यावरणाचे संरक्षण करण्यात मदत करा.",
    reportButton: "समस्येचा अहवाल द्या (+10 XP)",
    photoEvidence: "फोटो पुरावा",
    gpsLocation: "GPS स्थान",
    leaderboard: "समुदाय लीडरबोर्ड",
    viewFullLeaderboard: "संपूर्ण लीडरबोर्ड पहा",
    educationHub: "पर्यावरणीय शिक्षण केंद्र",
    environmentalJourney: "माझा पर्यावरणीय प्रवास",
    today: "आज",
    daysAgo: "दिवसांपूर्वी",
    weekAgo: "आठवड्यापूर्वी",
    weeksAgo: "आठवड्यांपूर्वी",
    monthAgo: "महिन्यापूर्वी",
    dashboard: "डॅशबोर्ड",
    myActiveProjects: "माझे सक्रिय प्रकल्प",
    communityLeaderboard: "समुदाय लीडरबोर्ड",
    environmentEducationHub: "पर्यावरण शिक्षण केंद्र",
    myEnvironmentalJourney: "माझा पर्यावरणीय प्रवास",
    educationalVideos: "शैक्षणिक व्हिडिओ",
    environmentalQuiz: "पर्यावरणीय प्रश्नमंजुषा",
    welcomeBack: "परत आल्याबद्दल स्वागत",
    loadingDashboard: "डॅशबोर्ड लोड होत आहे...",
    dontForgetCheckout: "चेकआउट करायला विसरू नका!",
    activeProjectsCheckedIn: "तुमचे {count} सक्रिय प्रकल्प{plural} चेक इन केले आहेत.",
    rememberCheckout: "तुमचे योगदान तास ट्रॅक करण्यासाठी पूर्ण झाल्यावर चेकआउट करायला लक्षात ठेवा.",
    checkOut: "चेकआउट",
    ecoWarrior: "पर्यावरण योद्धा",
    progressToLevel: "स्तर {level} ची प्रगती",
    noIssuesReported: "तुम्ही अजून कोणत्याही पर्यावरणीय समस्येचा अहवाल दिलेला नाही.",
    useButtonToReport: "तुमची पहिली समस्या नोंदवण्यासाठी वरचे बटण वापरा!",
    loading: "लोड होत आहे",
    notifications: "सूचना",
    profile: "प्रोफाइल",
    settings: "सेटिंग्ज",
    logout: "लॉगआउट",
    and: "आणि",
    viewAll: "सर्व पहा",
    xpEarned: "XP मिळवले",
    progressLabel: "प्रगती"
  }
}

// Helper function for dynamic translations
export const translateWithParams = (translations: TranslationKeys, key: keyof TranslationKeys, params: { [key: string]: any } = {}) => {
  let translation = translations[key] || key as string
  Object.keys(params).forEach(param => {
    translation = translation.replace(`{${param}}`, params[param])
  })
  return translation
}
