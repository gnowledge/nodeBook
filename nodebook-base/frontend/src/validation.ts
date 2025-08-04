// src/validation.ts

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export function validateAttribute(dataType: string, value: string): ValidationResult {
    if (value === null || value.trim() === '') {
        return { isValid: false, message: 'Value cannot be empty.' };
    }

    switch (dataType) {
        case 'float':
            if (isNaN(parseFloat(value)) || !isFinite(Number(value))) {
                return { isValid: false, message: `Value "${value}" is not a valid float.` };
            }
            break;
        
        case 'number':
        case 'integer':
            if (isNaN(parseInt(value, 10)) || !/^-?\d+$/.test(value)) {
                return { isValid: false, message: `Value "${value}" is not a valid integer.` };
            }
            break;

        case 'date':
            if (isNaN(Date.parse(value))) {
                return { isValid: false, message: `Value "${value}" is not a valid date.` };
            }
            break;

        case 'string':
        default:
            break;
    }

    return { isValid: true };
}
