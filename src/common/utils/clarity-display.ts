import { Cl, ClarityAbiType, ClarityValue } from '@jannik-stacks/kit';

export function formatAbiType(type: ClarityAbiType): string {
  if (typeof type === 'string') return type.replace('128', '');
  if ('buffer' in type) return `(buff ${type.buffer.length})`;
  if ('string-ascii' in type) return `(string-ascii ${type['string-ascii'].length})`;
  if ('string-utf8' in type) return `(string-utf8 ${type['string-utf8'].length})`;
  if ('optional' in type) return `(optional ${formatAbiType(type.optional)})`;
  if ('response' in type)
    return `(response ${formatAbiType(type.response.ok)} ${formatAbiType(type.response.error)})`;
  if ('list' in type) return `(list ${type.list.length} ${formatAbiType(type.list.type)})`;
  return `(tuple ${type.tuple.map(entry => `(${entry.name} ${formatAbiType(entry.type)})`).join(' ')})`;
}

export function displayClarityValue(cv: ClarityValue): string {
  switch (cv.type) {
    case 'address':
    case 'contract':
      return cv.value;
    case 'ascii':
      return `"${cv.value}"`;
    case 'utf8':
      return `u"${cv.value}"`;
    case 'tuple':
      return `(tuple ${Object.entries(cv.value)
        .map(([key, value]) => `(${key} ${displayClarityValue(value)})`)
        .join(' ')})`;
    case 'list':
      return `(list ${cv.value.map(displayClarityValue).join(' ')})`;
    case 'some':
    case 'ok':
    case 'err':
      return `(${cv.type} ${displayClarityValue(cv.value)})`;
    default:
      return Cl.stringify(cv);
  }
}

export function prettyClarityValue(cv: ClarityValue, space = 2, depth = 0): string {
  const separator = space ? `\n${' '.repeat(space * (depth + 1))}` : ' ';
  const end = space ? `\n${' '.repeat(space * depth)}` : ' ';
  if (cv.type === 'tuple') {
    const entries = Object.entries(cv.value)
      .map(([key, value]) => `${key}: ${prettyClarityValue(value, space, depth + 1)}`)
      .sort();
    return entries.length ? `{${separator}${entries.join(`,${separator}`)}${end}}` : '{}';
  }
  if (cv.type === 'list')
    return cv.value.length
      ? `(list${separator}${cv.value.map(value => prettyClarityValue(value, space, depth + 1)).join(separator)}${space ? end : ''})`
      : '(list)';
  if (cv.type === 'some' || cv.type === 'ok' || cv.type === 'err')
    return `(${cv.type} ${prettyClarityValue(cv.value, space, depth)})`;
  return Cl.stringify(cv);
}

export function describeClarityType(cv: ClarityValue): string {
  switch (cv.type) {
    case 'true':
    case 'false':
      return 'bool';
    case 'address':
    case 'contract':
      return 'principal';
    case 'int':
    case 'uint':
      return cv.type;
    case 'buffer':
      return `(buff ${Math.ceil(cv.value.length / 2)})`;
    case 'ascii':
      return `(string-ascii ${cv.value.length})`;
    case 'utf8':
      return `(string-utf8 ${new TextEncoder().encode(cv.value).length})`;
    case 'none':
      return '(optional none)';
    case 'some':
      return `(optional ${describeClarityType(cv.value)})`;
    case 'ok':
      return `(response ${describeClarityType(cv.value)} UnknownType)`;
    case 'err':
      return `(response UnknownType ${describeClarityType(cv.value)})`;
    case 'list':
      return `(list ${cv.value.length} ${cv.value.length ? describeClarityType(cv.value[0]) : 'UnknownType'})`;
    case 'tuple':
      return `(tuple ${Object.entries(cv.value)
        .map(([key, value]) => `(${key} ${describeClarityType(value)})`)
        .join(' ')})`;
  }
}
