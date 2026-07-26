// Mirrors crime_types.csv. occursAtStationLevel=false types (riots, anti-state)
// are intentionally excluded — they never appear on an original complaint.
export interface CrimeType {
  code: string;
  labelSi: string;
  labelEn: string;
  category: 'PERSON' | 'PROPERTY' | 'GOVERNMENT';
  isMajor: boolean;
}

export const CRIME_TYPES: CrimeType[] = [
  { code: 'ct01', labelSi: 'සාවද්‍ය පරිහරණය', labelEn: 'Misappropriation', category: 'PERSON', isMajor: true },
  { code: 'ct02', labelSi: 'පැහැරගැනීම', labelEn: 'Abduction / Kidnapping', category: 'PERSON', isMajor: true },
  { code: 'ct03', labelSi: 'ගිනි තැබීම හෝ පුපුරණ ද්‍රව්‍යවලින් හානි කිරීම', labelEn: 'Arson / explosive damage', category: 'PROPERTY', isMajor: false },
  { code: 'ct04', labelSi: 'රු. 50,000ක් හෝ ඊට වැඩි හානියක් සිදු කිරීම', labelEn: 'Damage over Rs. 50,000', category: 'PROPERTY', isMajor: false },
  { code: 'ct05', labelSi: 'ගෙවල් බිඳීම', labelEn: 'Housebreaking', category: 'PROPERTY', isMajor: false },
  { code: 'ct05_1', labelSi: 'ගෙවල් බිඳීම — රු. 100,000ක් හෝ ඊට වැඩි', labelEn: 'Housebreaking — Rs. 100,000+', category: 'PROPERTY', isMajor: false },
  { code: 'ct06', labelSi: 'බරපතල තුවාල සිදු කිරීම', labelEn: 'Grievous injury', category: 'PERSON', isMajor: false },
  { code: 'ct07', labelSi: 'අනතුරුදායක ආයුධවලින් තුවාල සිදු කිරීම', labelEn: 'Injury with dangerous weapons', category: 'PERSON', isMajor: false },
  { code: 'ct08', labelSi: 'මිනීමැරුම / ඝාතනය', labelEn: 'Homicide / Murder', category: 'PERSON', isMajor: true },
  { code: 'ct09', labelSi: 'මිනීමැරුමට තැත් කිරීම', labelEn: 'Attempted murder', category: 'PERSON', isMajor: false },
  { code: 'ct10', labelSi: 'ස්ත්‍රී දූෂණය (වයස 16ට වැඩි)', labelEn: 'Rape (over 16)', category: 'PERSON', isMajor: true },
  { code: 'ct11', labelSi: 'ව්‍යවස්ථාපිත දූෂණය (වයස 16ට අඩු)', labelEn: 'Statutory rape (under 16)', category: 'PERSON', isMajor: true },
  { code: 'ct13', labelSi: 'සොරකම', labelEn: 'Theft / Stealing', category: 'PROPERTY', isMajor: false },
  { code: 'ct13_1', labelSi: 'වාහන කොල්ලකෑම හා වාහන සොරකම', labelEn: 'Vehicle robbery/theft', category: 'PROPERTY', isMajor: true },
  { code: 'ct13_2', labelSi: 'බැංකු කොල්ලකෑම', labelEn: 'Bank robbery', category: 'PROPERTY', isMajor: true },
  { code: 'ct14', labelSi: 'අස්වාභාවික වැරදි / බරපතල ලිංගික අපයෝජන', labelEn: 'Unnatural offences / serious sexual abuse', category: 'PERSON', isMajor: true },
  { code: 'ct15', labelSi: 'බලහත්කාරයෙන් මුදල් හෝ දේපළ ලබාගැනීම', labelEn: 'Extortion', category: 'PROPERTY', isMajor: true },
  { code: 'ct16', labelSi: 'රු. 500,000ක් හෝ ඊට වැඩි වංචා', labelEn: 'Fraud over Rs. 500,000', category: 'PROPERTY', isMajor: false },
  { code: 'ct17', labelSi: 'රු. 50,000ක් හෝ ඊට වැඩි දේපළ සොරකම', labelEn: 'Property theft over Rs. 50,000', category: 'PROPERTY', isMajor: false },
  { code: 'ct18', labelSi: 'ව්‍යාජ මුදල් නෝට්ටු ළඟ තබාගැනීම', labelEn: 'Counterfeit currency', category: 'PROPERTY', isMajor: true },
  { code: 'ct20', labelSi: 'ළමයින්ට කුරිරු ලෙස සැලකීම', labelEn: 'Cruel treatment of children', category: 'PERSON', isMajor: false },
  { code: 'ct21', labelSi: 'ළමා ලිංගික අපයෝජනය', labelEn: 'Sexual exploitation of children', category: 'PERSON', isMajor: false },
  { code: 'ct22', labelSi: 'ගණිකා වෘත්තිය හා මිනිස් ජාවාරම', labelEn: 'Prostitution and trafficking', category: 'PERSON', isMajor: false },
  { code: 'ct23', labelSi: 'ගිනි අවි ආඥාපනත යටතේ වැරදි', labelEn: 'Firearms Ordinance offences', category: 'PROPERTY', isMajor: true },
  { code: 'ct24', labelSi: 'ස්වයංක්‍රීය ගිනි අවි ළඟ තබාගැනීම', labelEn: 'Automatic firearms possession', category: 'PROPERTY', isMajor: true },
  { code: 'ct25', labelSi: 'අන්තරායකර මත්ද්‍රව්‍ය', labelEn: 'Dangerous drugs', category: 'PROPERTY', isMajor: true },
  { code: 'ct26', labelSi: 'පොලිස් නිලධාරීන්ට බාධා කිරීම', labelEn: 'Obstructing police officers', category: 'PERSON', isMajor: true },
];

export const VULNERABLE_CODES = new Set(['ct10', 'ct11', 'ct14', 'ct20', 'ct21', 'ct22']);