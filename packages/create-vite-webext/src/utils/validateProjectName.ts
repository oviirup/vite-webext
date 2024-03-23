import path from 'node:path';
import validateName from 'validate-npm-package-name';

export function validateProjectName(name: string) {
  const v = validateName(name);
  return {
    valid: v.validForNewPackages,
    error: [...(v.errors || []), ...(v.warnings || [])],
  };
}
