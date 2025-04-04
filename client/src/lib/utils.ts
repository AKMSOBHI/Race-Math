import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// دالة لتحويل الأرقام الإنجليزية إلى أرقام عربية
export function convertToArabicNumerals(num: number | string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  const strNum = num.toString();
  
  // التحقق من أن السلسلة تحتوي فقط على أرقام وعلامة العشرية
  return strNum.replace(/[0-9]/g, match => arabicNumerals[parseInt(match)]);
}

// دالة لتحويل الأرقام العربية إلى أرقام إنجليزية
export function convertToEnglishNumerals(str: string): string {
  const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  
  return str.split('').map(char => {
    const index = arabicNumerals.indexOf(char);
    return index !== -1 ? index.toString() : char;
  }).join('');
}
