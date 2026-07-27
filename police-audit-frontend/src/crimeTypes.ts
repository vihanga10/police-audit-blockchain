// Mirrors crime_types.csv. occursAtStationLevel=false types (riots, anti-state)
// are intentionally excluded — they never appear on an original complaint.
export interface CrimeType {
  code: string;
  labelSi: string;
  labelEn: string;
  category: 'Offences Against the Person' | 'Property Related Offences' | 'Government offences';
  isMajor: boolean;
}

export const CRIME_TYPES: CrimeType[] = [
  { code: 'ct01', labelSi: 'අපහරණය', labelEn: 'Misappropriation', category: 'Offences Against the Person', isMajor: true },
  { code: 'ct02', labelSi: 'පැහැරගෙන යාම', labelEn: 'Abduction / Kidnapping', category: 'Offences Against the Person', isMajor: true },
  { code: 'ct03', labelSi: 'ගිනි තැබීම හෝ පුපුරණ ද්‍රව්‍ය වලින් අනර්ථය සිදුකිරීම.', labelEn: 'Arson or causing damage using explosives', category: 'Property Related Offences', isMajor: false },
  { code: 'ct04', labelSi: 'රු. 50,000ක් හෝ ඊට වැඩි වටිනාකමක් සහිත අලාභ ඇතිවෙන පරිදි සිදු කරන අනර්ථය', labelEn: 'Causing damage resulting in a loss valued at Rs. 50,000 or more', category: 'Property Related Offences', isMajor: false },
  { code: 'ct05', labelSi: 'ගෙවල් බිඳීම', labelEn: 'Housebreaking', category: 'Property Related Offences', isMajor: false },
  { code: 'ct05_1', labelSi: 'ගෙවල් බිඳීම — රු. 100,000ක් හෝ ඊට වැඩි', labelEn: 'Housebreaking — Rs. 100,000+', category: 'Property Related Offences', isMajor: false },
  { code: 'ct06', labelSi: 'බරපතල තුවාල සිදු කිරීම', labelEn: 'Grievous injury', category: 'Offences Against the Person', isMajor: false },
  { code: 'ct07', labelSi: ' අනතුරුදායක ආයුධවලින් (පිහි ආදියෙන්) තුවාල කිරීම. ', labelEn: 'Causing injury with dangerous weapons (knives, etc.)', category: 'Offences Against the Person', isMajor: false },
  { code: 'ct08', labelSi: 'මනුෂ්‍ය ඝාතනය', labelEn: 'Homicide / Murder', category: 'Offences Against the Person', isMajor: true },
  { code: 'ct09', labelSi: 'මිනීමැරීමට තැත් කිරීම සහ සියදිවි නසා ගැනීමට අනුබල දීම', labelEn: 'Attempted murder and abetment of suicide', category: 'Offences Against the Person', isMajor: false },
  { code: 'ct10', labelSi: 'ස්ත්‍රී දූෂණය (වයස අවුරුදු 16ට වැඩි)', labelEn: 'Rape (Victim over 16 years of age)', category: 'Offences Against the Person', isMajor: true },
  { code: 'ct11', labelSi: 'ව්‍යවස්ථාපිත ස්ත්‍රී දූෂණය (වයස අවුරුදු 16ට අඩු) (i) වින්දිතයාගේ කැමැත්ත ඇතිව (ii) වින්දිතයාගේ කැමැත්ත නොමැතිව)', labelEn: 'Statutory rape (Under 16 years of age) (i) With the consent of the victim (ii) Without the consent of the victim)', category: 'Offences Against the Person', isMajor: true },
  { code: 'ct13', labelSi: 'සොරකම', labelEn: 'Theft / Stealing', category: 'Property Related Offences', isMajor: false },
  { code: 'ct13_1', labelSi: 'වාහන කොල්ලකෑම හා වාහන සොරකම', labelEn: 'Vehicle robbery/theft', category: 'Property Related Offences', isMajor: true },
  { code: 'ct13_2', labelSi: 'බැංකු කොල්ලකෑම', labelEn: 'Bank robbery', category: 'Property Related Offences', isMajor: true },
  { code: 'ct14', labelSi: 'අස්වාභාවික වැරදි සහ බරපතල ලිංගික අපයෝජන', labelEn: 'Unnatural offences and serious sexual abuse', category: 'Offences Against the Person', isMajor: true },
  { code: 'ct15', labelSi: 'බලෙන් ලබාගැනීම ( මුදල් , යම් දේපලක් හෝ ඇපයක් වටිනා ඇපයකට හැර විය හැකි අත්සන් තැබූ යමක්.)', labelEn: 'Forcible acquisition of money, property or a signed document convertible into a valuable security', category: 'Property Related Offences', isMajor: true },
  { code: 'ct16', labelSi: 'රු. 500,000ක් හෝ ඊට වැඩි වටිනාකමකින් යුත් සාවද්‍ය පරිහරණය, සාපරාදී විශ්වාසය, විශ්වාසය කඩ කිරීම සහ වංචා කිරීම', labelEn: 'Misappropriation, criminal breach of trust and fraud involving a value of Rs. 500,000 or more', category: 'Property Related Offences', isMajor: false },
  { code: 'ct17', labelSi: 'රු. 50,000 හෝ ඊට වැඩි වටිනාකමක් ඇති (A) වගා නිෂ්පාදන සොරකම (B) දේපළ සොරකම (C) ගව සොරකම', labelEn: 'Theft of plantation produce valued at Rs. 50,000 or more, theft of property and cattle theft', category: 'Property Related Offences', isMajor: false },
  { code: 'ct18', labelSi: 'ව්‍යාජ මුදල් නෝට්ටු සන්තකයේ තබා ගැනීම සහ මුද්‍රණය', labelEn: 'Possession and printing of counterfeit currency notes', category: 'Property Related Offences', isMajor: true },
  { code: 'ct19', labelSi: 'රාජ්‍ය විරෝධී අන්දමින් සිදුකරන වැරදි', labelEn: 'Wrongdoing committed in an anti-state manner', category: 'Government offences', isMajor: true },
  { code: 'ct20', labelSi: 'ළමයින්ට කෲර ලෙස සැලකීම', labelEn: 'Cruel treatment of children', category: 'Offences Against the Person', isMajor: false },
  { code: 'ct21', labelSi: 'ළමයින්ගෙන් අයුතු ලිංගික ප්‍රයෝජන ගැනීම', labelEn: 'Sexual exploitation of children', category: 'Offences Against the Person', isMajor: false },
  { code: 'ct22', labelSi: 'ගණිකා වෘත්තිය සහ මිනිස් වෙළඳාම', labelEn: 'Prostitution and trafficking in persons', category: 'Offences Against the Person', isMajor: false },
  { code: 'ct23', labelSi: 'පීඩාකාරී ආයුධ ආඥා පනත යටතේ ගැනෙන වැරදි', labelEn: 'Offences under the oppressive Firearms Ordinance', category: 'Property Related Offences', isMajor: true },
  { code: 'ct24', labelSi: 'ස්වයංක්‍රීය හෝ රිපීටර්  තුවක්කු  ළඟ තබා ගැනීම. අර්ධ ස්වයංක්‍රීය  නොවන', labelEn: 'Possession of automatic or repeating firearms (non-semi-automatic)', category: 'Property Related Offences', isMajor: true },
  { code: 'ct25', labelSi: 'හෙරොයින්, කොකේන්, මොෆින්,  මෙතැම්ෆිටමින් නොහොත් අයිස් කිසියම් ප්‍රමාණයක් නිෂ්පාදනය කිරීම, වෙළඳාම් කිරීම, ආනයනය, අපනයනය කිරීම හෝ හෙරොයින් ග්‍රෑම් 5 ක් හෝ වැඩි මොෆින් ග්‍රෑම් 3 ක් හෝ ඊට වඩා වැඩි ග්‍රෑම් 500 ක් හෝ ඊට වඩා වැඩි අයිස් ග්‍රෑම් 10 ක් හෝ ඊට වඩා වැඩි ගංජා කිලෝග්‍රෑම් 1 ක් හෝ ඊට වැඩි ප්‍රමාණයක් හෝ ආන්තරායක මත්ද්‍රව්‍ය ළඟ තබා ගැනීම.', labelEn: 'The manufacturing, trading, exporting or importing of any quantity of heroin, cocaine, morphine or methamphetamine (ice) or the possession of 5 grams or more of heroin, 3 grams or more of morphine, 500 grams or more of cocaine, 10 grams or more of Ice, or 1 kilogram or more of cannabis or other dangerous drugs.', category: 'Property Related Offences', isMajor: true },
  { code: 'ct26', labelSi: 'පොලිස් නිලධාරීන්ගේ රාජකාරි ඉටුකිරීමට බාධා කිරීම', labelEn: 'Obstructing police officers in the discharge of their duties', category: 'Offences Against the Person', isMajor: true },
];

export const VULNERABLE_CODES = new Set(['ct10', 'ct11', 'ct14', 'ct20', 'ct21', 'ct22']);